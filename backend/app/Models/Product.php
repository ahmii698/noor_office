<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Mail;
use App\Models\User;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';
    
    protected $fillable = [
        'name', 
        'purchase_price', 
        'selling_price', 
        'quantity', 
        'date_added',
        'last_low_stock_notification'
    ];

    protected $casts = [
        'date_added' => 'date',
        'last_low_stock_notification' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public $timestamps = true;

    // ✅ AUTOMATIC EMAIL WHEN PRODUCT UPDATED
    protected static function booted()
    {
        static::updated(function ($product) {
            // Check if quantity is less than 10
            if ($product->quantity < 10) {
                self::sendLowStockEmail($product);
            }
        });
        
        static::created(function ($product) {
            // Check if new product quantity is less than 10
            if ($product->quantity < 10) {
                self::sendLowStockEmail($product);
            }
        });
    }
    
    // ✅ Send email function
    protected static function sendLowStockEmail($product)
    {
        try {
            $admin = User::where('role', 'admin')->first();
            
            if ($admin) {
                $html = '
                <html>
                <head><title>Low Stock Alert</title></head>
                <body style="font-family: Arial, sans-serif;">
                    <div style="background:#dc2626;color:white;padding:15px;text-align:center">
                        <h2>⚠️ LOW STOCK ALERT</h2>
                        <p>Noorani Car AC & Autos</p>
                    </div>
                    <div style="padding:20px">
                        <p><strong>Dear Admin,</strong></p>
                        <p>The following product is running low on stock:</p>
                        <table style="width:100%;border-collapse:collapse;margin-top:15px;">
                            <tr style="background:#f3f4f6;">
                                <th style="padding:10px;">Product Name</th>
                                <th style="padding:10px;">Current Stock</th>
                                <th style="padding:10px;">Status</th>
                             </tr>
                            <tr style="border-bottom:1px solid #e5e7eb;">
                                <td style="padding:10px;"><strong>' . $product->name . '</strong></td>
                                <td style="padding:10px;color:#dc2626;font-weight:bold;">' . $product->quantity . ' units</td>
                                <td style="padding:10px;"><span style="background:#fee2e2;color:#dc2626;padding:4px 8px;border-radius:4px;">LOW STOCK</span></td>
                             </tr>
                        </table>
                        <div style="margin-top:20px;padding:15px;background:#fef2f2;border-radius:8px;">
                            <strong>Action Required:</strong> Please restock this item as soon as possible.
                        </div>
                    </div>
                    <div style="text-align:center;padding:15px;color:#666;font-size:12px;">
                        <p>Noorani Car AC & Autos | Professional Auto Care Service</p>
                        <p>This is an automated alert.</p>
                    </div>
                </body>
                </html>';
                
                Mail::send([], [], function($message) use ($admin, $html) {
                    $message->to($admin->email)
                            ->subject('⚠️ Low Stock Alert - ' . $admin->name)
                            ->html($html);
                });
                
                \Log::info('Low stock email sent for: ' . $product->name);
            }
        } catch (\Exception $e) {
            \Log::error('Low stock email failed: ' . $e->getMessage());
        }
    }
}