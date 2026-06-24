<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class InvoiceController extends Controller
{
    public function index()
    {
        try {
            $invoices = Invoice::with('items')->orderBy('id', 'desc')->get();
            
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
                    'customer_email' => $invoice->customer_email,
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
                'customer_email' => $invoice->customer_email,
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

            Log::info('Invoice store request received:', $request->all());

            $validated = $request->validate([
                'invoice_no' => 'required|string|max:50',
                'customer_name' => 'required|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'customer_email' => 'nullable|email|max:255',
                'customer_car_number' => 'nullable|string|max:50',
                'customer_car_model' => 'nullable|string|max:100',
                'customer_birthday' => 'nullable|date',
                'total_amount' => 'required|numeric|min:0',
                'paid_amount' => 'nullable|numeric|min:0',
                'remaining_amount' => 'nullable|numeric|min:0',
                'payment_method' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:20',
                'items' => 'required|array|min:1',
                'items.*.service_name' => 'required|string',
                'items.*.service_category' => 'nullable|string',
                'items.*.price' => 'required|numeric|min:0',
                'items.*.quantity' => 'required|integer|min:1'
            ]);

            // ✅ 1. SAVE OR UPDATE CUSTOMER
            $customer = null;
            if (!empty($validated['customer_phone'])) {
                $customer = Customer::where('phone', $validated['customer_phone'])->first();
                
                if (!$customer) {
                    $customer = Customer::create([
                        'name' => $validated['customer_name'],
                        'phone' => $validated['customer_phone'],
                        'email' => $validated['customer_email'] ?? null,
                        'car_number' => $validated['customer_car_number'] ?? null,
                        'car_model' => $validated['customer_car_model'] ?? null,
                        'birthday' => $validated['customer_birthday'] ?? null
                    ]);
                    Log::info('✅ New customer created: ID ' . $customer->id);
                } else {
                    $customer->update([
                        'name' => $validated['customer_name'] ?? $customer->name,
                        'email' => $validated['customer_email'] ?? $customer->email,
                        'car_number' => $validated['customer_car_number'] ?? $customer->car_number,
                        'car_model' => $validated['customer_car_model'] ?? $customer->car_model,
                        'birthday' => $validated['customer_birthday'] ?? $customer->birthday
                    ]);
                    Log::info('✅ Customer updated: ID ' . $customer->id);
                }
            }

            // Set default values
            $paidAmount = $validated['paid_amount'] ?? 0;
            $totalAmount = $validated['total_amount'];
            $remainingAmount = $validated['remaining_amount'] ?? ($totalAmount - $paidAmount);
            
            // Determine status
            if ($paidAmount >= $totalAmount) {
                $status = 'Paid';
            } elseif ($paidAmount > 0) {
                $status = 'Partial';
            } else {
                $status = 'Pending';
            }

            // ✅ 2. Create invoice with customer_id
            $invoiceId = DB::table('invoices')->insertGetId([
                'invoice_no' => $validated['invoice_no'],
                'customer_id' => $customer ? $customer->id : null,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
                'customer_car_number' => $validated['customer_car_number'] ?? null,
                'customer_car_model' => $validated['customer_car_model'] ?? null,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remainingAmount,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'status' => $status,
                'invoice_date' => Carbon::now(),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);

            Log::info('✅ Invoice created: ID ' . $invoiceId);

            // ✅ 3. Create invoice items
            foreach ($validated['items'] as $item) {
                DB::table('invoice_items')->insert([
                    'invoice_id' => $invoiceId,
                    'service_name' => $item['service_name'],
                    'service_category' => $item['service_category'] ?? 'Service',
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['price'] * $item['quantity'],
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
            }

            DB::commit();

            // Fetch the created invoice with items
            $invoice = DB::table('invoices')->where('id', $invoiceId)->first();
            $items = DB::table('invoice_items')->where('invoice_id', $invoiceId)->get();

            return response()->json([
                'success' => true,
                'id' => $invoiceId,
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'remaining_amount' => $invoice->remaining_amount,
                'payment_method' => $invoice->payment_method,
                'status' => $invoice->status,
                'customer_id' => $customer ? $customer->id : null,
                'customer_name' => $invoice->customer_name,
                'customer_phone' => $invoice->customer_phone,
                'customer_email' => $invoice->customer_email,
                'customer_car_number' => $invoice->customer_car_number,
                'customer_car_model' => $invoice->customer_car_model,
                'items' => $items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'total' => $item->total
                    ];
                })
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::error('❌ Validation error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Invoice creation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create invoice: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $invoice = Invoice::findOrFail($id);
            
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
                    'customer_email' => $invoice->customer_email,
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

    // ✅ ==================== PENDING PAYMENTS ====================

    // ✅ FIXED: Get all pending payments (status = 'Partial' or 'Pending')
    public function getPendingPayments()
    {
        try {
            // ✅ Get invoices with Partial or Pending status (not just remaining_amount > 0)
            $pendingInvoices = Invoice::whereIn('status', ['Partial', 'Pending'])
                ->with('items')
                ->orderBy('created_at', 'desc')
                ->get();

            // ✅ Debug log
            Log::info('Pending payments found: ' . $pendingInvoices->count());

            $transformed = $pendingInvoices->map(function($invoice) {
                // ✅ Ensure remaining_amount is properly set
                $remaining = (float) $invoice->remaining_amount;
                if ($remaining < 0) {
                    $remaining = 0;
                }
                
                return [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'customer_name' => $invoice->customer_name,
                    'customer_phone' => $invoice->customer_phone,
                    'customer_car_number' => $invoice->customer_car_number,
                    'customer_car_model' => $invoice->customer_car_model,
                    'total_amount' => (float) $invoice->total_amount,
                    'paid_amount' => (float) $invoice->paid_amount,
                    'remaining_amount' => $remaining,
                    'status' => $invoice->status,
                    'invoice_date' => $invoice->invoice_date,
                    'items' => $invoice->items->map(function($item) {
                        return [
                            'service_name' => $item->service_name,
                            'price' => (float) $item->price,
                            'quantity' => $item->quantity,
                            'total' => (float) $item->total
                        ];
                    })
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transformed
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching pending payments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending payments: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ Update pending payment (add payment)
    public function updatePendingPayment(Request $request, $id)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:0.01'
            ]);

            $invoice = Invoice::findOrFail($id);
            
            // Check if amount is not more than remaining
            if ($request->amount > $invoice->remaining_amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Amount cannot exceed remaining balance of Rs. ' . number_format($invoice->remaining_amount, 2)
                ], 400);
            }

            // Update paid and remaining amounts
            $newPaidAmount = $invoice->paid_amount + $request->amount;
            $newRemainingAmount = $invoice->remaining_amount - $request->amount;
            
            // Update status if fully paid
            if ($newRemainingAmount <= 0) {
                $status = 'Paid';
                $newRemainingAmount = 0;
            } else {
                $status = 'Partial';
            }

            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'remaining_amount' => $newRemainingAmount,
                'status' => $status,
                'updated_at' => Carbon::now()
            ]);

            Log::info('✅ Payment updated for invoice: ' . $invoice->invoice_no . ' | Amount: ' . $request->amount . ' | Remaining: ' . $newRemainingAmount);

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully!',
                'data' => [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'customer_name' => $invoice->customer_name,
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'remaining_amount' => $invoice->remaining_amount,
                    'status' => $invoice->status
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error updating pending payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment: ' . $e->getMessage()
            ], 500);
        }
    }
}