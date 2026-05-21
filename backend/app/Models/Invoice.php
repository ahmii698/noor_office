<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $table = 'invoices';
    
    protected $fillable = [
        'invoice_no', 
        'customer_id', 
        'customer_name', 
        'customer_phone',
        'customer_car_number', 
        'customer_car_model', 
        'invoice_date',
        'total_amount', 
        'paid_amount', 
        'remaining_amount', 
        'payment_method', 
        'status'
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Enable timestamps (Laravel will automatically manage created_at and updated_at)
    public $timestamps = true;

    // Relationships
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }
}