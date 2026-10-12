<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductHistory extends Model
{
    protected $table = 'product_histories';

    protected $fillable = [
        'product_id',
        'product_name',
        'action',
        'changes',
        'user_id',
        'user_name',
    ];

    // changes JSON text ko array bana kar deta hai (aur save karte waqt JSON bana deta hai)
    protected $casts = [
        'changes' => 'array',
    ];
}