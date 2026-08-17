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
            $invoices = Invoice::with(['items', 'creator', 'customer'])->orderBy('id', 'desc')->get();
            
            $transformedInvoices = $invoices->map(function($invoice) {
                // ✅ Get birthday from customer relationship
                $birthday = $invoice->customer ? $invoice->customer->birthday : null;
                
                return [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'invoice_date' => $invoice->invoice_date,
                    'subtotal' => $invoice->subtotal ?? 0,
                    'discount' => $invoice->discount ?? 0,
                    'discount_note' => $invoice->discount_note,
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'remaining_amount' => $invoice->remaining_amount,
                    'payment_method' => $invoice->payment_method,
                    'paid_at' => $invoice->paid_at,
                    'status' => $invoice->status,
                    'customer_name' => $invoice->customer_name,
                    'customer_phone' => $invoice->customer_phone,
                    'customer_email' => $invoice->customer_email,
                    'customer_car_number' => $invoice->customer_car_number,
                    'customer_car_model' => $invoice->customer_car_model,
                    'customer_birthday' => $birthday,
                    'created_by' => $invoice->created_by,
                    'creator_name' => $invoice->creator ? $invoice->creator->name : 'System',
                    'creator_role' => $invoice->creator ? $invoice->creator->role : 'system',
                    'items' => $invoice->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'service_id' => $item->service_id,
                            'service_name' => $item->service_name,
                            'service_category' => $item->service_category,
                            'mileage' => $item->mileage,
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
            $invoice = Invoice::with(['items', 'creator', 'customer'])->findOrFail($id);
            
            // ✅ Get birthday from customer relationship
            $birthday = $invoice->customer ? $invoice->customer->birthday : null;
            
            $transformedInvoice = [
                'id' => $invoice->id,
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date,
                'subtotal' => $invoice->subtotal ?? 0,
                'discount' => $invoice->discount ?? 0,
                'discount_note' => $invoice->discount_note,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'remaining_amount' => $invoice->remaining_amount,
                'payment_method' => $invoice->payment_method,
                'paid_at' => $invoice->paid_at,
                'status' => $invoice->status,
                'customer_name' => $invoice->customer_name,
                'customer_phone' => $invoice->customer_phone,
                'customer_email' => $invoice->customer_email,
                'customer_car_number' => $invoice->customer_car_number,
                'customer_car_model' => $invoice->customer_car_model,
                'customer_birthday' => $birthday,
                'created_by' => $invoice->created_by,
                'creator_name' => $invoice->creator ? $invoice->creator->name : 'System',
                'creator_role' => $invoice->creator ? $invoice->creator->role : 'system',
                'items' => $invoice->items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'service_id' => $item->service_id,
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'mileage' => $item->mileage,
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
                'invoice_date' => 'nullable|date',
                'customer_name' => 'required|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'customer_email' => 'nullable|email|max:255',
                'customer_car_number' => 'nullable|string|max:50',
                'customer_car_model' => 'nullable|string|max:100',
                'subtotal' => 'required|numeric|min:0',
                'discount' => 'required|numeric|min:0',
                'discount_note' => 'nullable|string|max:255',
                'total_amount' => 'required|numeric|min:0',
                'paid_amount' => 'nullable|numeric|min:0',
                'remaining_amount' => 'nullable|numeric|min:0',
                'payment_method' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:20',
                'items' => 'required|array|min:1',
                'items.*.service_name' => 'required|string',
                'items.*.service_category' => 'nullable|string',
                'items.*.mileage' => 'nullable|integer|min:0',
                'items.*.price' => 'required|numeric|min:0',
                'items.*.quantity' => 'required|integer|min:1'
            ]);

            // Save or update customer
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
                    ]);
                    Log::info('✅ New customer created: ID ' . $customer->id);
                } else {
                    $customer->update([
                        'name' => $validated['customer_name'] ?? $customer->name,
                        'email' => $validated['customer_email'] ?? $customer->email,
                        'car_number' => $validated['customer_car_number'] ?? $customer->car_number,
                        'car_model' => $validated['customer_car_model'] ?? $customer->car_model,
                    ]);
                    Log::info('✅ Customer updated: ID ' . $customer->id);
                }
            }

            $paidAmount = $validated['paid_amount'] ?? 0;
            $totalAmount = $validated['total_amount'];
            $remainingAmount = $validated['remaining_amount'] ?? ($totalAmount - $paidAmount);
            
            if ($paidAmount >= $totalAmount) {
                $status = 'Paid';
            } elseif ($paidAmount > 0) {
                $status = 'Partial';
            } else {
                $status = 'Pending';
            }

            $invoiceDateTime = !empty($validated['invoice_date'])
                ? Carbon::parse($validated['invoice_date'])
                : Carbon::now();

            $invoiceId = DB::table('invoices')->insertGetId([
                'invoice_no' => $validated['invoice_no'],
                'customer_id' => $customer ? $customer->id : null,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
                'customer_car_number' => $validated['customer_car_number'] ?? null,
                'customer_car_model' => $validated['customer_car_model'] ?? null,
                'subtotal' => $validated['subtotal'],
                'discount' => $validated['discount'],
                'discount_note' => $validated['discount_note'] ?? null,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remainingAmount,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'status' => $status,
                'invoice_date' => $invoiceDateTime,
                'created_by' => auth()->id(),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);

            Log::info('✅ Invoice created: ID ' . $invoiceId . ' by user: ' . auth()->id());

            // ✅ FIX: agar invoice creation ke waqt hi koi advance/partial
            // payment li gayi ho (paidAmount > 0), tw usay bhi payment_histories
            // table mein log karo. $invoiceDateTime already Carbon object hai
            // (upar Carbon::parse / Carbon::now se bana), isliye MySQL datetime
            // format ka masla yahan nahi ata.
            if ($paidAmount > 0) {
                try {
                    DB::table('payment_histories')->insert([
                        'invoice_id' => $invoiceId,
                        'invoice_no' => $validated['invoice_no'],
                        'amount' => $paidAmount,
                        'payment_method' => $validated['payment_method'] ?? 'cash',
                        'paid_at' => $invoiceDateTime->format('Y-m-d H:i:s'),
                        'created_by' => auth()->id(),
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now()
                    ]);
                    Log::info('✅ Initial payment history saved for invoice: ' . $validated['invoice_no'] . ' | Amount: ' . $paidAmount);
                } catch (\Exception $e) {
                    Log::warning('Initial payment history save skipped: ' . $e->getMessage());
                }
            }

            foreach ($validated['items'] as $item) {
                DB::table('invoice_items')->insert([
                    'invoice_id' => $invoiceId,
                    'service_name' => $item['service_name'],
                    'service_category' => $item['service_category'] ?? 'Service',
                    'mileage' => $item['mileage'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['price'] * $item['quantity'],
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
            }

            DB::commit();

            $invoice = DB::table('invoices')->where('id', $invoiceId)->first();
            $items = DB::table('invoice_items')->where('invoice_id', $invoiceId)->get();

            return response()->json([
                'success' => true,
                'id' => $invoiceId,
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date,
                'subtotal' => $invoice->subtotal ?? 0,
                'discount' => $invoice->discount ?? 0,
                'discount_note' => $invoice->discount_note,
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
                'created_by' => $invoice->created_by,
                'items' => $items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'mileage' => $item->mileage,
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

    // ✅ ==================== UPDATE INVOICE ====================
    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            Log::info('Invoice update request received:', $request->all());

            $validated = $request->validate([
                'subtotal' => 'sometimes|numeric|min:0',
                'discount' => 'sometimes|numeric|min:0',
                'discount_note' => 'nullable|string|max:255',
                'total_amount' => 'sometimes|numeric|min:0',
                'paid_amount' => 'sometimes|numeric|min:0',
                'remaining_amount' => 'sometimes|numeric|min:0',
                'payment_method' => 'sometimes|string|max:50',
                'status' => 'sometimes|string|max:20'
            ]);

            $invoice = Invoice::findOrFail($id);

            // Update invoice
            $invoice->update([
                'subtotal' => $validated['subtotal'] ?? $invoice->subtotal,
                'discount' => $validated['discount'] ?? $invoice->discount,
                'discount_note' => $validated['discount_note'] ?? $invoice->discount_note,
                'total_amount' => $validated['total_amount'] ?? $invoice->total_amount,
                'paid_amount' => $validated['paid_amount'] ?? $invoice->paid_amount,
                'remaining_amount' => $validated['remaining_amount'] ?? $invoice->remaining_amount,
                'payment_method' => $validated['payment_method'] ?? $invoice->payment_method,
                'status' => $validated['status'] ?? $invoice->status,
                'updated_at' => Carbon::now()
            ]);

            DB::commit();

            Log::info('✅ Invoice updated: ID ' . $invoice->id);

            // Fetch updated invoice with items
            $updatedInvoice = Invoice::with('items')->find($id);

            return response()->json([
                'success' => true,
                'message' => 'Invoice updated successfully',
                'data' => [
                    'id' => $updatedInvoice->id,
                    'invoice_no' => $updatedInvoice->invoice_no,
                    'invoice_date' => $updatedInvoice->invoice_date,
                    'subtotal' => $updatedInvoice->subtotal ?? 0,
                    'discount' => $updatedInvoice->discount ?? 0,
                    'discount_note' => $updatedInvoice->discount_note,
                    'total_amount' => $updatedInvoice->total_amount,
                    'paid_amount' => $updatedInvoice->paid_amount,
                    'remaining_amount' => $updatedInvoice->remaining_amount,
                    'payment_method' => $updatedInvoice->payment_method,
                    'status' => $updatedInvoice->status,
                    'customer_name' => $updatedInvoice->customer_name,
                    'customer_phone' => $updatedInvoice->customer_phone,
                    'customer_car_number' => $updatedInvoice->customer_car_number,
                    'customer_car_model' => $updatedInvoice->customer_car_model,
                    'items' => $updatedInvoice->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'service_name' => $item->service_name,
                            'service_category' => $item->service_category,
                            'mileage' => $item->mileage,
                            'quantity' => $item->quantity,
                            'price' => $item->price,
                            'total' => $item->total
                        ];
                    })
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::error('❌ Validation error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Invoice update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update invoice: ' . $e->getMessage()
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
                ->with(['items', 'customer'])
                ->get();
            
            $transformedInvoices = $invoices->map(function($invoice) {
                // ✅ Get birthday from customer relationship
                $birthday = $invoice->customer ? $invoice->customer->birthday : null;
                
                return [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'invoice_date' => $invoice->invoice_date,
                    'subtotal' => $invoice->subtotal ?? 0,
                    'discount' => $invoice->discount ?? 0,
                    'discount_note' => $invoice->discount_note,
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'remaining_amount' => $invoice->remaining_amount,
                    'payment_method' => $invoice->payment_method,
                    'paid_at' => $invoice->paid_at,
                    'status' => $invoice->status,
                    'customer_name' => $invoice->customer_name,
                    'customer_phone' => $invoice->customer_phone,
                    'customer_email' => $invoice->customer_email,
                    'customer_car_number' => $invoice->customer_car_number,
                    'customer_car_model' => $invoice->customer_car_model,
                    'customer_birthday' => $birthday,
                    'items' => $invoice->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'service_id' => $item->service_id,
                            'service_name' => $item->service_name,
                            'service_category' => $item->service_category,
                            'mileage' => $item->mileage,
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

    public function getPendingPayments()
    {
        try {
            $pendingInvoices = Invoice::whereIn('status', ['Partial', 'Pending'])
                ->with(['items', 'customer'])
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Pending payments found: ' . $pendingInvoices->count());

            $transformed = $pendingInvoices->map(function($invoice) {
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
                    'subtotal' => $invoice->subtotal ?? 0,
                    'discount' => $invoice->discount ?? 0,
                    'discount_note' => $invoice->discount_note,
                    'total_amount' => (float) $invoice->total_amount,
                    'paid_amount' => (float) $invoice->paid_amount,
                    'remaining_amount' => $remaining,
                    'payment_method' => $invoice->payment_method,
                    'paid_at' => $invoice->paid_at,
                    'status' => $invoice->status,
                    'invoice_date' => $invoice->invoice_date,
                    'items' => $invoice->items->map(function($item) {
                        return [
                            'service_name' => $item->service_name,
                            'price' => (float) $item->price,
                            'quantity' => $item->quantity,
                            'total' => (float) $item->total,
                            'mileage' => $item->mileage
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

    // ✅ ==================== UPDATE PENDING PAYMENT - WITH PAYMENT HISTORY ====================
    public function updatePendingPayment(Request $request, $id)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'payment_method' => 'nullable|string|max:100',
                'paid_at' => 'nullable|date'
            ]);

            $invoice = Invoice::findOrFail($id);
            
            if ($request->amount > $invoice->remaining_amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Amount cannot exceed remaining balance of Rs. ' . number_format($invoice->remaining_amount, 2)
                ], 400);
            }

            $newPaidAmount = $invoice->paid_amount + $request->amount;
            $newRemainingAmount = $invoice->remaining_amount - $request->amount;
            
            if ($newRemainingAmount <= 0) {
                $status = 'Paid';
                $newRemainingAmount = 0;
            } else {
                $status = 'Partial';
            }

            $paymentMethod = $request->payment_method ?? $invoice->payment_method ?? 'Cash';

            // ✅ FIX: Frontend JS ka new Date().toISOString() format bhejta hai
            // jaise "2026-08-17T19:49:50.895Z" - MySQL datetime column ye
            // format directly accept nahi karta (raw string DB::table insert
            // mein bina cast ke jati hai), isliye Carbon::parse() se convert
            // karna zaroori hai. Ye fix na hone ki wajah se payment_histories
            // insert har baar silently fail ho raha tha (sirf invoice ka
            // paid_amount update hota tha, history row nahi banti thi).
            $paidAt = $request->paid_at ? Carbon::parse($request->paid_at) : Carbon::now();

            // ✅ UPDATE INVOICE
            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'remaining_amount' => $newRemainingAmount,
                'status' => $status,
                'payment_method' => $paymentMethod,
                'paid_at' => $paidAt,
                'updated_at' => Carbon::now()
            ]);

            // ✅ SAVE PAYMENT HISTORY
            try {
                DB::table('payment_histories')->insert([
                    'invoice_id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'amount' => $request->amount,
                    'payment_method' => $paymentMethod,
                    'paid_at' => $paidAt->format('Y-m-d H:i:s'),   // ✅ ab sahi MySQL format mein
                    'created_by' => auth()->id(),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
                Log::info('✅ Payment history saved for invoice: ' . $invoice->invoice_no . ' | Amount: ' . $request->amount);
            } catch (\Exception $e) {
                Log::warning('Payment history save skipped: ' . $e->getMessage());
            }

            Log::info('✅ Payment updated for invoice: ' . $invoice->invoice_no . 
                      ' | Amount: ' . $request->amount . 
                      ' | Payment Method: ' . $paymentMethod . 
                      ' | Paid At: ' . $paidAt .
                      ' | Remaining: ' . $newRemainingAmount);

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully via ' . $paymentMethod . '!',
                'data' => [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'customer_name' => $invoice->customer_name,
                    'subtotal' => $invoice->subtotal ?? 0,
                    'discount' => $invoice->discount ?? 0,
                    'discount_note' => $invoice->discount_note,
                    'total_amount' => $invoice->total_amount,
                    'paid_amount' => $invoice->paid_amount,
                    'remaining_amount' => $invoice->remaining_amount,
                    'payment_method' => $invoice->payment_method,
                    'paid_at' => $invoice->paid_at,
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

    // ✅ ==================== GET PAYMENT HISTORY ====================
    public function getPaymentHistory($invoiceNo)
    {
        try {
            $histories = DB::table('payment_histories')
                ->where('invoice_no', $invoiceNo)
                ->orderBy('paid_at', 'desc')
                ->get();

            Log::info('Payment history fetched for invoice: ' . $invoiceNo . ' | Count: ' . $histories->count());

            return response()->json([
                'success' => true,
                'data' => $histories
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payment history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment history: ' . $e->getMessage()
            ], 500);
        }
    }
}