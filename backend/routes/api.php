<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReminderController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ==================== PUBLIC ROUTES (No Authentication Required) ====================

// Authentication Routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Public Data Routes
Route::get('/services', [ServiceController::class, 'index']);

// Test Route (to check if API is working)
Route::get('/test', function() {
    return response()->json([
        'success' => true,
        'message' => 'API is working!',
        'timestamp' => now()->toDateTimeString()
    ]);
});

// ==================== PROTECTED ROUTES (Authentication Required) ====================

Route::middleware(['auth:sanctum'])->group(function () {
    
    // User Authentication
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Dashboard Routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/recent-invoices', [DashboardController::class, 'recentInvoices']);
        Route::get('/low-stock', [DashboardController::class, 'lowStockProducts']);
    });
    
    // Products Routes (Inventory)
    Route::apiResource('products', ProductController::class);
    
    // Expenses Routes (Finance)
    Route::apiResource('expenses', ExpenseController::class);
    
    // Reminders Routes
    Route::apiResource('reminders', ReminderController::class);
    
    // Invoices Routes (Billing & Records)
    Route::prefix('invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::get('/{id}', [InvoiceController::class, 'show']);
        Route::post('/', [InvoiceController::class, 'store']);
    });
    
    // Additional Stats Routes
    Route::get('/sales/stats', function() {
        return response()->json([
            'success' => true,
            'message' => 'Sales stats endpoint'
        ]);
    });
});

// ==================== FALLBACK ROUTE (404) ====================
Route::fallback(function() {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});