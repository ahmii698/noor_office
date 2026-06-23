<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReminderMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_type',
        'message_template',
        'whatsapp_number',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];
}