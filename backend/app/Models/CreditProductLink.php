<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditProductLink extends Model
{
    use HasFactory;

    protected $table = 'credit_product_links';

    protected $fillable = [
        'vendor_id',
        'product_id',
        'quantity',
        'purchase_price'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'purchase_price' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    // ============================================================
    // ✅ RELATIONSHIPS
    // ============================================================

    /**
     * Get the vendor for this product link
     */
    public function vendor()
    {
        return $this->belongsTo(CreditVendor::class);
    }

    /**
     * Get the product for this link
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // ============================================================
    // ✅ ACCESSORS & MUTATORS
    // ============================================================

    /**
     * Get total price for this link (quantity * purchase_price)
     */
    public function getTotalPriceAttribute()
    {
        return $this->quantity * $this->purchase_price;
    }

    /**
     * Get formatted total price
     */
    public function getFormattedTotalPriceAttribute()
    {
        return 'Rs. ' . number_format($this->total_price, 2);
    }

    /**
     * Get formatted purchase price
     */
    public function getFormattedPurchasePriceAttribute()
    {
        return 'Rs. ' . number_format($this->purchase_price, 2);
    }

    /**
     * Get product name directly
     */
    public function getProductNameAttribute()
    {
        return $this->product ? $this->product->name : null;
    }

    /**
     * Get vendor name directly
     */
    public function getVendorNameAttribute()
    {
        return $this->vendor ? $this->vendor->vendor_name : null;
    }

    // ============================================================
    // ✅ HELPER METHODS
    // ============================================================

    /**
     * Check if this link has a valid product
     */
    public function hasValidProduct(): bool
    {
        return $this->product !== null;
    }

    /**
     * Check if this link has a valid vendor
     */
    public function hasValidVendor(): bool
    {
        return $this->vendor !== null;
    }

    /**
     * Update product stock when link is created
     */
    public static function updateProductStock($productId, $quantity)
    {
        $product = Product::find($productId);
        if ($product) {
            $product->quantity += $quantity;
            $product->save();
            return true;
        }
        return false;
    }

    /**
     * Revert product stock when link is deleted
     */
    public function revertProductStock()
    {
        $product = $this->product;
        if ($product) {
            $product->quantity -= $this->quantity;
            $product->save();
            return true;
        }
        return false;
    }

    // ============================================================
    // ✅ EVENTS
    // ============================================================

    /**
     * Boot the model
     */
    protected static function booted()
    {
        // When a credit product link is created, update product stock
        static::created(function ($creditProductLink) {
            self::updateProductStock(
                $creditProductLink->product_id,
                $creditProductLink->quantity
            );
            
            \Log::info('Credit product link created', [
                'vendor_id' => $creditProductLink->vendor_id,
                'product_id' => $creditProductLink->product_id,
                'quantity' => $creditProductLink->quantity,
                'purchase_price' => $creditProductLink->purchase_price,
            ]);
        });

        // When a credit product link is deleted, revert product stock
        static::deleted(function ($creditProductLink) {
            $creditProductLink->revertProductStock();
            
            \Log::info('Credit product link deleted', [
                'vendor_id' => $creditProductLink->vendor_id,
                'product_id' => $creditProductLink->product_id,
                'quantity' => $creditProductLink->quantity,
            ]);
        });
    }
}