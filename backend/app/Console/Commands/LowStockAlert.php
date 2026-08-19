<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Command;

class LowStockAlert extends Command
{
    protected $signature = 'stock:alert';
    protected $description = 'Check low stock (UI alert only - NO EMAIL)';

    public function handle()
    {
        $this->info('🔍 Checking low stock products...');
        
        $products = Product::where('quantity', '<', 10)->get();
        
        if ($products->count() > 0) {
            $this->warn('⚠️ Low stock products:');
            foreach ($products as $p) {
                $this->line("   - {$p->name}: {$p->quantity} units");
            }
            
            // ✅ Email code COMPLETELY REMOVED
            // Mail::send() hata diya
            
            $this->info('📝 Check complete - UI alert only, no email sent');
        } else {
            $this->info('✅ No low stock products');
        }
        
        return Command::SUCCESS;
    }
}