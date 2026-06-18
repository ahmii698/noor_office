<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BirthdayReminderSetting extends Model
{
    use HasFactory;

    protected $table = 'birthday_reminder_settings';

    protected $fillable = ['last_reset_date'];

    protected $casts = [
        'last_reset_date' => 'date'
    ];
}