<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
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
        'last_low_stock_notification',
        'vendor_id',
        'is_credit_purchase',
        'is_hidden' // ✅ Added is_hidden
    ];

    protected $casts = [
        'date_added' => 'date',
        'last_low_stock_notification' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'is_credit_purchase' => 'boolean',
        'is_hidden' => 'boolean', // ✅ Added is_hidden cast
    ];

    public $timestamps = true;

    // ============================================================
    // ✅ CREDIT RELATIONSHIPS
    // ============================================================

    /**
     * Get the vendor who supplied this product on credit
     */
    public function creditVendor()
    {
        return $this->belongsTo(CreditVendor::class, 'vendor_id');
    }

    /**
     * Get the credit product links for this product
     */
    public function creditLinks()
    {
        return $this->hasMany(CreditProductLink::class);
    }

    /**
     * Get all vendors associated with this product through credit purchases
     */
    public function creditVendors()
    {
        return $this->belongsToMany(CreditVendor::class, 'credit_product_links')
                    ->withPivot('quantity', 'purchase_price')
                    ->withTimestamps();
    }

    // ============================================================
    // ✅ CREDIT ACCESSORS & HELPERS
    // ============================================================

    /**
     * Check if product was purchased on credit
     */
    public function isCreditPurchase(): bool
    {
        return (bool) $this->is_credit_purchase;
    }

    /**
     * Check if product is hidden
     */
    public function isHidden(): bool
    {
        return (bool) $this->is_hidden;
    }

    /**
     * Get vendor name or null
     */
    public function getVendorNameAttribute()
    {
        if ($this->creditVendor) {
            return $this->creditVendor->vendor_name;
        }
        return null;
    }

    /**
     * Get total credit quantity for this product
     */
    public function getTotalCreditQuantityAttribute(): int
    {
        return (int) $this->creditLinks()->sum('quantity');
    }

    /**
     * Get total credit purchase amount for this product
     */
    public function getTotalCreditAmountAttribute(): float
    {
        return (float) $this->creditLinks()->sum(DB::raw('quantity * purchase_price'));
    }

    /**
     * Check if product is low stock (less than 10)
     */
    public function isLowStock(): bool
    {
        return $this->quantity < 10;
    }

    /**
     * Get stock status label
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->quantity <= 0) {
            return 'Out of Stock';
        } elseif ($this->quantity < 10) {
            return 'Low Stock';
        } elseif ($this->quantity < 50) {
            return 'Medium';
        } else {
            return 'In Stock';
        }
    }

    /**
     * Get stock status color
     */
    public function getStockStatusColorAttribute(): string
    {
        if ($this->quantity <= 0) {
            return 'red';
        } elseif ($this->quantity < 10) {
            return 'yellow';
        } elseif ($this->quantity < 50) {
            return 'blue';
        } else {
            return 'green';
        }
    }

    /**
     * Get formatted purchase price
     */
    public function getFormattedPurchasePriceAttribute(): string
    {
        return 'Rs. ' . number_format($this->purchase_price, 2);
    }

    /**
     * Get formatted selling price
     */
    public function getFormattedSellingPriceAttribute(): string
    {
        return 'Rs. ' . number_format($this->selling_price, 2);
    }

    /**
     * Get profit per unit
     */
    public function getProfitPerUnitAttribute(): float
    {
        return (float) ($this->selling_price - $this->purchase_price);
    }

    /**
     * Get total stock value (purchase price)
     */
    public function getTotalStockValueAttribute(): float
    {
        return (float) ($this->quantity * $this->purchase_price);
    }

    /**
     * Get total stock value (selling price)
     */
    public function getTotalSellingValueAttribute(): float
    {
        return (float) ($this->quantity * $this->selling_price);
    }

    /**
     * Get profit margin percentage
     */
    public function getProfitMarginAttribute(): float
    {
        if ($this->purchase_price == 0) return 0;
        return round((($this->selling_price - $this->purchase_price) / $this->purchase_price) * 100, 2);
    }

    // ============================================================
    // ✅ SCOPES
    // ============================================================

    /**
     * Scope to get only credit purchase products
     */
    public function scopeCreditPurchases($query)
    {
        return $query->where('is_credit_purchase', true);
    }

    /**
     * Scope to get only normal purchase products
     */
    public function scopeNormalPurchases($query)
    {
        return $query->where('is_credit_purchase', false);
    }

    /**
     * Scope to get low stock products
     */
    public function scopeLowStock($query, $threshold = 10)
    {
        return $query->where('quantity', '<', $threshold);
    }

    /**
     * Scope to get out of stock products
     */
    public function scopeOutOfStock($query)
    {
        return $query->where('quantity', '<=', 0);
    }

    /**
     * Scope to get products by vendor
     */
    public function scopeByVendor($query, $vendorId)
    {
        return $query->where('vendor_id', $vendorId);
    }

    /**
     * Scope to search products
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('name', 'LIKE', "%{$search}%");
    }

    /**
     * ✅ Scope to get only non-hidden products (active)
     */
    public function scopeActive($query)
    {
        return $query->where('is_hidden', 0);
    }

    /**
     * ✅ Scope to get only hidden products
     */
    public function scopeHidden($query)
    {
        return $query->where('is_hidden', 1);
    }

    // ============================================================
    // ✅ STATIC METHODS
    // ============================================================

    /**
     * Get total stock value of all products
     */
    public static function getTotalStockValue(): float
    {
        return (float) self::sum(DB::raw('quantity * purchase_price'));
    }

    /**
     * Get total selling value of all products
     */
    public static function getTotalSellingValue(): float
    {
        return (float) self::sum(DB::raw('quantity * selling_price'));
    }

    /**
     * Get total profit potential
     */
    public static function getTotalProfitPotential(): float
    {
        return (float) self::sum(DB::raw('quantity * (selling_price - purchase_price)'));
    }

    /**
     * Get product statistics
     */
    public static function getStatistics()
    {
        $totalProducts = self::count();
        $totalQuantity = self::sum('quantity');
        $lowStockCount = self::lowStock()->count();
        $outOfStockCount = self::outOfStock()->count();
        $creditProducts = self::creditPurchases()->count();
        $normalProducts = self::normalPurchases()->count();
        $hiddenProducts = self::hidden()->count(); // ✅ Added hidden count
        $activeProducts = self::active()->count(); // ✅ Added active count

        return [
            'total_products' => $totalProducts,
            'total_quantity' => (int) $totalQuantity,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'credit_products' => $creditProducts,
            'normal_products' => $normalProducts,
            'hidden_products' => $hiddenProducts,
            'active_products' => $activeProducts,
            'total_stock_value' => (float) self::getTotalStockValue(),
            'total_selling_value' => (float) self::getTotalSellingValue(),
            'total_profit_potential' => (float) self::getTotalProfitPotential(),
        ];
    }

    // ============================================================
    // ✅ EXISTING CODE - LOW STOCK EMAIL
    // ============================================================

    /**
     * Boot the model
     */
    protected static function booted()
    {
        // When product is updated
        static::updated(function ($product) {
            // Check if quantity is less than 10
            if ($product->quantity < 10) {
                self::sendLowStockEmail($product);
            }
            
            // Log changes
            if ($product->wasChanged()) {
                \Log::info('Product updated', [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'changes' => $product->getChanges(),
                ]);
            }
        });
        
        // When product is created
        static::created(function ($product) {
            // Check if new product quantity is less than 10
            if ($product->quantity < 10) {
                self::sendLowStockEmail($product);
            }
            
            \Log::info('Product created', [
                'product_id' => $product->id,
                'name' => $product->name,
                'quantity' => $product->quantity,
                'is_credit_purchase' => $product->is_credit_purchase,
                'is_hidden' => $product->is_hidden,
            ]);
        });

        // When product is deleted
        static::deleted(function ($product) {
            \Log::info('Product deleted', [
                'product_id' => $product->id,
                'name' => $product->name,
            ]);
        });
    }
    
    /**
     * Send low stock email
     */
    protected static function sendLowStockEmail($product)
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
                        .credit-badge { background: #8b5cf6; color: white; padding: 2px 10px; border-radius: 4px; font-size: 12px; display: inline-block; }
                        .hidden-badge { background: #f59e0b; color: white; padding: 2px 10px; border-radius: 4px; font-size: 12px; display: inline-block; }
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
                                    <strong>Status:</strong> <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px;">Low Stock (Below 10)</span>
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
                
                \Log::info('Low stock email sent for: ' . $product->name . ' (Stock: ' . $product->quantity . ')');
            } else {
                \Log::warning('No admin user found to send low stock alert');
            }
        } catch (\Exception $e) {
            \Log::error('Low stock email failed: ' . $e->getMessage());
        }
    }
}