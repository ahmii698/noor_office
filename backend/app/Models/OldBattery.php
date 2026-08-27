<?php
// app/Models/OldBattery.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OldBattery extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'battery_name',
        'trade_in_amount',
        'customer_name',
        'customer_phone',
        'note',
        'purchase_date'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'trade_in_amount' => 'decimal:2',
        'purchase_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the formatted trade-in amount.
     */
    public function getFormattedAmountAttribute()
    {
        return 'Rs. ' . number_format($this->trade_in_amount, 0);
    }

    /**
     * Get the customer name or default.
     */
    public function getCustomerNameAttribute($value)
    {
        return $value ?? 'Walk-in';
    }

    /**
     * Scope a query to filter by date range.
     */
    public function scopeDateBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('purchase_date', [$startDate, $endDate]);
    }

    /**
     * Scope a query to search by battery name or customer.
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('battery_name', 'LIKE', "%{$search}%")
                     ->orWhere('customer_name', 'LIKE', "%{$search}%")
                     ->orWhere('customer_phone', 'LIKE', "%{$search}%");
    }
}