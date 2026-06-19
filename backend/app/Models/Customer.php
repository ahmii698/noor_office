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
        'car_number',
        'car_model',
        'birthday'  // ✅ New field
    ];

    protected $casts = [
        'birthday' => 'date',
    ];

    public function birthdayReminders()
    {
        return $this->hasMany(BirthdayReminder::class);
    }
}