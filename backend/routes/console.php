<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Log;

// ==================== DEFAULT INSPIRE COMMAND ====================
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ==================== LOW STOCK ALERT COMMAND ====================
Artisan::command('stock:check', function () {
    $this->info('[' . now() . '] Checking low stock products...');
    
    $lowStockProducts = App\Models\Product::where('quantity', '<', 10)->get();
    
    $this->info('Total products with low stock: ' . $lowStockProducts->count());
    
    foreach ($lowStockProducts as $product) {
        $this->line(" - {$product->name}: {$product->quantity} units left");
    }
    
    if ($lowStockProducts->count() > 0) {
        $admin = App\Models\User::where('role', 'admin')->first();
        
        if ($admin) {
            $this->info('Admin email: ' . $admin->email);
            $this->info('Low stock alert would be sent here');
            Log::info('Low stock alert', ['count' => $lowStockProducts->count()]);
        } else {
            $this->error('Admin user not found!');
        }
    } else {
        $this->info('All products have sufficient stock');
    }
    
    $this->info('Stock check completed at ' . now());
})->purpose('Check low stock products and send alerts');

// ==================== TEST COMMAND ====================
Artisan::command('test:mail', function () {
    $this->info('Testing mail configuration...');
    
    try {
        Mail::raw('Test email from Noorani Car AC', function ($message) {
            $message->to('admin@noorani.com')
                    ->subject('Test Email from Noorani Car AC');
        });
        $this->info('Test email sent successfully!');
    } catch (\Exception $e) {
        $this->error('Mail sending failed: ' . $e->getMessage());
    }
})->purpose('Test email configuration');

// ==================== SCHEDULED TASKS ====================

// Check low stock every hour
Schedule::command('stock:check')->hourly();

// Check low stock at 9 AM daily
Schedule::command('stock:check')->dailyAt('09:00');

// Check low stock at 6 PM daily  
Schedule::command('stock:check')->dailyAt('18:00');

// For development/testing - check every minute (uncomment if needed)
// Schedule::command('stock:check')->everyMinute();

// Optional: Send daily report at 8 PM
Schedule::command('stock:check')->dailyAt('20:00');

// ==================== LOGGING SCHEDULER EXECUTION ====================
Schedule::command('stock:check')->hourly()->onSuccess(function () {
    Log::info('Low stock check completed successfully');
})->onFailure(function () {
    Log::error('Low stock check failed');
});

// ==================== ADDITIONAL COMMANDS ====================

// Clear all cache command
Artisan::command('cache:clear-all', function () {
    $this->info('Clearing all cache...');
    Artisan::call('config:clear');
    Artisan::call('cache:clear');
    Artisan::call('view:clear');
    Artisan::call('route:clear');
    $this->info('All cache cleared successfully!');
})->purpose('Clear all Laravel cache');

// Show system status command
Artisan::command('system:status', function () {
    $this->info('=== Noorani Car AC System Status ===');
    $this->info('Time: ' . now());
    $this->info('PHP Version: ' . PHP_VERSION);
    
    $productCount = App\Models\Product::count();
    $lowStockCount = App\Models\Product::where('quantity', '<', 10)->count();
    $invoiceCount = App\Models\Invoice::count();
    
    $this->info('Total Products: ' . $productCount);
    $this->info('Low Stock Products: ' . $lowStockCount);
    $this->info('Total Invoices: ' . $invoiceCount);
    
    $this->info('Status: System running normally ✅');
})->purpose('Display system status');