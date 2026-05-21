<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    public function index()
    {
        return response()->json(Product::all());
    }

    // ✅ GET single product
    public function show($id)
    {
        try {
            $product = Product::findOrFail($id);
            return response()->json($product);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Product not found'], 404);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'purchasePrice' => 'required|numeric|min:0',
            'sellingPrice' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0'
        ]);

        $product = Product::create([
            'name' => $request->name,
            'purchase_price' => $request->purchasePrice,
            'selling_price' => $request->sellingPrice,
            'quantity' => $request->quantity,
            'date_added' => now()
        ]);

        return response()->json($product, 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        // Get old quantity before update
        $oldQuantity = $product->quantity;
        
        // Update product
        $product->update($request->only([
            'name', 
            'purchase_price', 
            'selling_price', 
            'quantity'
        ]));
        
        // ✅ Check if stock dropped below 5 and send email
        if ($product->quantity < 5 && $oldQuantity >= 5) {
            $this->sendLowStockEmail($product);
        }
        
        return response()->json($product);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }

    // ✅ Send low stock email
    private function sendLowStockEmail($product)
    {
        try {
            $admin = User::where('role', 'admin')->first();
            
            if ($admin) {
                $html = '
                <html>
                <head>
                    <title>Low Stock Alert</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .container { max-width: 600px; margin: 0 auto; background: #f9fafb; }
                        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: white; }
                        .product-box { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; }
                        .product-name { font-size: 18px; font-weight: bold; color: #dc2626; }
                        .stock { font-size: 24px; font-weight: bold; color: #dc2626; }
                        .footer { text-align: center; padding: 15px; font-size: 12px; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>⚠️ LOW STOCK ALERT</h2>
                            <p>Noorani Car AC & Autos</p>
                        </div>
                        <div class="content">
                            <p><strong>Dear Admin,</strong></p>
                            <p>The following product is running low on stock:</p>
                            <div class="product-box">
                                <div class="product-name">📦 ' . $product->name . '</div>
                                <div style="margin-top: 10px;">
                                    <strong>Current Stock:</strong> <span class="stock">' . $product->quantity . ' units</span>
                                </div>
                                <div style="margin-top: 10px;">
                                    <strong>Status:</strong> <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px;">Low Stock (Below 5)</span>
                                </div>
                            </div>
                            <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 8px;">
                                <p style="margin: 0;"><strong>Action Required:</strong> Please restock this item as soon as possible.</p>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Noorani Car AC & Autos | Professional Auto Care Service</p>
                            <p>This is an automated alert. Please restock soon!</p>
                        </div>
                    </div>
                </body>
                </html>';
                
                Mail::send([], [], function($message) use ($admin, $html, $product) {
                    $message->to($admin->email)
                            ->subject('⚠️ Low Stock Alert - ' . $product->name)
                            ->html($html);
                });
                
                Log::info('Low stock email sent for: ' . $product->name . ' (Stock: ' . $product->quantity . ')');
            } else {
                Log::warning('No admin user found to send low stock alert');
            }
        } catch (\Exception $e) {
            Log::error('Low stock email failed: ' . $e->getMessage());
        }
    }
}