<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class CreditVendorController extends Controller
{
    /**
     * ✅ Helper function to get logged-in user name
     */
    private function getCreatedBy()
    {
        $createdBy = 'System';
        
        try {
            if (auth()->guard('sanctum')->check()) {
                $user = auth()->guard('sanctum')->user();
                $createdBy = $user->name ?? $user->email ?? 'Admin';
                return $createdBy;
            }
            
            if (auth()->guard('web')->check()) {
                $user = auth()->guard('web')->user();
                $createdBy = $user->name ?? $user->email ?? 'Admin';
                return $createdBy;
            }
            
            if (auth()->check()) {
                $user = auth()->user();
                $createdBy = $user->name ?? $user->email ?? 'Admin';
                return $createdBy;
            }
            
        } catch (\Exception $e) {
            Log::error('Auth check error: ' . $e->getMessage());
        }
        
        return $createdBy;
    }

    /**
     * Get all vendors with their payments and products
     * GET /api/credit/vendors
     */
    public function index(Request $request)
    {
        try {
            Log::info('CreditVendorController@index called');
            
            $vendors = DB::table('credit_vendors')->get();
            
            $vendorsWithPayments = $vendors->map(function($vendor) {
                $payments = DB::table('credit_payments')
                    ->where('vendor_id', $vendor->id)
                    ->get();
                
                $products = DB::table('credit_product_links')
                    ->join('products', 'credit_product_links.product_id', '=', 'products.id')
                    ->where('credit_product_links.vendor_id', $vendor->id)
                    ->select('products.*', 'credit_product_links.quantity as pivot_quantity', 'credit_product_links.purchase_price as pivot_purchase_price')
                    ->get();
                
                $vendor->payments = $payments;
                $vendor->productsList = $products;
                
                return $vendor;
            });

            return response()->json([
                'success' => true,
                'data' => $vendorsWithPayments,
                'totalVendors' => $vendorsWithPayments->count(),
                'totalBalance' => $vendorsWithPayments->sum('balance_amount') ?? 0,
                'statistics' => [
                    'total_amount' => $vendorsWithPayments->sum('total_amount') ?? 0,
                    'total_paid' => $vendorsWithPayments->sum('paid_amount') ?? 0,
                    'total_balance' => $vendorsWithPayments->sum('balance_amount') ?? 0,
                    'pending' => $vendorsWithPayments->where('paid_amount', 0)->where('balance_amount', '>', 0)->count(),
                    'partial' => $vendorsWithPayments->where('paid_amount', '>', 0)->where('balance_amount', '>', 0)->count(),
                    'fully_paid' => $vendorsWithPayments->where('balance_amount', '<=', 0)->count(),
                ],
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch vendors: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single vendor with details
     * GET /api/credit/vendors/{id}
     */
    public function show($id)
    {
        try {
            $vendor = DB::table('credit_vendors')->where('id', $id)->first();

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found',
                ], 404);
            }

            $payments = DB::table('credit_payments')->where('vendor_id', $id)->get();
            $products = DB::table('credit_product_links')
                ->join('products', 'credit_product_links.product_id', '=', 'products.id')
                ->where('credit_product_links.vendor_id', $id)
                ->select('products.*', 'credit_product_links.quantity as pivot_quantity', 'credit_product_links.purchase_price as pivot_purchase_price')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $vendor->id,
                    'name' => $vendor->vendor_name,
                    'products' => $vendor->products,
                    'invoiceNumber' => $vendor->invoice_number,
                    'totalAmount' => (float) $vendor->total_amount,
                    'paidAmount' => (float) $vendor->paid_amount,
                    'balanceAmount' => (float) $vendor->balance_amount,
                    'stockQuantity' => (int) $vendor->stock_quantity,
                    'createdBy' => $vendor->created_by,
                    'createdAt' => $vendor->created_at,
                    'payments' => $payments,
                    'productsList' => $products,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch vendor details: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new vendor with products
     * POST /api/credit/vendors
     */
    public function store(Request $request)
    {
        Log::info('CreditVendorController@store called');

        $validator = Validator::make($request->all(), [
            'vendor_name' => 'required|string|max:255',
            'products' => 'nullable|string',
            'invoice_number' => 'required|string|max:100|unique:credit_vendors,invoice_number',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'stock_quantity' => 'nullable|integer|min:0',
            'product_ids' => 'nullable|array',
            'product_ids.*.product_id' => 'required_with:product_ids|exists:products,id',
            'product_ids.*.product_name' => 'nullable|string',
            'product_ids.*.quantity' => 'required_with:product_ids|integer|min:1',
            'product_ids.*.purchase_price' => 'required_with:product_ids|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $paidAmount = $request->paid_amount ?? 0;
            $totalAmount = $request->total_amount;
            $balanceAmount = $totalAmount - $paidAmount;

            if ($paidAmount > $totalAmount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paid amount cannot exceed total amount',
                ], 422);
            }

            $productsString = $request->products;
            if (empty($productsString) && !empty($request->product_ids)) {
                $productNames = [];
                foreach ($request->product_ids as $item) {
                    if (!empty($item['product_name'])) {
                        $productNames[] = $item['product_name'];
                    } else {
                        $product = DB::table('products')->where('id', $item['product_id'])->first();
                        if ($product) {
                            $productNames[] = $product->name;
                        }
                    }
                }
                $productsString = implode(', ', $productNames);
            }

            $createdBy = $this->getCreatedBy();

            $vendorId = DB::table('credit_vendors')->insertGetId([
                'vendor_name' => $request->vendor_name,
                'products' => $productsString ?: $request->products ?? 'No products',
                'invoice_number' => $request->invoice_number,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'balance_amount' => $balanceAmount,
                'stock_quantity' => $request->stock_quantity ?? 0,
                'created_by' => $createdBy,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Vendor created:', ['vendor_id' => $vendorId]);

            // Link products and update stock
            if ($request->has('product_ids') && !empty($request->product_ids)) {
                foreach ($request->product_ids as $item) {
                    $product = DB::table('products')->where('id', $item['product_id'])->first();
                    
                    if ($product) {
                        $newQuantity = $product->quantity + $item['quantity'];
                        DB::table('products')
                            ->where('id', $item['product_id'])
                            ->update([
                                'quantity' => $newQuantity,
                                'vendor_id' => $vendorId,
                                'is_credit_purchase' => 1,
                                'updated_at' => now(),
                            ]);
                    } else {
                        $productId = DB::table('products')->insertGetId([
                            'name' => $item['product_name'] ?? 'Unknown Product',
                            'purchase_price' => $item['purchase_price'],
                            'selling_price' => $item['purchase_price'] * 1.3,
                            'quantity' => $item['quantity'],
                            'date_added' => now(),
                            'vendor_id' => $vendorId,
                            'is_credit_purchase' => 1,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    DB::table('credit_product_links')->insert([
                        'vendor_id' => $vendorId,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'purchase_price' => $item['purchase_price'],
                    ]);
                }
            }

            // Record initial payment
            if ($paidAmount > 0) {
                DB::table('credit_payments')->insert([
                    'vendor_id' => $vendorId,
                    'amount' => $paidAmount,
                    'payment_date' => now(),
                    'note' => 'Initial payment',
                    'created_by' => $createdBy,
                ]);
            }

            DB::commit();

            $vendor = DB::table('credit_vendors')->where('id', $vendorId)->first();

            return response()->json([
                'success' => true,
                'message' => 'Vendor added successfully!',
                'data' => $vendor,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error adding vendor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to add vendor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ FIXED: Update vendor with payment record
     * PUT /api/credit/vendors/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $vendor = DB::table('credit_vendors')->where('id', $id)->first();

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'vendor_name' => 'sometimes|required|string|max:255',
                'products' => 'sometimes|required|string',
                'invoice_number' => 'sometimes|required|string|max:100|unique:credit_vendors,invoice_number,' . $id,
                'total_amount' => 'sometimes|required|numeric|min:0',
                'paid_amount' => 'nullable|numeric|min:0',
                'stock_quantity' => 'nullable|integer|min:0',
                'new_payment' => 'nullable|numeric|min:0',
                'payment_note' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            $updateData = [];
            
            if ($request->has('vendor_name')) {
                $updateData['vendor_name'] = $request->vendor_name;
            }
            if ($request->has('products')) {
                $updateData['products'] = $request->products;
            }
            if ($request->has('invoice_number')) {
                $updateData['invoice_number'] = $request->invoice_number;
            }
            if ($request->has('stock_quantity')) {
                $updateData['stock_quantity'] = $request->stock_quantity;
            }
            if ($request->has('total_amount')) {
                $updateData['total_amount'] = $request->total_amount;
            }

            $newPayment = $request->input('new_payment', 0);
            $currentPaidAmount = $vendor->paid_amount;
            $totalAmount = $request->has('total_amount') ? $request->total_amount : $vendor->total_amount;

            if ($newPayment > 0) {
                $newPaidAmount = $currentPaidAmount + $newPayment;
                $newBalance = $totalAmount - $newPaidAmount;
                
                if ($newPaidAmount > $totalAmount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Paid amount cannot exceed total amount',
                    ], 422);
                }
                
                $updateData['paid_amount'] = $newPaidAmount;
                $updateData['balance_amount'] = $newBalance;
            } elseif ($request->has('paid_amount')) {
                $paidAmount = $request->paid_amount;
                $balanceAmount = $totalAmount - $paidAmount;
                
                if ($paidAmount > $totalAmount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Paid amount cannot exceed total amount',
                    ], 422);
                }
                
                $updateData['paid_amount'] = $paidAmount;
                $updateData['balance_amount'] = $balanceAmount;
            }

            $updateData['updated_at'] = now();

            DB::table('credit_vendors')->where('id', $id)->update($updateData);

            $createdBy = $this->getCreatedBy();

            // ✅ Create payment record if new payment was made
            if ($newPayment > 0) {
                $paymentNote = $request->input('payment_note', 'Payment via edit');
                DB::table('credit_payments')->insert([
                    'vendor_id' => $id,
                    'amount' => $newPayment,
                    'payment_date' => now(),
                    'note' => $paymentNote,
                    'created_by' => $createdBy,
                ]);
            }

            DB::commit();

            $updatedVendor = DB::table('credit_vendors')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'message' => $newPayment > 0 
                    ? "Vendor updated successfully! Payment of Rs. {$newPayment} recorded!" 
                    : 'Vendor updated successfully',
                'data' => $updatedVendor,
                'payment_recorded' => $newPayment > 0,
                'payment_amount' => $newPayment,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating vendor: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update vendor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete vendor
     * DELETE /api/credit/vendors/{id}
     */
    public function destroy($id)
    {
        try {
            $vendor = DB::table('credit_vendors')->where('id', $id)->first();

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found',
                ], 404);
            }

            DB::beginTransaction();

            $productLinks = DB::table('credit_product_links')->where('vendor_id', $id)->get();

            foreach ($productLinks as $link) {
                $product = DB::table('products')->where('id', $link->product_id)->first();
                if ($product) {
                    $newQuantity = max(0, $product->quantity - $link->quantity);
                    DB::table('products')
                        ->where('id', $link->product_id)
                        ->update([
                            'quantity' => $newQuantity,
                            'vendor_id' => null,
                            'is_credit_purchase' => 0,
                            'updated_at' => now(),
                        ]);
                }
            }

            DB::table('credit_product_links')->where('vendor_id', $id)->delete();
            DB::table('credit_payments')->where('vendor_id', $id)->delete();
            DB::table('credit_vendors')->where('id', $id)->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Vendor deleted successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete vendor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get vendor statistics
     * GET /api/credit/vendors/statistics
     */
    public function statistics()
    {
        try {
            $totalVendors = DB::table('credit_vendors')->count();
            $totalBalance = DB::table('credit_vendors')->sum('balance_amount') ?? 0;
            $totalPaid = DB::table('credit_vendors')->sum('paid_amount') ?? 0;
            $totalAmount = DB::table('credit_vendors')->sum('total_amount') ?? 0;
            
            $pending = DB::table('credit_vendors')
                ->where('paid_amount', 0)
                ->where('balance_amount', '>', 0)
                ->count();
                
            $fullyPaid = DB::table('credit_vendors')
                ->where('balance_amount', '<=', 0)
                ->count();
                
            $partial = DB::table('credit_vendors')
                ->where('paid_amount', '>', 0)
                ->where('balance_amount', '>', 0)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_vendors' => $totalVendors,
                    'total_amount' => (float) $totalAmount,
                    'total_paid' => (float) $totalPaid,
                    'total_balance' => (float) $totalBalance,
                    'pending_vendors' => $pending,
                    'fully_paid_vendors' => $fullyPaid,
                    'partial_vendors' => $partial,
                    'average_balance' => $totalVendors > 0 ? (float) ($totalBalance / $totalVendors) : 0,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get vendor summary
     * GET /api/credit/vendors/{id}/summary
     */
    public function summary($id)
    {
        try {
            $vendor = DB::table('credit_vendors')->where('id', $id)->first();

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found',
                ], 404);
            }

            $paymentsCount = DB::table('credit_payments')->where('vendor_id', $id)->count();
            $totalPaid = DB::table('credit_payments')->where('vendor_id', $id)->sum('amount') ?? 0;
            $lastPayment = DB::table('credit_payments')
                ->where('vendor_id', $id)
                ->orderBy('payment_date', 'desc')
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'vendor_id' => $vendor->id,
                    'vendor_name' => $vendor->vendor_name,
                    'invoice_number' => $vendor->invoice_number,
                    'total_amount' => (float) $vendor->total_amount,
                    'paid_amount' => (float) $vendor->paid_amount,
                    'balance_amount' => (float) $vendor->balance_amount,
                    'payment_percentage' => $vendor->total_amount > 0 ? round(($vendor->paid_amount / $vendor->total_amount) * 100, 2) : 0,
                    'payment_status' => $vendor->balance_amount <= 0 ? 'Paid' : ($vendor->paid_amount > 0 ? 'Partial' : 'Pending'),
                    'payments_count' => $paymentsCount,
                    'total_paid' => (float) $totalPaid,
                    'last_payment_date' => $lastPayment ? $lastPayment->payment_date : null,
                    'created_at' => $vendor->created_at,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch summary: ' . $e->getMessage(),
            ], 500);
        }
    }
}