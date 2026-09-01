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
        'sell_date' => 'date',
        'selling_price' => 'decimal:2',
        'running' => 'decimal:2',
    ];
}