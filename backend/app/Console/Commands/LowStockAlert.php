<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class LowStockAlert extends Command
{
    protected $signature = 'stock:alert';
    protected $description = 'Send low stock alert';

    public function handle()
    {
        $products = Product::where('quantity', '<', 10)->get();
        
        if ($products->count() > 0) {
            $admin = User::where('role', 'admin')->first();
            
            if ($admin) {
                $html = '<html><body>
                <h2>⚠️ Low Stock Alert</h2>
                <table border="1" cellpadding="10">
                <tr><th>Product</th><th>Stock</th></tr>';
                
                foreach ($products as $p) {
                    $html .= "<tr><td>{$p->name}</td><td style='color:red'>{$p->quantity} units</td></tr>";
                }
                
                $html .= '</table>
                <p>Please restock soon!</p>
                </body></html>';
                
                Mail::send([], [], function($message) use ($admin, $html) {
                    $message->to($admin->email)
                            ->subject('⚠️ Low Stock Alert - Noorani Car AC')
                            ->html($html);
                });
                
                $this->info("✅ Email sent to " . $admin->email);
            }
        } else {
            $this->info("No low stock products");
        }
    }
}