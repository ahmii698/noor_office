<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeLoanPayment extends Model
{
    protected $table = 'employee_loan_payments';

    protected $fillable = [
        'employee_id',
        'amount',
        'payment_date',
        'note',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}