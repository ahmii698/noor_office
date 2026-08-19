<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Command;

class CheckLowStock extends Command
{
    protected $signature = 'stock:check';
    protected $description = 'Check low stock products (UI alert only - NO EMAIL)';

    public function handle()
    {
        $this->info('🔍 Checking low stock products...');
        
        $products = Product::where('quantity', '<', 10)->get();
        
        $this->info('📊 Total products with low stock: ' . $products->count());

        if ($products->count() > 0) {
            $this->warn('⚠️ Low stock products found:');
            foreach ($products as $product) {
                $this->line("   - {$product->name}: {$product->quantity} units left");
            }
            
            // ✅ Email code COMPLETELY REMOVED
            // Sirf log file mein save karo (optional)
            $logMsg = "[" . date('Y-m-d H:i:s') . "] Low stock products:\n";
            foreach ($products as $p) {
                $logMsg .= "  - {$p->name}: {$p->quantity} units\n";
            }
            file_put_contents(storage_path('logs/low_stock.txt'), $logMsg, FILE_APPEND);
            $this->info('📝 Log saved to storage/logs/low_stock.txt');
            
        } else {
            $this->info('✅ No low stock products found');
        }
        
        return Command::SUCCESS;
    }
}