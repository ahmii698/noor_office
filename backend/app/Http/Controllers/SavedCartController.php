<?php

namespace App\Http\Controllers;

use App\Models\SavedCart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SavedCartController extends Controller
{
    /**
     * Save current cart to discard - ✅ FIXED: Always create new, never update existing
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'cart_items' => 'required|array',
            'cart_summary' => 'nullable|array',
            'customer_phone' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'customer_email' => 'nullable|string',
            'customer_car_number' => 'nullable|string',
            'customer_car_model' => 'nullable|string',
            'customer_birthday' => 'nullable|string',
        ]);

        $userId = Auth::id();
        $sessionId = session()->getId();

        Log::info('📝 Saving new cart - User:', ['user_id' => $userId, 'session_id' => $sessionId]);

        // ✅ ALWAYS CREATE NEW RECORD - NO EXISTING CHECK
        $savedCart = SavedCart::create([
            'user_id' => $userId,
            'session_id' => $sessionId,
            'customer_phone' => $validated['customer_phone'] ?? null,
            'customer_name' => $validated['customer_name'] ?? null,
            'customer_email' => $validated['customer_email'] ?? null,
            'customer_car_number' => $validated['customer_car_number'] ?? null,
            'customer_car_model' => $validated['customer_car_model'] ?? null,
            'customer_birthday' => $validated['customer_birthday'] ?? null,
            'cart_items' => $validated['cart_items'],
            'cart_summary' => $validated['cart_summary'] ?? null,
            'status' => 'pending',
            'discarded_at' => now()
        ]);

        Log::info('✅ New cart saved ID:', ['id' => $savedCart->id]);

        return response()->json([
            'success' => true,
            'message' => 'Bill discarded successfully',
            'data' => $savedCart
        ]);
    }

    /**
     * Get all discarded bills - ✅ Get ALL pending carts
     */
    public function index(Request $request)
    {
        Log::info('📦 Fetching all pending discarded bills');

        // ✅ Get ALL pending carts - NO user_id filter
        $carts = SavedCart::where('status', 'pending')
            ->orderBy('discarded_at', 'desc')
            ->get();

        Log::info('📊 Total pending carts found:', ['count' => $carts->count()]);

        return response()->json([
            'success' => true,
            'data' => $carts
        ]);
    }

    /**
     * Get single discarded bill
     */
    public function show($id)
    {
        $cart = SavedCart::where('id', $id)
            ->where('status', 'pending')
            ->first();

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $cart
        ]);
    }

    /**
     * Restore discarded bill
     */
    public function restore($id)
    {
        $cart = SavedCart::where('id', $id)
            ->where('status', 'pending')
            ->first();

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found'
            ], 404);
        }

        $cart->update([
            'status' => 'completed',
            'updated_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bill restored successfully',
            'data' => $cart
        ]);
    }

    /**
     * Delete discarded bill permanently
     */
    public function destroy($id)
    {
        $cart = SavedCart::where('id', $id)
            ->where('status', 'pending')
            ->first();

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found'
            ], 404);
        }

        $cart->delete();

        return response()->json([
            'success' => true,
            'message' => 'Discarded bill deleted'
        ]);
    }

    /**
     * Clear all discarded bills - Clear ALL pending
     */
    public function clearAll(Request $request)
    {
        $deleted = SavedCart::where('status', 'pending')->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted . ' discarded bill(s) cleared'
        ]);
    }

    /**
     * Get count of discarded bills - Count ALL pending
     */
    public function count()
    {
        $count = SavedCart::where('status', 'pending')->count();

        return response()->json([
            'success' => true,
            'count' => $count
        ]);
    }
}