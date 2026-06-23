<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'car_number',
        'car_model',
        'birthday'
    ];

    protected $casts = [
        'birthday' => 'date',
    ];

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}