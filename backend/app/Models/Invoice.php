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
        'subtotal',           // ✅ NEW - Discount se pehle ka total
        'discount',           // ✅ NEW - Discount amount
        'discount_note',      // ✅ NEW - Discount note (optional)
        'total_amount', 
        'paid_amount', 
        'remaining_amount', 
        'payment_method', 
        'status',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'subtotal' => 'decimal:2',      // ✅ NEW
        'discount' => 'decimal:2',      // ✅ NEW
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
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

    // Relationship with User who created this invoice
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Accessor for creator name
    public function getCreatorNameAttribute()
    {
        return $this->creator ? $this->creator->name : 'System';
    }

    // Accessor for creator role
    public function getCreatorRoleAttribute()
    {
        return $this->creator ? $this->creator->role : 'system';
    }

    // ✅ NEW - Accessor for formatted discount
    public function getFormattedDiscountAttribute()
    {
        return $this->discount > 0 ? 'Rs. ' . number_format($this->discount, 2) : 'None';
    }

    // ✅ NEW - Accessor for formatted subtotal
    public function getFormattedSubtotalAttribute()
    {
        return 'Rs. ' . number_format($this->subtotal, 2);
    }

    // ✅ NEW - Check if discount was applied
    public function getHasDiscountAttribute()
    {
        return $this->discount > 0;
    }
}