<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BirthdayReminder extends Model
{
    use HasFactory;

    protected $table = 'birthday_reminders';

    protected $fillable = [
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'birthday_date',
        'is_notified'
    ];

    protected $casts = [
        'birthday_date' => 'date',
        'is_notified' => 'boolean'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}