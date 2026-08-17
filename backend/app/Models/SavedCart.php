<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavedCart extends Model
{
    protected $table = 'saved_carts';

    protected $fillable = [
        'user_id',
        'session_id',
        'customer_phone',
        'customer_name',
        'customer_email',
        'customer_car_number',
        'customer_car_model',
        'customer_birthday',
        'cart_items',
        'cart_summary',
        'status',
        'discarded_at'
    ];

    protected $casts = [
        'cart_items' => 'array',
        'cart_summary' => 'array',
        'discarded_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationship with User
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scope for pending status
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    // Scope for completed status
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}