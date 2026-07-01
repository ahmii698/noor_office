<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditPayment extends Model
{
    use HasFactory;

    protected $table = 'credit_payments';

    // ✅ Enable timestamps (table has created_at and updated_at)
    public $timestamps = true;

    protected $fillable = [
        'vendor_id',
        'amount',
        'payment_date',
        'note',
        'created_by'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ============================================================
    // ✅ RELATIONSHIPS
    // ============================================================

    /**
     * Get the vendor for this payment
     */
    public function vendor()
    {
        return $this->belongsTo(CreditVendor::class, 'vendor_id');
    }

    /**
     * Get the user who created this payment
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
     * Get formatted amount
     */
    public function getFormattedAmountAttribute()
    {
        return 'Rs. ' . number_format($this->amount, 2);
    }

    /**
     * Get formatted payment date
     */
    public function getFormattedDateAttribute()
    {
        return $this->payment_date ? $this->payment_date->format('d/m/Y') : null;
    }

    /**
     * Get formatted payment date with time
     */
    public function getFormattedDateTimeAttribute()
    {
        return $this->payment_date ? $this->payment_date->format('d/m/Y h:i A') : null;
    }

    /**
     * Get vendor name directly
     */
    public function getVendorNameAttribute()
    {
        return $this->vendor ? $this->vendor->vendor_name : null;
    }

    // ============================================================
    // ✅ SCOPES
    // ============================================================

    /**
     * Scope a query to only include payments for a specific vendor
     */
    public function scopeForVendor($query, $vendorId)
    {
        return $query->where('vendor_id', $vendorId);
    }

    /**
     * Scope a query to only include payments within a date range
     */
    public function scopeBetweenDates($query, $start, $end)
    {
        return $query->whereBetween('payment_date', [$start, $end]);
    }

    /**
     * Scope a query to order by payment date descending (latest first)
     */
    public function scopeLatestFirst($query)
    {
        return $query->orderBy('payment_date', 'desc');
    }
}