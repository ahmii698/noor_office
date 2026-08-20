<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Estimate extends Model
{
    use HasFactory;

    protected $table = 'estimates';

    protected $fillable = [
        'estimate_no',
        'company_name',
        'vehicle',
        'policy_number',
        'color',
        'make',
        'vin',
        'model',
        'engine_no',
        'reg_no',
        'address',
        'date',
        'valid_until',
        'total_amount',
        'notes',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'date' => 'date',
        'valid_until' => 'date',
        'total_amount' => 'float'
    ];

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    public function items()
    {
        return $this->hasMany(EstimateItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ============================================================
    // SCOPES
    // ============================================================

    public function scopeActive($query)
    {
        return $query->where('valid_until', '>=', now());
    }

    public function scopeExpired($query)
    {
        return $query->where('valid_until', '<', now());
    }

    public function scopeByCompany($query, $company)
    {
        return $query->where('company_name', 'LIKE', "%{$company}%");
    }

    public function scopeByVehicle($query, $vehicle)
    {
        return $query->where('vehicle', 'LIKE', "%{$vehicle}%");
    }

    public function scopeByEstimateNo($query, $estimateNo)
    {
        return $query->where('estimate_no', 'LIKE', "%{$estimateNo}%");
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    public function scopeByPolicyNumber($query, $policyNumber)
    {
        return $query->where('policy_number', 'LIKE', "%{$policyNumber}%");
    }

    public function scopeByRegNo($query, $regNo)
    {
        return $query->where('reg_no', 'LIKE', "%{$regNo}%");
    }

    // ============================================================
    // ACCESSORS
    // ============================================================

    public function getStatusAttribute()
    {
        if ($this->valid_until < now()) {
            return 'Expired';
        }
        return 'Active';
    }

    public function getFormattedTotalAttribute()
    {
        return 'Rs. ' . number_format($this->total_amount, 2);
    }

    public function getItemsCountAttribute()
    {
        return $this->items()->count();
    }

    public function getTotalItemsCountAttribute()
    {
        return $this->items()->sum('quantity');
    }

    public function getStatusBadgeAttribute()
    {
        if ($this->valid_until < now()) {
            return 'bg-red-100 text-red-700';
        }
        return 'bg-green-100 text-green-700';
    }

    public function getStatusColorAttribute()
    {
        if ($this->valid_until < now()) {
            return 'red';
        }
        return 'green';
    }

    public function getDaysUntilExpiryAttribute()
    {
        if ($this->isExpired()) {
            return 0;
        }
        return now()->diffInDays($this->valid_until);
    }

    public function getIsExpiredAttribute()
    {
        return $this->valid_until < now();
    }

    public function getIsActiveAttribute()
    {
        return $this->valid_until >= now();
    }

    public function getShortAddressAttribute()
    {
        if (empty($this->address)) {
            return 'N/A';
        }
        if (strlen($this->address) > 50) {
            return substr($this->address, 0, 50) . '...';
        }
        return $this->address;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Update total amount based on all items
     */
    public function updateTotalAmount()
    {
        $total = $this->items()->sum(DB::raw('quantity * price'));
        $this->update(['total_amount' => $total]);
        return $this;
    }

    /**
     * Get all items with formatted data
     */
    public function getItemsWithTotal()
    {
        return $this->items->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total' => $item->total,
                'formatted_price' => $item->formatted_price,
                'formatted_total' => $item->formatted_total
            ];
        });
    }

    /**
     * Get items summary (for quick view)
     */
    public function getItemsSummary()
    {
        return $this->items->map(function ($item) {
            return $item->name . ' x ' . $item->quantity;
        })->join(', ');
    }

    /**
     * Check if estimate is expired
     */
    public function isExpired()
    {
        return $this->valid_until < now();
    }

    /**
     * Check if estimate is active
     */
    public function isActive()
    {
        return $this->valid_until >= now();
    }

    /**
     * Get days until expiry
     */
    public function getDaysUntilExpiry()
    {
        if ($this->isExpired()) {
            return 0;
        }
        return now()->diffInDays($this->valid_until);
    }

    /**
     * Duplicate estimate with new number
     */
    public function duplicate()
    {
        $newEstimate = $this->replicate();
        $newEstimate->estimate_no = 'EST-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $newEstimate->created_at = now();
        $newEstimate->updated_at = now();
        $newEstimate->save();

        foreach ($this->items as $item) {
            $newItem = $item->replicate();
            $newItem->estimate_id = $newEstimate->id;
            $newItem->created_at = now();
            $newItem->updated_at = now();
            $newItem->save();
        }

        $newEstimate->updateTotalAmount();

        return $newEstimate;
    }

    /**
     * Get estimate data for PDF/Print
     */
    public function getPrintData()
    {
        return [
            'estimate' => $this,
            'items' => $this->items,
            'total' => $this->total_amount,
            'formatted_total' => $this->formatted_total,
            'status' => $this->status,
            'items_count' => $this->items_count,
            'total_items' => $this->total_items_count,
            'company_name' => $this->company_name ?? 'N/A',
            'vehicle' => $this->vehicle ?? 'N/A',
            'policy_number' => $this->policy_number ?? 'N/A',
            'color' => $this->color ?? 'N/A',
            'make' => $this->make ?? 'N/A',
            'vin' => $this->vin ?? 'N/A',
            'model' => $this->model ?? 'N/A',
            'engine_no' => $this->engine_no ?? 'N/A',
            'reg_no' => $this->reg_no ?? 'N/A',
            'address' => $this->address ?? 'N/A',
            'date' => $this->date,
            'valid_until' => $this->valid_until,
            'notes' => $this->notes,
            'creator_name' => $this->creator?->name ?? 'System'
        ];
    }

    /**
     * Search estimates by multiple fields
     */
    public static function search($query)
    {
        return self::where('estimate_no', 'LIKE', "%{$query}%")
            ->orWhere('company_name', 'LIKE', "%{$query}%")
            ->orWhere('vehicle', 'LIKE', "%{$query}%")
            ->orWhere('policy_number', 'LIKE', "%{$query}%")
            ->orWhere('reg_no', 'LIKE', "%{$query}%")
            ->orWhere('vin', 'LIKE', "%{$query}%")
            ->orWhere('model', 'LIKE', "%{$query}%")
            ->orWhere('engine_no', 'LIKE', "%{$query}%");
    }

    /**
     * Get statistics for dashboard
     */
    public static function getStatistics()
    {
        $total = self::count();
        $active = self::active()->count();
        $expired = self::expired()->count();
        $totalAmount = self::sum('total_amount');

        return [
            'total' => $total,
            'active' => $active,
            'expired' => $expired,
            'total_amount' => round($totalAmount, 2),
            'avg_amount' => $total > 0 ? round($totalAmount / $total, 2) : 0,
            'most_recent' => self::latest()->first()
        ];
    }

    // ============================================================
    // BOOT METHOD
    // ============================================================

    protected static function booted()
    {
        static::creating(function ($estimate) {
            if (empty($estimate->estimate_no)) {
                $estimate->estimate_no = 'EST-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
            }
        });

        static::created(function ($estimate) {
            \Log::info('Estimate created', [
                'estimate_id' => $estimate->id,
                'estimate_no' => $estimate->estimate_no,
                'company' => $estimate->company_name,
                'total' => $estimate->total_amount,
                'created_by' => $estimate->created_by
            ]);
        });

        static::updated(function ($estimate) {
            \Log::info('Estimate updated', [
                'estimate_id' => $estimate->id,
                'estimate_no' => $estimate->estimate_no,
                'changes' => $estimate->getChanges()
            ]);
        });

        static::deleted(function ($estimate) {
            \Log::info('Estimate deleted', [
                'estimate_id' => $estimate->id,
                'estimate_no' => $estimate->estimate_no
            ]);
        });
    }
}