<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Command;

class CheckLowStock extends Command
{
    protected $signature = 'stock:check';
    protected $description = 'Check low stock products and send alerts';

    public function handle()
    {
        $this->info('Checking low stock products...');
        
        $products = Product::where('quantity', '<', 10)->get();
        
        $this->info('Total products with low stock: ' . $products->count());

        if ($products->count() > 0) {
            foreach ($products as $product) {
                $this->line(" - {$product->name}: {$product->quantity} units left");
            }
            
            $admin = User::where('role', 'admin')->first();
            
            if ($admin) {
                $this->info("Admin email: " . $admin->email);
                
                $msg = "Dear Admin,\n\nFollowing products are low in stock:\n\n";
                foreach ($products as $p) {
                    $msg .= "Product: {$p->name}\nStock: {$p->quantity} units\n\n";
                }
                $msg .= "Action Required: Please restock soon!\n\nRegards,\nNoorani Car AC";
                
                $subject = "⚠️ Low Stock Alert - Noorani Car AC";
                $headers = "From: noreply@nooranicarac.com\r\n";
                $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
                
                if(mail($admin->email, $subject, $msg, $headers)) {
                    $this->info("✅ Email sent!");
                } else {
                    $this->error("Email failed");
                    file_put_contents(storage_path('logs/low_stock.txt'), $msg);
                    $this->info("Alert saved to storage/logs/low_stock.txt");
                }
            }
        } else {
            $this->info('No low stock products');
        }
        
        return Command::SUCCESS;
    }
}