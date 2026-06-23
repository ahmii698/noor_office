<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $table = 'invoice_items';
    
    protected $fillable = [
        'invoice_id', 
        'service_id', 
        'service_name', 
        'service_category',
        'quantity', 
        'price', 
        'total'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'total' => 'decimal:2',
        'quantity' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Enable automatic timestamp management
    public $timestamps = true;

    // ✅ Relationship with Invoice
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    // ✅ Relationship with Service (if service_id is not null)
    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    // ✅ Accessor to get customer name from invoice
    public function getCustomerNameAttribute()
    {
        return $this->invoice->customer_name ?? 'N/A';
    }

    // ✅ Accessor to get customer phone from invoice
    public function getCustomerPhoneAttribute()
    {
        return $this->invoice->customer_phone ?? 'N/A';
    }

    // ✅ Accessor to get car number from invoice
    public function getCarNumberAttribute()
    {
        return $this->invoice->customer_car_number ?? 'N/A';
    }

    // ✅ Accessor to get car model from invoice
    public function getCarModelAttribute()
    {
        return $this->invoice->customer_car_model ?? 'N/A';
    }

    // ✅ Scope to get tuning items
    public function scopeTuning($query)
    {
        return $query->where(function($q) {
            $q->where('service_name', 'LIKE', '%Tuning%')
              ->orWhere('service_name', 'LIKE', '%tuning%')
              ->orWhere('service_category', 'LIKE', '%Tuning%')
              ->orWhere('service_category', 'LIKE', '%tuning%');
        });
    }

    // ✅ Scope to get oil change items
    public function scopeOilChange($query)
    {
        return $query->where(function($q) {
            $q->where('service_name', 'LIKE', '%oil%')
              ->orWhere('service_name', 'LIKE', '%Oil%')
              ->orWhere('service_category', 'LIKE', '%oil%')
              ->orWhere('service_category', 'LIKE', '%Oil%');
        });
    }

    // ✅ Scope to get items older than 6 months
    public function scopeOlderThanSixMonths($query)
    {
        return $query->whereDate('created_at', '<=', now()->subMonths(6)->toDateString());
    }
}