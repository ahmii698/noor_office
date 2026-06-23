<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\BirthdayReminderController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ServiceReminderController;

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

// Public Data Routes - Services (Full CRUD)
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/services/{id}', [ServiceController::class, 'show']);
Route::post('/services', [ServiceController::class, 'store']);
Route::put('/services/{id}', [ServiceController::class, 'update']);
Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

// ✅ PRODUCTS - Made PUBLIC so they work without login
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::patch('/products/{id}', [ProductController::class, 'patch']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

// ✅ CUSTOMER ROUTES - Made PUBLIC so they work without login
Route::get('/customers', [CustomerController::class, 'index']);
Route::get('/customers/{id}', [CustomerController::class, 'show']);
Route::post('/customers', [CustomerController::class, 'store']);
Route::put('/customers/{id}', [CustomerController::class, 'update']);
Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);
Route::put('/customers/{id}/birthday', [CustomerController::class, 'updateBirthday']);

// ✅ SERVICE REMINDER ROUTES - Made PUBLIC so they work without login
Route::get('/reminders', [ReminderController::class, 'index']);
Route::get('/reminders/{id}', [ReminderController::class, 'show']);
Route::post('/reminders', [ReminderController::class, 'store']);
Route::put('/reminders/{id}', [ReminderController::class, 'update']);
Route::delete('/reminders/{id}', [ReminderController::class, 'destroy']);
Route::get('/reminders/pending', [ReminderController::class, 'getPendingReminders']);
Route::post('/reminders/add', [ReminderController::class, 'addReminder']);
Route::post('/reminders/send-email', [ReminderController::class, 'sendReminderEmail']);
Route::get('/reminders/invoice/{invoiceNo}', [ReminderController::class, 'getByInvoiceNo']);
Route::patch('/reminders/{id}/mark-sent', [ReminderController::class, 'markAsSent']);
Route::get('/reminders/due/today', [ReminderController::class, 'getTodayDueReminders']);

// ✅ BIRTHDAY REMINDER ROUTES - Now directly from customers table
Route::prefix('birthday-reminders')->group(function () {
    // ✅ Only these routes are needed now
    Route::get('/today', [BirthdayReminderController::class, 'getTodayReminders']);
    Route::get('/pending', [BirthdayReminderController::class, 'getPendingReminders']);
    Route::get('/all', [BirthdayReminderController::class, 'index']);
    Route::delete('/{id}', [BirthdayReminderController::class, 'destroy']); // ✅ ADDED for clear
});

// ✅ SERVICE REMINDER ROUTES (for Tuning & Oil Change from invoice_items)
Route::prefix('service-reminders')->group(function () {
    Route::get('/all', [ServiceReminderController::class, 'getAllReminders']);
    Route::get('/customer/{customerId}', [ServiceReminderController::class, 'getCustomerReminders']); // ✅ ADDED
    Route::put('/mark-sent/{id}', [ServiceReminderController::class, 'markAsSent']);
    Route::get('/message/{type}', [ServiceReminderController::class, 'getMessage']);
    Route::post('/message/{type}', [ServiceReminderController::class, 'updateMessage']);
    Route::delete('/{id}', [ServiceReminderController::class, 'destroy']); // ✅ ADDED for clear
});

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
    
    // Invoices Routes (Billing & Records) - Protected
    Route::prefix('invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::get('/{id}', [InvoiceController::class, 'show']);
        Route::post('/', [InvoiceController::class, 'store']);
        Route::delete('/{id}', [InvoiceController::class, 'destroy']); // ✅ ADDED
    });
    
    // Expenses Routes (Finance) - Protected
    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::get('/expenses/{id}', [ExpenseController::class, 'show']);
    Route::post('/expenses', [ExpenseController::class, 'store']);
    Route::put('/expenses/{id}', [ExpenseController::class, 'update']);
    Route::delete('/expenses/{id}', [ExpenseController::class, 'destroy']);
    
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