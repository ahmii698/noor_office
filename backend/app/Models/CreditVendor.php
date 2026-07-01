<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CreditVendor extends Model
{
    use HasFactory;

    protected $table = 'credit_vendors';

    protected $fillable = [
        'vendor_name',
        'products',
        'invoice_number',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'stock_quantity',
        'created_by'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'stock_quantity' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    // ============================================================
    // ✅ RELATIONSHIPS
    // ============================================================

    /**
     * Get all payments for this vendor
     */
    public function payments()
    {
        return $this->hasMany(CreditPayment::class, 'vendor_id')->orderBy('payment_date', 'desc');
    }

    /**
     * Get the user who created this vendor
     * ✅ FIX: 'created_by' references 'id' on users table, not 'name'
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ============================================================
    // ✅ ACCESSORS
    // ============================================================

    /**
     * Get creator name
     */
    public function getCreatorNameAttribute()
    {
        return $this->creator ? $this->creator->name : 'System';
    }

    /**
     * Get vendor name (already in fillable)
     */
    public function getVendorNameAttribute($value)
    {
        return ucwords($value);
    }

    /**
     * Get formatted total amount
     */
    public function getFormattedTotalAmountAttribute()
    {
        return 'Rs. ' . number_format($this->total_amount, 2);
    }

    /**
     * Get formatted paid amount
     */
    public function getFormattedPaidAmountAttribute()
    {
        return 'Rs. ' . number_format($this->paid_amount, 2);
    }

    /**
     * Get formatted balance amount
     */
    public function getFormattedBalanceAmountAttribute()
    {
        return 'Rs. ' . number_format($this->balance_amount, 2);
    }

    /**
     * Get payment percentage
     */
    public function getPaymentPercentageAttribute()
    {
        if ($this->total_amount == 0) return 0;
        return round(($this->paid_amount / $this->total_amount) * 100, 2);
    }

    /**
     * Get payment status label
     */
    public function getStatusAttribute()
    {
        if ($this->balance_amount <= 0) {
            return 'Paid';
        } elseif ($this->paid_amount > 0) {
            return 'Partial';
        } else {
            return 'Pending';
        }
    }

    /**
     * Get payment status color
     */
    public function getStatusColorAttribute()
    {
        if ($this->balance_amount <= 0) {
            return 'green';
        } elseif ($this->paid_amount > 0) {
            return 'yellow';
        } else {
            return 'red';
        }
    }

    /**
     * Get total payments count
     */
    public function getPaymentsCountAttribute()
    {
        return $this->payments()->count();
    }

    /**
     * Get last payment date
     */
    public function getLastPaymentDateAttribute()
    {
        $lastPayment = $this->payments()->latest('payment_date')->first();
        return $lastPayment ? $lastPayment->payment_date : null;
    }

    /**
     * Get formatted last payment date
     */
    public function getFormattedLastPaymentDateAttribute()
    {
        $date = $this->last_payment_date;
        return $date ? $date->format('d/m/Y') : 'No payments yet';
    }

    // ============================================================
    // ✅ MUTATORS
    // ============================================================

    /**
     * Set vendor name (auto-format)
     */
    public function setVendorNameAttribute($value)
    {
        $this->attributes['vendor_name'] = ucwords(trim($value));
    }

    // ============================================================
    // ✅ HELPER METHODS
    // ============================================================

    /**
     * Check if vendor has balance due
     */
    public function hasBalanceDue(): bool
    {
        return $this->balance_amount > 0;
    }

    /**
     * Check if vendor is fully paid
     */
    public function isFullyPaid(): bool
    {
        return $this->balance_amount <= 0;
    }

    /**
     * Get vendor summary
     */
    public function getSummary()
    {
        return [
            'id' => $this->id,
            'vendor_name' => $this->vendor_name,
            'products' => $this->products,
            'invoice_number' => $this->invoice_number,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'balance_amount' => (float) $this->balance_amount,
            'stock_quantity' => (int) $this->stock_quantity,
            'payment_percentage' => $this->payment_percentage,
            'status' => $this->status,
            'payments_count' => $this->payments_count,
            'last_payment_date' => $this->formatted_last_payment_date,
            'created_by' => $this->created_by,
            'creator_name' => $this->creator_name,
            'created_at' => $this->created_at->format('d/m/Y H:i'),
            'updated_at' => $this->updated_at ? $this->updated_at->format('d/m/Y H:i') : null,
        ];
    }

    // ============================================================
    // ✅ SCOPES
    // ============================================================

    /**
     * Scope a query to only include vendors with balance due
     */
    public function scopeWithBalanceDue($query)
    {
        return $query->where('balance_amount', '>', 0);
    }

    /**
     * Scope a query to only include fully paid vendors
     */
    public function scopeFullyPaid($query)
    {
        return $query->where('balance_amount', '<=', 0);
    }

    /**
     * Scope a query to only include partial paid vendors
     */
    public function scopePartialPaid($query)
    {
        return $query->where('paid_amount', '>', 0)
                     ->where('balance_amount', '>', 0);
    }

    /**
     * Scope a query to only include vendors with pending payments
     */
    public function scopePending($query)
    {
        return $query->where('paid_amount', 0)
                     ->where('balance_amount', '>', 0);
    }

    /**
     * Scope a query to search vendors
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('vendor_name', 'LIKE', "%{$search}%")
                     ->orWhere('invoice_number', 'LIKE', "%{$search}%")
                     ->orWhere('products', 'LIKE', "%{$search}%");
    }

    /**
     * Scope a query to order by latest created
     */
    public function scopeLatestFirst($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    // ============================================================
    // ✅ STATIC METHODS
    // ============================================================

    /**
     * Get vendor statistics
     */
    public static function getStatistics()
    {
        $totalVendors = self::count();
        $totalBalance = self::sum('balance_amount') ?? 0;
        $totalPaid = self::sum('paid_amount') ?? 0;
        $totalAmount = self::sum('total_amount') ?? 0;
        
        $pendingVendors = self::pending()->count();
        $fullyPaidVendors = self::fullyPaid()->count();
        $partialVendors = self::partialPaid()->count();

        return [
            'total_vendors' => $totalVendors,
            'total_amount' => (float) $totalAmount,
            'total_paid' => (float) $totalPaid,
            'total_balance' => (float) $totalBalance,
            'pending' => $pendingVendors,
            'fully_paid' => $fullyPaidVendors,
            'partial' => $partialVendors,
        ];
    }
}