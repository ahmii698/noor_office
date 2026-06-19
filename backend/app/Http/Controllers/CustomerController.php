<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index()
    {
        return response()->json(Customer::all());
    }

    public function show($id)
    {
        $customer = Customer::findOrFail($id);
        return response()->json($customer);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'phone' => 'required|string|unique:customers',
            'car_number' => 'nullable|string',
            'car_model' => 'nullable|string',
            'birthday' => 'nullable|date'
        ]);

        $customer = Customer::create($validated);
        return response()->json($customer, 201);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'phone' => 'sometimes|string|unique:customers,phone,' . $id,
            'car_number' => 'nullable|string',
            'car_model' => 'nullable|string',
            'birthday' => 'nullable|date'
        ]);

        $customer->update($validated);
        return response()->json($customer);
    }

    public function updateBirthday(Request $request, $id)
    {
        $validated = $request->validate([
            'birthday' => 'nullable|date'
        ]);

        $customer = Customer::findOrFail($id);
        $customer->update(['birthday' => $validated['birthday']]);
        
        return response()->json([
            'success' => true,
            'message' => 'Birthday updated successfully!',
            'data' => $customer
        ]);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();
        return response()->json(['message' => 'Customer deleted successfully']);
    }
}