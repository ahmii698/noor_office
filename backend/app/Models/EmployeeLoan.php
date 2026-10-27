<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeLoan extends Model
{
    protected $table = 'employee_loans';

    protected $fillable = [
        'employee_id',
        'amount',
        'loan_date',
        'note',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'loan_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}