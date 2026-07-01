<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use App\Models\CreditVendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    /**
     * Get all products with credit vendor info
     * GET /api/products
     */
    public function index(Request $request)
    {
        try {
            $query = Product::with('creditVendor');

            // ✅ Filter by hidden status (default: show only non-hidden)
            $showHidden = $request->has('show_hidden') && $request->show_hidden == 'true';
            
            if (!$showHidden) {
                // Default: hide hidden products (is_hidden = 0)
                $query->where('is_hidden', 0);
            }
            // If show_hidden=true, show all products including hidden

            // Filter by credit purchase
            if ($request->has('is_credit') && $request->is_credit !== '') {
                $query->where('is_credit_purchase', $request->is_credit);
            }

            // Filter by vendor
            if ($request->has('vendor_id') && !empty($request->vendor_id)) {
                $query->where('vendor_id', $request->vendor_id);
            }

            // Search
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where('name', 'LIKE', "%{$search}%");
            }

            // Low stock filter
            if ($request->has('low_stock') && $request->low_stock) {
                $query->where('quantity', '<', 10);
            }

            $products = $query->orderBy('created_at', 'desc')->get();

            // ✅ Get counts for response
            $hiddenCount = Product::where('is_hidden', 1)->count();
            $activeCount = Product::where('is_hidden', 0)->count();

            // Format response with credit info
            $formattedProducts = $products->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'purchase_price' => (float) $product->purchase_price,
                    'selling_price' => (float) $product->selling_price,
                    'quantity' => (int) $product->quantity,
                    'date_added' => $product->date_added,
                    'created_at' => $product->created_at,
                    'updated_at' => $product->updated_at,
                    'is_credit_purchase' => (bool) $product->is_credit_purchase,
                    'is_hidden' => (bool) $product->is_hidden,
                    'vendor_id' => $product->vendor_id,
                    'vendor_name' => $product->vendor_name,
                    'stock_status' => $product->stock_status,
                    'stock_status_color' => $product->stock_status_color,
                    'total_credit_quantity' => $product->total_credit_quantity,
                    'credit_vendor' => $product->creditVendor ? [
                        'id' => $product->creditVendor->id,
                        'name' => $product->creditVendor->vendor_name,
                        'invoice_number' => $product->creditVendor->invoice_number,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedProducts,
                'total' => $products->count(),
                'active_count' => $activeCount,
                'hidden_count' => $hiddenCount,
                'low_stock_count' => $products->where('quantity', '<', 10)->count(),
                'showing_hidden' => $showHidden,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single product with credit info
     * GET /api/products/{id}
     */
    public function show($id)
    {
        try {
            $product = Product::with(['creditVendor', 'creditLinks'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'purchase_price' => (float) $product->purchase_price,
                    'selling_price' => (float) $product->selling_price,
                    'quantity' => (int) $product->quantity,
                    'date_added' => $product->date_added,
                    'created_at' => $product->created_at,
                    'updated_at' => $product->updated_at,
                    'is_credit_purchase' => (bool) $product->is_credit_purchase,
                    'is_hidden' => (bool) $product->is_hidden,
                    'vendor_id' => $product->vendor_id,
                    'vendor_name' => $product->vendor_name,
                    'stock_status' => $product->stock_status,
                    'stock_status_color' => $product->stock_status_color,
                    'total_credit_quantity' => $product->total_credit_quantity,
                    'total_credit_amount' => $product->total_credit_amount,
                    'credit_vendor' => $product->creditVendor ? [
                        'id' => $product->creditVendor->id,
                        'name' => $product->creditVendor->vendor_name,
                        'invoice_number' => $product->creditVendor->invoice_number,
                    ] : null,
                    'credit_links' => $product->creditLinks->map(function ($link) {
                        return [
                            'id' => $link->id,
                            'vendor_id' => $link->vendor_id,
                            'vendor_name' => $link->vendor_name,
                            'quantity' => (int) $link->quantity,
                            'purchase_price' => (float) $link->purchase_price,
                            'total_price' => (float) $link->total_price,
                            'created_at' => $link->created_at,
                        ];
                    }),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Create new product
     * POST /api/products
     */
    public function store(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'vendor_id' => 'nullable|exists:credit_vendors,id',
            'is_credit_purchase' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $product = Product::create([
                'name' => $request->name,
                'purchase_price' => $request->purchase_price,
                'selling_price' => $request->selling_price,
                'quantity' => $request->quantity,
                'date_added' => now(),
                'vendor_id' => $request->vendor_id ?? null,
                'is_credit_purchase' => $request->is_credit_purchase ?? false,
                'is_hidden' => 0,
            ]);

            // If vendor_id is provided, create credit product link
            if ($request->has('vendor_id') && !empty($request->vendor_id)) {
                \App\Models\CreditProductLink::create([
                    'vendor_id' => $request->vendor_id,
                    'product_id' => $product->id,
                    'quantity' => $request->quantity,
                    'purchase_price' => $request->purchase_price,
                ]);

                // Update vendor stock quantity
                $vendor = CreditVendor::find($request->vendor_id);
                if ($vendor) {
                    $vendor->stock_quantity += $request->quantity;
                    $vendor->save();
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'data' => $product->load('creditVendor'),
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create product',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update product
     * PUT /api/products/{id}
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'purchase_price' => 'sometimes|required|numeric|min:0',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'quantity' => 'sometimes|required|integer|min:0',
            'vendor_id' => 'nullable|exists:credit_vendors,id',
            'is_credit_purchase' => 'nullable|boolean',
            'is_hidden' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Get old quantity before update
            $oldQuantity = $product->quantity;
            
            // Update product
            $product->update($request->only([
                'name', 
                'purchase_price', 
                'selling_price', 
                'quantity',
                'vendor_id',
                'is_credit_purchase',
                'is_hidden'
            ]));
            
            // Check if stock dropped below 5 and send email
            if ($product->quantity < 5 && $oldQuantity >= 5) {
                $this->sendLowStockEmail($product);
            }

            // Update credit product link if vendor changed
            if ($request->has('vendor_id')) {
                if ($request->vendor_id) {
                    // Update or create credit link
                    $link = \App\Models\CreditProductLink::where('product_id', $product->id)->first();
                    if ($link) {
                        $link->update([
                            'vendor_id' => $request->vendor_id,
                            'quantity' => $product->quantity,
                            'purchase_price' => $product->purchase_price,
                        ]);
                    } else {
                        \App\Models\CreditProductLink::create([
                            'vendor_id' => $request->vendor_id,
                            'product_id' => $product->id,
                            'quantity' => $product->quantity,
                            'purchase_price' => $product->purchase_price,
                        ]);
                    }
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $product->load('creditVendor'),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update product',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete product
     * DELETE /api/products/{id}
     */
    public function destroy($id)
    {
        try {
            $product = Product::findOrFail($id);
            
            // Delete credit product links first
            $product->creditLinks()->delete();
            
            $product->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Product deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete product',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Patch product (partial update)
     * PATCH /api/products/{id}
     */
    public function patch(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'quantity' => 'sometimes|required|integer|min:0',
            'purchase_price' => 'sometimes|required|numeric|min:0',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'is_hidden' => 'sometimes|required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $product->update($request->only([
                'quantity',
                'purchase_price',
                'selling_price',
                'is_hidden'
            ]));
            
            // Check if stock dropped below 5
            if ($product->quantity < 5) {
                $this->sendLowStockEmail($product);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $product,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update product',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get low stock products
     * GET /api/products/low-stock
     */
    public function lowStock()
    {
        try {
            $products = Product::with('creditVendor')
                ->where('quantity', '<', 10)
                ->where('is_hidden', 0)
                ->orderBy('quantity', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $products->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'name' => $product->name,
                        'quantity' => (int) $product->quantity,
                        'purchase_price' => (float) $product->purchase_price,
                        'selling_price' => (float) $product->selling_price,
                        'vendor_name' => $product->vendor_name,
                        'is_credit_purchase' => (bool) $product->is_credit_purchase,
                        'is_hidden' => (bool) $product->is_hidden,
                    ];
                }),
                'count' => $products->count(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch low stock products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get products by vendor
     * GET /api/products/vendor/{vendorId}
     */
    public function getByVendor($vendorId)
    {
        try {
            $vendor = CreditVendor::findOrFail($vendorId);
            
            $products = $vendor->products()->withPivot('quantity', 'purchase_price')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'vendor' => [
                        'id' => $vendor->id,
                        'name' => $vendor->vendor_name,
                        'invoice_number' => $vendor->invoice_number,
                    ],
                    'products' => $products->map(function ($product) use ($vendor) {
                        return [
                            'id' => $product->id,
                            'name' => $product->name,
                            'quantity' => (int) $product->pivot->quantity,
                            'purchase_price' => (float) $product->pivot->purchase_price,
                            'selling_price' => (float) $product->selling_price,
                            'total_price' => (float) ($product->pivot->quantity * $product->pivot->purchase_price),
                            'is_hidden' => (bool) $product->is_hidden,
                        ];
                    }),
                    'total_products' => $products->count(),
                    'total_quantity' => $products->sum(function ($p) { return $p->pivot->quantity; }),
                    'total_amount' => $products->sum(function ($p) { 
                        return $p->pivot->quantity * $p->pivot->purchase_price; 
                    }),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch vendor products',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Send low stock email
     */
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
                        .credit-badge { background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
                        .hidden-badge { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
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
                                ' . ($product->is_credit_purchase ? '
                                <div style="margin-top: 10px;">
                                    <strong>Purchase Type:</strong> <span class="credit-badge">Credit Purchase</span>
                                </div>
                                ' : '') . '
                                ' . ($product->vendor_name ? '
                                <div style="margin-top: 10px;">
                                    <strong>Vendor:</strong> ' . $product->vendor_name . '
                                </div>
                                ' : '') . '
                                ' . ($product->is_hidden ? '
                                <div style="margin-top: 10px;">
                                    <strong>Status:</strong> <span class="hidden-badge">Hidden</span>
                                </div>
                                ' : '') . '
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