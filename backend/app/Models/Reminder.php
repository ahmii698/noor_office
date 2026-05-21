<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reminder extends Model
{
    use HasFactory;

    protected $table = 'reminders';
    protected $fillable = ['type', 'reminder_date', 'description', 'amount', 'recurring', 'is_active'];

    protected $casts = [
        'reminder_date' => 'date',
        'is_active' => 'boolean',
    ];
}