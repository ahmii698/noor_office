<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    // Get all services
    public function index()
    {
        try {
            $services = Service::all();
            return response()->json($services);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ ADD THIS METHOD - Get single service
    public function show($id)
    {
        try {
            $service = Service::findOrFail($id);
            return response()->json($service);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Service not found'
            ], 404);
        }
    }

    // Create new service
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'price' => 'required|numeric|min:0',
                'category' => 'required|string|max:100',
                'icon' => 'nullable|string|max:50'
            ]);

            $service = Service::create([
                'name' => $request->name,
                'price' => $request->price,
                'category' => $request->category,
                'icon' => $request->icon ?? '🔧',
                'date_added' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully',
                'service' => $service
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update service
    public function update(Request $request, $id)
    {
        try {
            $service = Service::findOrFail($id);
            
            $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'price' => 'sometimes|required|numeric|min:0',
                'category' => 'sometimes|required|string|max:100',
                'icon' => 'nullable|string|max:50'
            ]);

            $service->update($request->only([
                'name', 
                'price', 
                'category', 
                'icon'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully',
                'service' => $service
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service: ' . $e->getMessage()
            ], 500);
        }
    }

    // Delete service
    public function destroy($id)
    {
        try {
            $service = Service::findOrFail($id);
            $service->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service: ' . $e->getMessage()
            ], 500);
        }
    }
}