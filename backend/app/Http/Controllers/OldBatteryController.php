<?php
// app/Http/Controllers/OldBatteryController.php

namespace App\Http\Controllers;

use App\Models\OldBattery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OldBatteryController extends Controller
{
    /**
     * GET /api/old-batteries?status=in_stock|sold|all
     * Default: in_stock (sale page ke liye)
     */
    public function index(Request $request)
    {
        try {
            $query = OldBattery::query();

            $status = $request->get('status', 'in_stock');
            if ($status !== 'all') {
                $query->where('status', $status);
            }

            if ($request->has('search') && !empty($request->search)) {
                $query->search($request->search);
            }

            if ($request->has('start_date') && $request->has('end_date')) {
                $query->dateBetween($request->start_date, $request->end_date);
            }

            $oldBatteries = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $oldBatteries,
                'count' => $oldBatteries->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch old batteries',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/old-batteries/stats
     */
    public function stats(Request $request)
    {
        try {
            $all = OldBattery::query();

            if ($request->has('start_date') && $request->has('end_date')) {
                $all->dateBetween($request->start_date, $request->end_date);
            }

            $records = $all->get();
            $inStock = $records->where('status', 'in_stock');
            $sold    = $records->where('status', 'sold');

            $stockValue    = $inStock->sum('trade_in_amount');
            $soldCost      = $sold->sum('trade_in_amount');
            $soldRevenue   = $sold->sum('selling_price');
            $totalProfit   = $sold->sum('profit');

            return response()->json([
                'success' => true,
                'data' => [
                    'total_count'      => $records->count(),
                    'in_stock_count'   => $inStock->count(),
                    'sold_count'       => $sold->count(),
                    'stock_value'      => round($stockValue, 2),
                    'sold_cost'        => round($soldCost, 2),
                    'sold_revenue'     => round($soldRevenue, 2),
                    'total_profit'     => round($totalProfit, 2),
                    'today_count'      => OldBattery::whereDate('purchase_date', today())->count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/old-batteries
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'battery_name' => 'required|string|max:255',
                'trade_in_amount' => 'required|numeric|min:0',
                'customer_name' => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'note' => 'nullable|string',
                'purchase_date' => 'nullable|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldBattery = OldBattery::create([
                'battery_name' => $request->battery_name,
                'trade_in_amount' => $request->trade_in_amount,
                'customer_name' => $request->customer_name ?? 'Walk-in',
                'customer_phone' => $request->customer_phone ?? null,
                'note' => $request->note ?? null,
                'status' => 'in_stock',
                'purchase_date' => $request->purchase_date ?? now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Old battery record saved successfully',
                'data' => $oldBattery
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save old battery record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/old-batteries/{id}
     */
    public function show($id)
    {
        try {
            $oldBattery = OldBattery::find($id);

            if (!$oldBattery) {
                return response()->json([
                    'success' => false,
                    'message' => 'Record not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $oldBattery
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/old-batteries/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $oldBattery = OldBattery::find($id);

            if (!$oldBattery) {
                return response()->json([
                    'success' => false,
                    'message' => 'Record not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'battery_name' => 'sometimes|required|string|max:255',
                'trade_in_amount' => 'sometimes|required|numeric|min:0',
                'selling_price' => 'nullable|numeric|min:0',
                'customer_name' => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'note' => 'nullable|string',
                'purchase_date' => 'nullable|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldBattery->update($request->only([
                'battery_name', 'trade_in_amount', 'selling_price',
                'customer_name', 'customer_phone', 'note', 'purchase_date'
            ]));

            // Sold record ho tou profit dobara calculate
            if ($oldBattery->status === 'sold' && $oldBattery->selling_price !== null) {
                $oldBattery->profit = $oldBattery->selling_price - $oldBattery->trade_in_amount;
                $oldBattery->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Record updated successfully',
                'data' => $oldBattery
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/old-batteries/{id}
     */
    public function destroy($id)
    {
        try {
            $oldBattery = OldBattery::find($id);

            if (!$oldBattery) {
                return response()->json([
                    'success' => false,
                    'message' => 'Record not found'
                ], 404);
            }

            $oldBattery->delete();

            return response()->json([
                'success' => true,
                'message' => 'Record deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/old-batteries/bulk-delete
     */
    public function bulkDelete(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'ids' => 'required|array',
                'ids.*' => 'exists:old_batteries,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $deleted = OldBattery::whereIn('id', $request->ids)->delete();

            return response()->json([
                'success' => true,
                'message' => "{$deleted} records deleted successfully"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/old-batteries/date-range
     */
    public function getByDateRange(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldBatteries = OldBattery::dateBetween($request->start_date, $request->end_date)
                                      ->orderBy('purchase_date', 'desc')
                                      ->get();

            return response()->json([
                'success' => true,
                'data' => $oldBatteries,
                'count' => $oldBatteries->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/old-batteries/{id}/sell
     * Body: selling_price (required), customer_name, customer_phone, note, invoice_no
     * Record delete nahi hota, 'sold' mark hota hai aur profit save hota hai.
     */
    public function sellOldBattery($id, Request $request)
    {
        try {
            $oldBattery = OldBattery::find($id);

            if (!$oldBattery) {
                return response()->json([
                    'success' => false,
                    'message' => 'Old battery record not found'
                ], 404);
            }

            if ($oldBattery->status === 'sold') {
                return response()->json([
                    'success' => false,
                    'message' => 'This battery is already sold'
                ], 409);
            }

            $validator = Validator::make($request->all(), [
                'selling_price' => 'required|numeric|min:0',
                'customer_name' => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'note' => 'nullable|string',
                'invoice_no' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $sellingPrice = (float) $request->selling_price;
            $purchasePrice = (float) $oldBattery->trade_in_amount;

            $oldBattery->update([
                'status' => 'sold',
                'selling_price' => $sellingPrice,
                'profit' => $sellingPrice - $purchasePrice,
                'sold_at' => now(),
                'sold_customer_name' => $request->customer_name ?: 'Walk-in',
                'sold_customer_phone' => $request->customer_phone,
                'sold_invoice_no' => $request->invoice_no,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Old battery sold successfully!',
                'data' => $oldBattery->fresh(),
                'purchase_price' => $purchasePrice,
                'selling_price' => $sellingPrice,
                'profit' => $sellingPrice - $purchasePrice,
                'sold_at' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sell old battery',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}