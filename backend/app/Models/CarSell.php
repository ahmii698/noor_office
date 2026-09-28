<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarSell extends Model
{
    protected $table = 'car_sells';

    protected $fillable = [
        'sell_date',
        'customer_name',
        'phone_no',
        'purchase_price',
        'selling_price',
        'profit',
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
        'sell_date' => 'date',
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'profit' => 'decimal:2',
        'running' => 'decimal:2',
    ];
}