<?php
// app/Http/Controllers/OldBatteryController.php

namespace App\Http\Controllers;

use App\Models\OldBattery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OldBatteryController extends Controller
{
    /**
     * ✅ Get all old batteries
     * GET /api/old-batteries
     */
    public function index(Request $request)
    {
        try {
            $query = OldBattery::query();

            // ✅ Search filter
            if ($request->has('search') && !empty($request->search)) {
                $query->search($request->search);
            }

            // ✅ Date range filter
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->dateBetween($request->start_date, $request->end_date);
            }

            // ✅ Order by latest first
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
     * ✅ Get statistics
     * GET /api/old-batteries/stats
     */
    public function stats(Request $request)
    {
        try {
            $query = OldBattery::query();

            // ✅ Date range filter for stats
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->dateBetween($request->start_date, $request->end_date);
            }

            $oldBatteries = $query->get();
            
            $total = $oldBatteries->sum('trade_in_amount');
            $count = $oldBatteries->count();
            $avg = $count > 0 ? $total / $count : 0;

            // ✅ Get today's count
            $todayCount = OldBattery::whereDate('purchase_date', today())->count();
            
            // ✅ Get this month's total
            $monthTotal = OldBattery::whereMonth('purchase_date', now()->month)
                                    ->whereYear('purchase_date', now()->year)
                                    ->sum('trade_in_amount');

            return response()->json([
                'success' => true,
                'data' => [
                    'total_amount' => round($total, 2),
                    'total_count' => $count,
                    'average_amount' => round($avg, 2),
                    'today_count' => $todayCount,
                    'month_total' => round($monthTotal, 2)
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
     * ✅ Store new old battery record
     * POST /api/old-batteries
     */
    public function store(Request $request)
    {
        try {
            // ✅ Validation
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

            // ✅ Create record
            $oldBattery = OldBattery::create([
                'battery_name' => $request->battery_name,
                'trade_in_amount' => $request->trade_in_amount,
                'customer_name' => $request->customer_name ?? 'Walk-in',
                'customer_phone' => $request->customer_phone ?? null,
                'note' => $request->note ?? null,
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
     * ✅ Get single old battery record
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
     * ✅ Update old battery record
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

            // ✅ Validation
            $validator = Validator::make($request->all(), [
                'battery_name' => 'sometimes|required|string|max:255',
                'trade_in_amount' => 'sometimes|required|numeric|min:0',
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

            // ✅ Update record
            $oldBattery->update($request->all());

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
     * ✅ Delete old battery record
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
     * ✅ Bulk delete old battery records
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
     * ✅ Get old batteries by date range
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
     * ✅ NEW: Sell an old battery (remove from old_batteries inventory)
     * POST /api/old-batteries/{id}/sell
     */
    public function sellOldBattery($id, Request $request)
    {
        try {
            // ✅ Find the old battery record
            $oldBattery = OldBattery::find($id);

            if (!$oldBattery) {
                return response()->json([
                    'success' => false,
                    'message' => 'Old battery record not found'
                ], 404);
            }

            // ✅ Validation for sell
            $validator = Validator::make($request->all(), [
                'customer_name' => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'note' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // ✅ Store the data before deleting
            $batteryData = [
                'id' => $oldBattery->id,
                'battery_name' => $oldBattery->battery_name,
                'trade_in_amount' => $oldBattery->trade_in_amount,
                'customer_name' => $oldBattery->customer_name,
                'customer_phone' => $oldBattery->customer_phone,
                'note' => $oldBattery->note,
                'purchase_date' => $oldBattery->purchase_date
            ];

            // ✅ Delete the old battery record (it's been sold)
            $oldBattery->delete();

            return response()->json([
                'success' => true,
                'message' => 'Old battery sold successfully!',
                'data' => $batteryData,
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