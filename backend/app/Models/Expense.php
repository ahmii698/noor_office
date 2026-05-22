<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $table = 'expenses';
    
    protected $fillable = [
        'description', 
        'amount', 
        'expense_date', 
        'type', 
        'category',
        'is_recurring',
        'recurring_type',
        'last_paid_date',
        'next_payment_date'
    ];

    protected $casts = [
        'expense_date' => 'date',
        'last_paid_date' => 'date',
        'next_payment_date' => 'date',
        'is_recurring' => 'integer',
        'amount' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public $timestamps = true;
}