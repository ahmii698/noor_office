<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';
    
    protected $fillable = [
        'name', 
        'purchase_price', 
        'selling_price', 
        'quantity', 
        'date_added',
        'last_low_stock_notification'
    ];

    protected $casts = [
        'date_added' => 'date',
        'last_low_stock_notification' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public $timestamps = true;
}