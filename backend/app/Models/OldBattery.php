<?php
// app/Models/OldBattery.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OldBattery extends Model
{
    use HasFactory;

    protected $fillable = [
        'battery_name',
        'trade_in_amount',
        'selling_price',
        'profit',
        'customer_name',
        'customer_phone',
        'note',
        'status',
        'purchase_date',
        'sold_at',
        'sold_customer_name',
        'sold_customer_phone',
        'sold_invoice_no',
    ];

    protected $casts = [
        'trade_in_amount' => 'decimal:2',
        'selling_price'   => 'decimal:2',
        'profit'          => 'decimal:2',
        'purchase_date'   => 'datetime',
        'sold_at'         => 'datetime',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
    ];

    public function getFormattedAmountAttribute()
    {
        return 'Rs. ' . number_format($this->trade_in_amount, 0);
    }

    public function getCustomerNameAttribute($value)
    {
        return $value ?? 'Walk-in';
    }

    public function scopeDateBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('purchase_date', [$startDate, $endDate]);
    }

    public function scopeInStock($query)
    {
        return $query->where('status', 'in_stock');
    }

    public function scopeSold($query)
    {
        return $query->where('status', 'sold');
    }

    // Fixed: grouped so it doesn't break other filters
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('battery_name', 'LIKE', "%{$search}%")
              ->orWhere('customer_name', 'LIKE', "%{$search}%")
              ->orWhere('customer_phone', 'LIKE', "%{$search}%");
        });
    }
}