<?php

namespace App\Http\Controllers;

use App\Models\Estimate;
use App\Models\EstimateItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class EstimateController extends Controller
{
    /**
     * Get all estimates
     * GET /api/estimates
     */
    public function index(Request $request)
    {
        try {
            $query = Estimate::with(['items', 'creator']);

            // Search
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('estimate_no', 'LIKE', "%{$search}%")
                      ->orWhere('company_name', 'LIKE', "%{$search}%")
                      ->orWhere('vehicle', 'LIKE', "%{$search}%")
                      ->orWhere('policy_number', 'LIKE', "%{$search}%")
                      ->orWhere('reg_no', 'LIKE', "%{$search}%")
                      ->orWhere('vin', 'LIKE', "%{$search}%")
                      ->orWhere('model', 'LIKE', "%{$search}%");
                });
            }

            // Filter by status
            if ($request->has('status')) {
                if ($request->status === 'active') {
                    $query->where('valid_until', '>=', now());
                } elseif ($request->status === 'expired') {
                    $query->where('valid_until', '<', now());
                }
            }

            // Filter by company
            if ($request->has('company') && !empty($request->company)) {
                $query->where('company_name', 'LIKE', "%{$request->company}%");
            }

            // Filter by vehicle
            if ($request->has('vehicle') && !empty($request->vehicle)) {
                $query->where('vehicle', 'LIKE', "%{$request->vehicle}%");
            }

            // Filter by date range
            if ($request->has('from_date') && $request->has('to_date')) {
                $query->whereBetween('date', [$request->from_date, $request->to_date]);
            }

            // Filter by single date
            if ($request->has('date') && !empty($request->date)) {
                $query->whereDate('date', $request->date);
            }

            // Sort
            $sortField = $request->sort_by ?? 'created_at';
            $sortDirection = $request->sort_direction ?? 'desc';
            $query->orderBy($sortField, $sortDirection);

            $estimates = $query->get();

            return response()->json([
                'success' => true,
                'data' => $estimates->map(function($estimate) {
                    return [
                        'id' => $estimate->id,
                        'estimate_no' => $estimate->estimate_no,
                        'company_name' => $estimate->company_name,
                        'vehicle' => $estimate->vehicle,
                        'policy_number' => $estimate->policy_number,
                        'color' => $estimate->color,
                        'make' => $estimate->make,
                        'vin' => $estimate->vin,
                        'model' => $estimate->model,
                        'engine_no' => $estimate->engine_no,
                        'reg_no' => $estimate->reg_no,
                        'address' => $estimate->address,
                        'date' => $estimate->date,
                        'valid_until' => $estimate->valid_until,
                        'total_amount' => $estimate->total_amount,
                        'formatted_total' => $estimate->formatted_total,
                        'notes' => $estimate->notes,
                        'status' => $estimate->status,
                        'is_active' => $estimate->is_active,
                        'is_expired' => $estimate->is_expired,
                        'days_until_expiry' => $estimate->days_until_expiry,
                        'items_count' => $estimate->items_count,
                        'total_items' => $estimate->total_items_count,
                        'items' => $estimate->items->map(function($item) {
                            return [
                                'id' => $item->id,
                                'name' => $item->name,
                                'quantity' => $item->quantity,
                                'price' => $item->price,
                                'total' => $item->total,
                                'formatted_price' => $item->formatted_price,
                                'formatted_total' => $item->formatted_total
                            ];
                        }),
                        'created_by' => $estimate->created_by,
                        'creator_name' => $estimate->creator?->name ?? 'System',
                        'created_at' => $estimate->created_at,
                        'updated_at' => $estimate->updated_at
                    ];
                }),
                'total' => $estimates->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching estimates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch estimates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single estimate
     * GET /api/estimates/{id}
     */
    public function show($id)
    {
        try {
            $estimate = Estimate::with(['items', 'creator'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $estimate->id,
                    'estimate_no' => $estimate->estimate_no,
                    'company_name' => $estimate->company_name,
                    'vehicle' => $estimate->vehicle,
                    'policy_number' => $estimate->policy_number,
                    'color' => $estimate->color,
                    'make' => $estimate->make,
                    'vin' => $estimate->vin,
                    'model' => $estimate->model,
                    'engine_no' => $estimate->engine_no,
                    'reg_no' => $estimate->reg_no,
                    'address' => $estimate->address,
                    'date' => $estimate->date,
                    'valid_until' => $estimate->valid_until,
                    'total_amount' => $estimate->total_amount,
                    'formatted_total' => $estimate->formatted_total,
                    'notes' => $estimate->notes,
                    'status' => $estimate->status,
                    'is_active' => $estimate->is_active,
                    'is_expired' => $estimate->is_expired,
                    'days_until_expiry' => $estimate->days_until_expiry,
                    'items_count' => $estimate->items_count,
                    'total_items' => $estimate->total_items_count,
                    'items' => $estimate->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->name,
                            'quantity' => $item->quantity,
                            'price' => $item->price,
                            'total' => $item->total,
                            'formatted_price' => $item->formatted_price,
                            'formatted_total' => $item->formatted_total
                        ];
                    }),
                    'created_by' => $estimate->created_by,
                    'creator_name' => $estimate->creator?->name ?? 'System',
                    'created_at' => $estimate->created_at,
                    'updated_at' => $estimate->updated_at
                ]
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Estimate not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching estimate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch estimate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get estimate by estimate number
     * GET /api/estimates/no/{estimateNo}
     */
    public function showByNumber($estimateNo)
    {
        try {
            $estimate = Estimate::with(['items', 'creator'])
                ->where('estimate_no', $estimateNo)
                ->firstOrFail();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $estimate->id,
                    'estimate_no' => $estimate->estimate_no,
                    'company_name' => $estimate->company_name,
                    'vehicle' => $estimate->vehicle,
                    'policy_number' => $estimate->policy_number,
                    'color' => $estimate->color,
                    'make' => $estimate->make,
                    'vin' => $estimate->vin,
                    'model' => $estimate->model,
                    'engine_no' => $estimate->engine_no,
                    'reg_no' => $estimate->reg_no,
                    'address' => $estimate->address,
                    'date' => $estimate->date,
                    'valid_until' => $estimate->valid_until,
                    'total_amount' => $estimate->total_amount,
                    'formatted_total' => $estimate->formatted_total,
                    'notes' => $estimate->notes,
                    'status' => $estimate->status,
                    'items' => $estimate->items->map(function($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->name,
                            'quantity' => $item->quantity,
                            'price' => $item->price,
                            'total' => $item->total
                        ];
                    }),
                    'created_by' => $estimate->created_by,
                    'creator_name' => $estimate->creator?->name ?? 'System',
                    'created_at' => $estimate->created_at,
                    'updated_at' => $estimate->updated_at
                ]
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Estimate not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching estimate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch estimate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new estimate
     * POST /api/estimates
     */
    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            $validated = $request->validate([
                'estimate_no' => 'nullable|string|max:50|unique:estimates,estimate_no',
                'company_name' => 'nullable|string|max:255',
                'vehicle' => 'nullable|string|max:255',
                'policy_number' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'make' => 'nullable|string|max:100',
                'vin' => 'nullable|string|max:50',
                'model' => 'nullable|string|max:100',
                'engine_no' => 'nullable|string|max:50',
                'reg_no' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'date' => 'required|date',
                'valid_until' => 'required|date|after_or_equal:date',
                'total_amount' => 'nullable|numeric|min:0',
                'notes' => 'nullable|string',
                'items' => 'required|array|min:1',
                'items.*.name' => 'required|string|max:255',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0'
            ]);

            // Generate estimate number if not provided
            if (empty($validated['estimate_no'])) {
                $validated['estimate_no'] = 'EST-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
            }

            // Calculate total from items if not provided
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += $item['quantity'] * $item['price'];
            }

            // Create estimate
            $estimate = Estimate::create([
                'estimate_no' => $validated['estimate_no'],
                'company_name' => $validated['company_name'] ?? null,
                'vehicle' => $validated['vehicle'] ?? null,
                'policy_number' => $validated['policy_number'] ?? null,
                'color' => $validated['color'] ?? null,
                'make' => $validated['make'] ?? null,
                'vin' => $validated['vin'] ?? null,
                'model' => $validated['model'] ?? null,
                'engine_no' => $validated['engine_no'] ?? null,
                'reg_no' => $validated['reg_no'] ?? null,
                'address' => $validated['address'] ?? null,
                'date' => $validated['date'],
                'valid_until' => $validated['valid_until'],
                'total_amount' => $totalAmount,
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id()
            ]);

            // Create items
            foreach ($validated['items'] as $item) {
                EstimateItem::create([
                    'estimate_id' => $estimate->id,
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price']
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Estimate created successfully',
                'data' => $estimate->load(['items', 'creator'])
            ], 201);

        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating estimate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create estimate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update estimate
     * PUT /api/estimates/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $estimate = Estimate::findOrFail($id);

            $validated = $request->validate([
                'estimate_no' => 'sometimes|string|max:50|unique:estimates,estimate_no,' . $id,
                'company_name' => 'nullable|string|max:255',
                'vehicle' => 'nullable|string|max:255',
                'policy_number' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'make' => 'nullable|string|max:100',
                'vin' => 'nullable|string|max:50',
                'model' => 'nullable|string|max:100',
                'engine_no' => 'nullable|string|max:50',
                'reg_no' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'date' => 'sometimes|date',
                'valid_until' => 'sometimes|date|after_or_equal:date',
                'total_amount' => 'sometimes|numeric|min:0',
                'notes' => 'nullable|string',
                'items' => 'sometimes|array|min:1',
                'items.*.name' => 'required|string|max:255',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0'
            ]);

            // Update estimate
            $estimate->update([
                'estimate_no' => $validated['estimate_no'] ?? $estimate->estimate_no,
                'company_name' => $validated['company_name'] ?? $estimate->company_name,
                'vehicle' => $validated['vehicle'] ?? $estimate->vehicle,
                'policy_number' => $validated['policy_number'] ?? $estimate->policy_number,
                'color' => $validated['color'] ?? $estimate->color,
                'make' => $validated['make'] ?? $estimate->make,
                'vin' => $validated['vin'] ?? $estimate->vin,
                'model' => $validated['model'] ?? $estimate->model,
                'engine_no' => $validated['engine_no'] ?? $estimate->engine_no,
                'reg_no' => $validated['reg_no'] ?? $estimate->reg_no,
                'address' => $validated['address'] ?? $estimate->address,
                'date' => $validated['date'] ?? $estimate->date,
                'valid_until' => $validated['valid_until'] ?? $estimate->valid_until,
                'notes' => $validated['notes'] ?? $estimate->notes,
                'updated_by' => auth()->id()
            ]);

            // Update items if provided
            if (isset($validated['items'])) {
                // Delete old items
                $estimate->items()->delete();

                // Create new items
                $totalAmount = 0;
                foreach ($validated['items'] as $item) {
                    $estimateItem = EstimateItem::create([
                        'estimate_id' => $estimate->id,
                        'name' => $item['name'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price']
                    ]);
                    $totalAmount += $estimateItem->total;
                }

                // Update total amount
                $estimate->update(['total_amount' => $totalAmount]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Estimate updated successfully',
                'data' => $estimate->load(['items', 'creator'])
            ]);

        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Estimate not found'
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating estimate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update estimate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete estimate
     * DELETE /api/estimates/{id}
     */
    public function destroy($id)
    {
        try {
            $estimate = Estimate::findOrFail($id);

            // Delete items first (cascade will handle)
            $estimate->delete();

            return response()->json([
                'success' => true,
                'message' => 'Estimate deleted successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Estimate not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting estimate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete estimate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get estimate statistics
     * GET /api/estimates/stats
     */
    public function stats()
    {
        try {
            $total = Estimate::count();
            $active = Estimate::active()->count();
            $expired = Estimate::expired()->count();
            $totalAmount = Estimate::sum('total_amount');
            $avgAmount = Estimate::avg('total_amount');
            $today = Estimate::whereDate('date', today())->count();
            $thisWeek = Estimate::whereBetween('date', [now()->startOfWeek(), now()->endOfWeek()])->count();
            $thisMonth = Estimate::whereBetween('date', [now()->startOfMonth(), now()->endOfMonth()])->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_estimates' => $total,
                    'active_estimates' => $active,
                    'expired_estimates' => $expired,
                    'total_amount' => round($totalAmount, 2),
                    'average_amount' => round($avgAmount, 2),
                    'today' => $today,
                    'this_week' => $thisWeek,
                    'this_month' => $thisMonth
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching estimate stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get estimates by date range
     * GET /api/estimates/date-range
     */
    public function getByDateRange(Request $request)
    {
        try {
            $request->validate([
                'from' => 'required|date',
                'to' => 'required|date|after_or_equal:from'
            ]);

            $estimates = Estimate::with(['items', 'creator'])
                ->whereBetween('date', [$request->from, $request->to])
                ->orderBy('date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estimates,
                'count' => $estimates->count(),
                'total_amount' => $estimates->sum('total_amount')
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error fetching estimates by date range: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch estimates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duplicate estimate
     * POST /api/estimates/{id}/duplicate
     */
    public function duplicate($id)
    {
        try {
            $estimate = Estimate::with('items')->findOrFail($id);

            $newEstimate = $estimate->duplicate();

            return response()->json([
                'success' => true,
                'message' => 'Estimate duplicated successfully',
                'data' => $newEstimate->load(['items', 'creator'])
            ], 201);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Estimate not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error duplicating estimate: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to duplicate estimate',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update estimate status
     * PATCH /api/estimates/{id}/status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $estimate = Estimate::findOrFail($id);

            $request->validate([
                'valid_until' => 'required|date|after_or_equal:today'
            ]);

            $estimate->update([
                'valid_until' => $request->valid_until,
                'updated_by' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Estimate status updated successfully',
                'data' => [
                    'id' => $estimate->id,
                    'estimate_no' => $estimate->estimate_no,
                    'valid_until' => $estimate->valid_until,
                    'status' => $estimate->status,
                    'is_active' => $estimate->is_active,
                    'days_until_expiry' => $estimate->days_until_expiry
                ]
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Estimate not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error updating estimate status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get estimates by company
     * GET /api/estimates/company/{company}
     */
    public function getByCompany($company)
    {
        try {
            $estimates = Estimate::with(['items', 'creator'])
                ->where('company_name', 'LIKE', "%{$company}%")
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estimates,
                'count' => $estimates->count(),
                'total_amount' => $estimates->sum('total_amount')
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching estimates by company: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch estimates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get estimates by vehicle
     * GET /api/estimates/vehicle/{vehicle}
     */
    public function getByVehicle($vehicle)
    {
        try {
            $estimates = Estimate::with(['items', 'creator'])
                ->where('vehicle', 'LIKE', "%{$vehicle}%")
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estimates,
                'count' => $estimates->count(),
                'total_amount' => $estimates->sum('total_amount')
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching estimates by vehicle: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch estimates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get today's estimates
     * GET /api/estimates/today
     */
    public function getToday()
    {
        try {
            $estimates = Estimate::with(['items', 'creator'])
                ->whereDate('date', today())
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estimates,
                'count' => $estimates->count(),
                'total_amount' => $estimates->sum('total_amount')
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching today estimates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch today estimates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search estimates
     * GET /api/estimates/search
     */
    public function search(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2'
            ]);

            $estimates = Estimate::with(['items', 'creator'])
                ->search($request->query)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $estimates,
                'count' => $estimates->count(),
                'query' => $request->query
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error searching estimates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to search estimates',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}