<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    public function index()
    {
        try {
            $invoices = Invoice::with('items')->orderBy('id', 'desc')->get();
            
            // Transform data to match frontend expected format
            $transformedInvoices = $invoices->map(function($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'invoice_date' => $invoice->invoice_date,
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'remaining_amount' => $invoice->remaining_amount,
                    'payment_method' => $invoice->payment_method,
                    'status' => $invoice->status,
                    'customer_name' => $invoice->customer_name,
                    'customer_phone' => $invoice->customer_phone,
                    'customer_car_number' => $invoice->customer_car_number,
                    'customer_car_model' => $invoice->customer_car_model,
                    'items' => $invoice->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'service_id' => $item->service_id,
                            'service_name' => $item->service_name,
                            'service_category' => $item->service_category,
                            'quantity' => $item->quantity,
                            'price' => $item->price,
                            'total' => $item->total
                        ];
                    })
                ];
            });
            
            return response()->json($transformedInvoices);
        } catch (\Exception $e) {
            Log::error('Error fetching invoices: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch invoices: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $invoice = Invoice::with('items')->findOrFail($id);
            
            $transformedInvoice = [
                'id' => $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'remaining_amount' => $invoice->remaining_amount,
                'payment_method' => $invoice->payment_method,
                'status' => $invoice->status,
                'customer_name' => $invoice->customer_name,
                'customer_phone' => $invoice->customer_phone,
                'customer_car_number' => $invoice->customer_car_number,
                'customer_car_model' => $invoice->customer_car_model,
                'items' => $invoice->items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'service_id' => $item->service_id,
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'total' => $item->total
                    ];
                })
            ];
            
            return response()->json($transformedInvoice);
        } catch (\Exception $e) {
            Log::error('Error fetching invoice: ' . $e->getMessage());
            return response()->json(['error' => 'Invoice not found'], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'customer' => 'required|array',
                'customer.name' => 'required|string|max:255',
                'customer.phone' => 'required|string|max:20',
                'customer.carNumber' => 'required|string|max:50',
                'customer.carModel' => 'nullable|string|max:100',
                'customer.date' => 'required|date',
                'items' => 'required|array|min:1',
                'items.*.id' => 'required|integer',
                'items.*.name' => 'required|string',
                'items.*.price' => 'required|numeric|min:0',
                'items.*.quantity' => 'required|integer|min:1',
                'total' => 'required|numeric|min:0',
                'paidAmount' => 'required|numeric|min:0',
                'paymentMethod' => 'required|string|in:cash,card,bank,online'
            ]);

            // Create or get customer
            $customer = Customer::firstOrCreate(
                ['phone' => $request->customer['phone']],
                [
                    'name' => $request->customer['name'],
                    'car_number' => $request->customer['carNumber'],
                    'car_model' => $request->customer['carModel'] ?? null
                ]
            );

            // Update customer info
            $customer->update([
                'name' => $request->customer['name'],
                'car_number' => $request->customer['carNumber'],
                'car_model' => $request->customer['carModel'] ?? null
            ]);

            // Calculate remaining amount
            $remainingAmount = $request->total - $request->paidAmount;
            
            // Determine status
            if ($request->paidAmount >= $request->total) {
                $status = 'Paid';
            } elseif ($request->paidAmount > 0) {
                $status = 'Partial';
            } else {
                $status = 'Pending';
            }

            // Create invoice
            $invoice = Invoice::create([
                'invoice_no' => 'INV-' . time(),
                'customer_id' => $customer->id,
                'customer_name' => $request->customer['name'],
                'customer_phone' => $request->customer['phone'],
                'customer_car_number' => $request->customer['carNumber'],
                'customer_car_model' => $request->customer['carModel'] ?? null,
                'invoice_date' => $request->customer['date'],
                'total_amount' => $request->total,
                'paid_amount' => $request->paidAmount,
                'remaining_amount' => $remainingAmount,
                'payment_method' => $request->paymentMethod,
                'status' => $status
            ]);

            // Create invoice items - NO PRODUCT STOCK UPDATE HERE
            foreach ($request->items as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $item['id'],
                    'service_name' => $item['name'],
                    'service_category' => $item['category'] ?? 'Service',
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['price'] * $item['quantity']
                ]);

                // ❌ PRODUCT STOCK UPDATE REMOVED - BillingInvoice already handles this
                // Stock is updated by BillingInvoice component before calling this API
            }

            DB::commit();

            // Load the invoice with its items
            $invoice->load('items');
            
            $transformedInvoice = [
                'id' => $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'remaining_amount' => $invoice->remaining_amount,
                'payment_method' => $invoice->payment_method,
                'status' => $invoice->status,
                'customer_name' => $invoice->customer_name,
                'customer_phone' => $invoice->customer_phone,
                'customer_car_number' => $invoice->customer_car_number,
                'customer_car_model' => $invoice->customer_car_model,
                'items' => $invoice->items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'service_id' => $item->service_id,
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'total' => $item->total
                    ];
                })
            ];

            return response()->json($transformedInvoice, 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Invoice creation error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to create invoice: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $invoice = Invoice::findOrFail($id);
            
            // Restore product quantities before deleting
            foreach ($invoice->items as $item) {
                $product = Product::find($item->service_id);
                if ($product) {
                    $product->increment('quantity', $item->quantity);
                }
            }
            
            $invoice->delete();
            
            return response()->json([
                'message' => 'Invoice deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting invoice: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to delete invoice'
            ], 500);
        }
    }

    public function getCustomerHistory($phone)
    {
        try {
            $invoices = Invoice::where('customer_phone', $phone)
                ->orderBy('invoice_date', 'desc')
                ->with('items')
                ->get();
            
            $transformedInvoices = $invoices->map(function($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'invoice_date' => $invoice->invoice_date,
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'remaining_amount' => $invoice->remaining_amount,
                    'payment_method' => $invoice->payment_method,
                    'status' => $invoice->status,
                    'customer_name' => $invoice->customer_name,
                    'customer_phone' => $invoice->customer_phone,
                    'customer_car_number' => $invoice->customer_car_number,
                    'customer_car_model' => $invoice->customer_car_model,
                    'items' => $invoice->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'service_id' => $item->service_id,
                            'service_name' => $item->service_name,
                            'service_category' => $item->service_category,
                            'quantity' => $item->quantity,
                            'price' => $item->price,
                            'total' => $item->total
                        ];
                    })
                ];
            });
            
            return response()->json($transformedInvoices);
        } catch (\Exception $e) {
            Log::error('Error fetching customer history: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch customer history'
            ], 500);
        }
    }

    public function getStats()
    {
        try {
            $totalInvoices = Invoice::count();
            $totalRevenue = Invoice::sum('total_amount');
            $totalPaid = Invoice::sum('paid_amount');
            $totalRemaining = Invoice::sum('remaining_amount');
            
            $paidInvoices = Invoice::where('status', 'Paid')->count();
            $partialInvoices = Invoice::where('status', 'Partial')->count();
            $pendingInvoices = Invoice::where('status', 'Pending')->count();
            
            return response()->json([
                'total_invoices' => $totalInvoices,
                'total_revenue' => $totalRevenue,
                'total_paid' => $totalPaid,
                'total_remaining' => $totalRemaining,
                'paid_invoices' => $paidInvoices,
                'partial_invoices' => $partialInvoices,
                'pending_invoices' => $pendingInvoices
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching invoice stats: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch statistics'
            ], 500);
        }
    }
}