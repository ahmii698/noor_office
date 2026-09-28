<?php

namespace App\Http\Controllers;

use App\Models\CarSell;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CarSellController extends Controller
{
    // GET /api/car-sells
    public function index()
    {
        $sells = CarSell::orderBy('created_at', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $sells
        ]);
    }

    // POST /api/car-sells
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'sellDate' => 'required|date',
            'customerName' => 'required|string|max:255',
            'phoneNo' => 'nullable|string|max:20',
            'purchasePrice' => 'nullable|numeric',
            'sellingPrice' => 'required|numeric',
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

        $purchasePrice = $request->purchasePrice ?? 0;
        $sellingPrice = $request->sellingPrice;
        $profit = $sellingPrice - $purchasePrice;

        $sell = CarSell::create([
            'sell_date' => $request->sellDate,
            'customer_name' => $request->customerName,
            'phone_no' => $request->phoneNo,
            'purchase_price' => $purchasePrice,
            'selling_price' => $sellingPrice,
            'profit' => $profit,
            'make' => $request->make,
            'model' => $request->model,
            'vin' => $request->vin,
            'engine_no' => $request->engineNo,
            'color' => $request->color,
            'reg_no' => $request->regNo,
            'running' => $request->running ?? 0,
            'dent' => $request->dent,
            'type' => 'sell',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Car sold and saved successfully',
            'data' => $sell
        ], 201);
    }

    // GET /api/car-sells/{id}
    public function show($id)
    {
        $sell = CarSell::find($id);
        if (!$sell) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $sell]);
    }

    // PUT /api/car-sells/{id}
    public function update(Request $request, $id)
    {
        $sell = CarSell::find($id);
        if (!$sell) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        $purchasePrice = $request->purchasePrice ?? $sell->purchase_price;
        $sellingPrice = $request->sellingPrice ?? $sell->selling_price;

        $sell->update([
            'sell_date' => $request->sellDate ?? $sell->sell_date,
            'customer_name' => $request->customerName ?? $sell->customer_name,
            'phone_no' => $request->phoneNo ?? $sell->phone_no,
            'purchase_price' => $purchasePrice,
            'selling_price' => $sellingPrice,
            'profit' => $sellingPrice - $purchasePrice,
            'make' => $request->make ?? $sell->make,
            'model' => $request->model ?? $sell->model,
            'vin' => $request->vin ?? $sell->vin,
            'engine_no' => $request->engineNo ?? $sell->engine_no,
            'color' => $request->color ?? $sell->color,
            'reg_no' => $request->regNo ?? $sell->reg_no,
            'running' => $request->running ?? $sell->running,
            'dent' => $request->dent ?? $sell->dent,
        ]);

        return response()->json(['success' => true, 'message' => 'Updated successfully', 'data' => $sell]);
    }

    // DELETE /api/car-sells/{id}
    public function destroy($id)
    {
        $sell = CarSell::find($id);
        if (!$sell) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        $sell->delete();
        return response()->json(['success' => true, 'message' => 'Deleted successfully']);
    }
}