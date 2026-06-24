<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomerController extends Controller
{
    public function index()
    {
        try {
            $customers = Customer::all();
            return response()->json($customers);
        } catch (\Exception $e) {
            Log::error('Error fetching customers: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch customers'
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $customer = Customer::findOrFail($id);
            return response()->json($customer);
        } catch (\Exception $e) {
            Log::error('Error fetching customer: ' . $e->getMessage());
            return response()->json([
                'error' => 'Customer not found'
            ], 404);
        }
    }

    // ✅ Get customer by phone number (for auto-fill)
    public function getByPhone($phone)
    {
        try {
            $customer = Customer::where('phone', $phone)->first();
            
            if ($customer) {
                return response()->json([
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'car_number' => $customer->car_number,
                    'car_model' => $customer->car_model,
                    'birthday' => $customer->birthday, // ✅ Birthday from customer table
                    'created_at' => $customer->created_at,
                    'updated_at' => $customer->updated_at
                ]);
            }
            
            return response()->json(null, 404);
        } catch (\Exception $e) {
            Log::error('Error fetching customer by phone: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch customer'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'phone' => 'required|string|max:20|unique:customers,phone',
                'email' => 'nullable|email|max:255',
                'car_number' => 'nullable|string|max:50',
                'car_model' => 'nullable|string|max:100',
                'birthday' => 'nullable|date'
            ]);

            $customer = Customer::create($validated);
            
            return response()->json([
                'success' => true,
                'message' => 'Customer created successfully',
                'data' => $customer
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating customer: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to create customer'
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $customer = Customer::findOrFail($id);
            
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|string|max:20|unique:customers,phone,' . $id,
                'email' => 'nullable|email|max:255',
                'car_number' => 'nullable|string|max:50',
                'car_model' => 'nullable|string|max:100',
                'birthday' => 'nullable|date'
            ]);

            $customer->update($validated);
            
            return response()->json([
                'success' => true,
                'message' => 'Customer updated successfully',
                'data' => $customer
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Customer not found'
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating customer: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to update customer'
            ], 500);
        }
    }

    public function updateBirthday(Request $request, $id)
    {
        try {
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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Customer not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error updating birthday: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to update birthday'
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $customer = Customer::findOrFail($id);
            $customer->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Customer not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error deleting customer: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to delete customer'
            ], 500);
        }
    }
}