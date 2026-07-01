<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeMonthlyRecord extends Model
{
    protected $fillable = [
        'employee_id',
        'month',
        'monthly_salary',
        'paid_amount',
        'balance_amount',
        'status'
    ];

    protected $casts = [
        'monthly_salary' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}