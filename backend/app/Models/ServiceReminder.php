<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceReminder extends Model
{
    use HasFactory;

    protected $table = 'service_reminders';

    protected $fillable = [
        'invoice_no',
        'invoice_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'car_number',
        'service_type',
        'service_date',
        'reminder_date',
        'reminder_sent',
        'sent_at'
    ];

    protected $casts = [
        'service_date' => 'date',
        'reminder_date' => 'date',
        'reminder_sent' => 'boolean',
        'sent_at' => 'datetime'
    ];
}