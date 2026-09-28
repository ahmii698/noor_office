<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarPurchase extends Model
{
    protected $table = 'car_purchases';

    protected $fillable = [
        'purchase_date',
        'customer_name',
        'phone_no',
        'selling_price',
        'make',
        'model',
        'vin',
        'engine_no',
        'color',
        'reg_no',
        'running',
        'dent',
        'type',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'selling_price' => 'decimal:2',
        'running' => 'decimal:2',
    ];
}