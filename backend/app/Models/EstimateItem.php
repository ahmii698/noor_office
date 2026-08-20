<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class EstimateItem extends Model
{
    use HasFactory;

    protected $table = 'estimate_items';

    protected $fillable = [
        'estimate_id',
        'name',
        'quantity',
        'price'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'float'
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function estimate()
    {
        return $this->belongsTo(Estimate::class);
    }

    // ============================================================
    // ACCESSORS
    // ============================================================

    public function getTotalAttribute()
    {
        return $this->quantity * $this->price;
    }

    public function getFormattedPriceAttribute()
    {
        return 'Rs. ' . number_format($this->price, 2);
    }

    public function getFormattedTotalAttribute()
    {
        return 'Rs. ' . number_format($this->total, 2);
    }

    public function getFormattedQuantityAttribute()
    {
        return $this->quantity . ' ' . ($this->quantity > 1 ? 'units' : 'unit');
    }

    public function getPricePerUnitAttribute()
    {
        return $this->price;
    }

    public function getSubtotalAttribute()
    {
        return $this->quantity * $this->price;
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeByEstimate($query, $estimateId)
    {
        return $query->where('estimate_id', $estimateId);
    }

    public function scopeMinPrice($query, $min)
    {
        return $query->where('price', '>=', $min);
    }

    public function scopeMaxPrice($query, $max)
    {
        return $query->where('price', '<=', $max);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where('name', 'LIKE', "%{$search}%");
    }

    // ============================================================
    // BOOT METHOD
    // ============================================================

    protected static function booted()
    {
        static::created(function ($item) {
            // Update estimate total when item is created
            $item->estimate->updateTotalAmount();
            
            \Log::info('Estimate item added', [
                'estimate_id' => $item->estimate_id,
                'item_name' => $item->name,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total' => $item->total
            ]);
        });

        static::updated(function ($item) {
            // Update estimate total when item is updated
            $item->estimate->updateTotalAmount();
            
            \Log::info('Estimate item updated', [
                'estimate_id' => $item->estimate_id,
                'item_name' => $item->name,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total' => $item->total,
                'changes' => $item->getChanges()
            ]);
        });

        static::deleted(function ($item) {
            // Update estimate total when item is deleted
            $item->estimate->updateTotalAmount();
            
            \Log::info('Estimate item deleted', [
                'estimate_id' => $item->estimate_id,
                'item_name' => $item->name
            ]);
        });
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Update the total amount of the parent estimate
     */
    public function updateEstimateTotal()
    {
        $this->estimate->updateTotalAmount();
        return $this;
    }

    /**
     * Clone item to another estimate
     */
    public function cloneTo($estimateId)
    {
        $newItem = $this->replicate();
        $newItem->estimate_id = $estimateId;
        $newItem->created_at = now();
        $newItem->updated_at = now();
        $newItem->save();
        
        // Update total of the new estimate
        $newItem->estimate->updateTotalAmount();
        
        return $newItem;
    }

    /**
     * Get item data for print
     */
    public function getPrintData()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'quantity' => $this->quantity,
            'price' => $this->price,
            'total' => $this->total,
            'formatted_price' => $this->formatted_price,
            'formatted_total' => $this->formatted_total,
            'formatted_quantity' => $this->formatted_quantity
        ];
    }

    /**
     * Get item data for API response
     */
    public function getApiData()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'quantity' => $this->quantity,
            'price' => $this->price,
            'total' => $this->total,
            'formatted_price' => $this->formatted_price,
            'formatted_total' => $this->formatted_total
        ];
    }

    /**
     * Increase quantity by given amount
     */
    public function increaseQuantity($amount = 1)
    {
        $this->quantity += $amount;
        $this->save();
        return $this;
    }

    /**
     * Decrease quantity by given amount
     */
    public function decreaseQuantity($amount = 1)
    {
        if ($this->quantity - $amount < 1) {
            throw new \Exception('Quantity cannot be less than 1');
        }
        $this->quantity -= $amount;
        $this->save();
        return $this;
    }

    /**
     * Update price and recalculate
     */
    public function updatePrice($newPrice)
    {
        if ($newPrice < 0) {
            throw new \Exception('Price cannot be negative');
        }
        $this->price = $newPrice;
        $this->save();
        return $this;
    }

    /**
     * Check if item has valid data
     */
    public function isValid()
    {
        return !empty($this->name) && $this->quantity > 0 && $this->price >= 0;
    }

    /**
     * Get validation errors
     */
    public function getValidationErrors()
    {
        $errors = [];
        if (empty($this->name)) {
            $errors[] = 'Item name is required';
        }
        if ($this->quantity < 1) {
            $errors[] = 'Quantity must be at least 1';
        }
        if ($this->price < 0) {
            $errors[] = 'Price cannot be negative';
        }
        return $errors;
    }

    /**
     * Get item summary (short description)
     */
    public function getSummaryAttribute()
    {
        return $this->name . ' x ' . $this->quantity . ' = Rs. ' . number_format($this->total, 2);
    }

    /**
     * Get item with estimate details
     */
    public function getWithEstimate()
    {
        return $this->load('estimate');
    }

    /**
     * Get total of all items for an estimate
     */
    public static function getTotalForEstimate($estimateId)
    {
        return self::where('estimate_id', $estimateId)
            ->sum(DB::raw('quantity * price'));
    }

    /**
     * Get count of items for an estimate
     */
    public static function getCountForEstimate($estimateId)
    {
        return self::where('estimate_id', $estimateId)->count();
    }

    /**
     * Get most expensive item for an estimate
     */
    public static function getMostExpensive($estimateId)
    {
        return self::where('estimate_id', $estimateId)
            ->orderBy('price', 'desc')
            ->first();
    }

    /**
     * Get least expensive item for an estimate
     */
    public static function getLeastExpensive($estimateId)
    {
        return self::where('estimate_id', $estimateId)
            ->orderBy('price', 'asc')
            ->first();
    }

    /**
     * Bulk create items for an estimate
     */
    public static function bulkCreate($estimateId, array $items)
    {
        $created = [];
        foreach ($items as $itemData) {
            $item = self::create([
                'estimate_id' => $estimateId,
                'name' => $itemData['name'],
                'quantity' => $itemData['quantity'] ?? 1,
                'price' => $itemData['price'] ?? 0
            ]);
            $created[] = $item;
        }
        
        // Update estimate total
        if ($estimate = Estimate::find($estimateId)) {
            $estimate->updateTotalAmount();
        }
        
        return $created;
    }

    /**
     * Delete all items for an estimate
     */
    public static function deleteAllForEstimate($estimateId)
    {
        $deleted = self::where('estimate_id', $estimateId)->delete();
        
        // Update estimate total
        if ($estimate = Estimate::find($estimateId)) {
            $estimate->updateTotalAmount();
        }
        
        return $deleted;
    }
}