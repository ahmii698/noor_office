<?php

namespace App\Http\Controllers;

use App\Models\CreditVendor;
use App\Models\CreditPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class CreditPaymentController extends Controller
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
     * Make a payment
     * POST /api/credit/payments
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vendor_id' => 'required|exists:credit_vendors,id',
            'amount' => 'required|numeric|min:1',
            'note' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            $vendor = DB::table('credit_vendors')->where('id', $request->vendor_id)->first();

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found',
                ], 404);
            }

            if ($request->amount > $vendor->balance_amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment amount cannot exceed balance amount',
                ], 422);
            }

            $createdBy = $this->getCreatedBy();

            // ✅ Create payment
            DB::table('credit_payments')->insert([
                'vendor_id' => $vendor->id,
                'amount' => $request->amount,
                'payment_date' => now(),
                'note' => $request->note ?? 'Payment made',
                'created_by' => $createdBy,
            ]);

            // ✅ Update vendor balance
            $newPaidAmount = $vendor->paid_amount + $request->amount;
            $newBalanceAmount = $vendor->total_amount - $newPaidAmount;

            DB::table('credit_vendors')
                ->where('id', $vendor->id)
                ->update([
                    'paid_amount' => $newPaidAmount,
                    'balance_amount' => $newBalanceAmount,
                    'updated_at' => now(),
                ]);

            DB::commit();

            // ✅ Get updated vendor
            $updatedVendor = DB::table('credit_vendors')->where('id', $vendor->id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully',
                'data' => [
                    'vendor' => [
                        'id' => $updatedVendor->id,
                        'name' => $updatedVendor->vendor_name,
                        'paidAmount' => (float) $updatedVendor->paid_amount,
                        'balanceAmount' => (float) $updatedVendor->balance_amount,
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error recording payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to record payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get payments for a vendor
     * GET /api/credit/payments/vendor/{vendorId}
     */
    public function getVendorPayments($vendorId)
    {
        try {
            $vendor = DB::table('credit_vendors')->where('id', $vendorId)->first();

            if (!$vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendor not found',
                ], 404);
            }

            $payments = DB::table('credit_payments')
                ->where('vendor_id', $vendorId)
                ->orderBy('payment_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'vendor' => [
                        'id' => $vendor->id,
                        'name' => $vendor->vendor_name,
                        'totalAmount' => (float) $vendor->total_amount,
                        'paidAmount' => (float) $vendor->paid_amount,
                        'balanceAmount' => (float) $vendor->balance_amount,
                    ],
                    'payments' => $payments->map(function ($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'date' => $payment->payment_date,
                            'note' => $payment->note,
                            'createdBy' => $payment->created_by,
                        ];
                    }),
                    'totalPayments' => $payments->count(),
                    'totalAmountPaid' => (float) $payments->sum('amount'),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching vendor payments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all payments with filters
     * GET /api/credit/payments
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('credit_payments');

            // Filter by vendor
            if ($request->has('vendor_id') && !empty($request->vendor_id)) {
                $query->where('vendor_id', $request->vendor_id);
            }

            // Filter by date range
            if ($request->has('from_date') && !empty($request->from_date)) {
                $query->whereDate('payment_date', '>=', $request->from_date);
            }
            if ($request->has('to_date') && !empty($request->to_date)) {
                $query->whereDate('payment_date', '<=', $request->to_date);
            }

            // Filter current month
            if ($request->has('current_month') && $request->current_month) {
                $query->whereMonth('payment_date', now()->month)
                      ->whereYear('payment_date', now()->year);
            }

            // Filter today
            if ($request->has('today') && $request->today) {
                $query->whereDate('payment_date', now()->toDateString());
            }

            $payments = $query->orderBy('payment_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $payments,
                'totalCount' => $payments->count(),
                'totalAmount' => (float) $payments->sum('amount'),
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching payments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete payment (revert vendor balance)
     * DELETE /api/credit/payments/{id}
     */
    public function destroy($id)
    {
        try {
            $payment = DB::table('credit_payments')->where('id', $id)->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found',
                ], 404);
            }

            DB::beginTransaction();

            $vendor = DB::table('credit_vendors')->where('id', $payment->vendor_id)->first();

            if ($vendor) {
                $newPaidAmount = $vendor->paid_amount - $payment->amount;
                $newBalanceAmount = $vendor->total_amount - $newPaidAmount;

                DB::table('credit_vendors')
                    ->where('id', $vendor->id)
                    ->update([
                        'paid_amount' => $newPaidAmount,
                        'balance_amount' => $newBalanceAmount,
                        'updated_at' => now(),
                    ]);
            }

            DB::table('credit_payments')->where('id', $id)->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment deleted successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get payment statistics
     * GET /api/credit/payments/statistics
     */
    public function statistics(Request $request)
    {
        try {
            $query = DB::table('credit_payments');

            if ($request->has('vendor_id') && !empty($request->vendor_id)) {
                $query->where('vendor_id', $request->vendor_id);
            }

            $totalPayments = $query->count();
            $totalAmount = $query->sum('amount') ?? 0;
            
            $currentMonth = DB::table('credit_payments')
                ->whereMonth('payment_date', now()->month)
                ->whereYear('payment_date', now()->year)
                ->sum('amount') ?? 0;
            
            $currentWeek = DB::table('credit_payments')
                ->whereBetween('payment_date', [
                    now()->startOfWeek(),
                    now()->endOfWeek()
                ])->sum('amount') ?? 0;
            
            $today = DB::table('credit_payments')
                ->whereDate('payment_date', now()->toDateString())
                ->sum('amount') ?? 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'total_payments' => $totalPayments,
                    'total_amount' => (float) $totalAmount,
                    'current_month' => (float) $currentMonth,
                    'current_week' => (float) $currentWeek,
                    'today' => (float) $today,
                    'average_payment' => $totalPayments > 0 ? (float) ($totalAmount / $totalPayments) : 0,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics: ' . $e->getMessage(),
            ], 500);
        }
    }
}