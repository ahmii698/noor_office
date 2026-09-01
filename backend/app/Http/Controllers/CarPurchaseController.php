<?php

namespace App\Http\Controllers;

use App\Models\CarPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CarPurchaseController extends Controller
{
    // GET /api/car-purchases
    public function index()
    {
        $purchases = CarPurchase::orderBy('created_at', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $purchases
        ]);
    }

    // POST /api/car-purchases
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'purchaseDate' => 'required|date',
            'customerName' => 'required|string|max:255',
            'phoneNo' => 'nullable|string|max:20',
            'sellingPrice' => 'nullable|numeric',
            'purchasePrice' => 'required|numeric',
            'make' => 'required|string|max:100',
            'model' => 'required|string|max:100',
            'vin' => 'nullable|string|max:100',
            'engineNo' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'regNo' => 'nullable|string|max:50',
            'running' => 'nullable|numeric',
            'dent' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $purchase = CarPurchase::create([
            'purchase_date' => $request->purchaseDate,
            'customer_name' => $request->customerName,
            'phone_no' => $request->phoneNo,
            'selling_price' => $request->sellingPrice ?? 0,
            'purchase_price' => $request->purchasePrice,
            'make' => $request->make,
            'model' => $request->model,
            'vin' => $request->vin,
            'engine_no' => $request->engineNo,
            'color' => $request->color,
            'reg_no' => $request->regNo,
            'running' => $request->running ?? 0,
            'dent' => $request->dent,
            'type' => 'purchase',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Car purchase saved successfully',
            'data' => $purchase
        ], 201);
    }

    // GET /api/car-purchases/{id}
    public function show($id)
    {
        $purchase = CarPurchase::find($id);
        if (!$purchase) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $purchase]);
    }

    // PUT /api/car-purchases/{id}
    public function update(Request $request, $id)
    {
        $purchase = CarPurchase::find($id);
        if (!$purchase) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        $purchase->update([
            'purchase_date' => $request->purchaseDate ?? $purchase->purchase_date,
            'customer_name' => $request->customerName ?? $purchase->customer_name,
            'phone_no' => $request->phoneNo ?? $purchase->phone_no,
            'selling_price' => $request->sellingPrice ?? $purchase->selling_price,
            'purchase_price' => $request->purchasePrice ?? $purchase->purchase_price,
            'make' => $request->make ?? $purchase->make,
            'model' => $request->model ?? $purchase->model,
            'vin' => $request->vin ?? $purchase->vin,
            'engine_no' => $request->engineNo ?? $purchase->engine_no,
            'color' => $request->color ?? $purchase->color,
            'reg_no' => $request->regNo ?? $purchase->reg_no,
            'running' => $request->running ?? $purchase->running,
            'dent' => $request->dent ?? $purchase->dent,
        ]);

        return response()->json(['success' => true, 'message' => 'Updated successfully', 'data' => $purchase]);
    }

    // DELETE /api/car-purchases/{id}
    public function destroy($id)
    {
        $purchase = CarPurchase::find($id);
        if (!$purchase) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        $purchase->delete();
        return response()->json(['success' => true, 'message' => 'Deleted successfully']);
    }
}