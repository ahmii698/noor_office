<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePayment extends Model
{
    protected $fillable = [
        'employee_id',
        'amount',
        'payment_date',
        'note',
        'created_by'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    // ✅ Creator relationship
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ✅ Get creator name
    public function getCreatorNameAttribute()
    {
        return $this->creator ? $this->creator->name : 'System';
    }

    // ✅ Get formatted amount
    public function getFormattedAmountAttribute()
    {
        return 'Rs. ' . number_format($this->amount, 0);
    }

    // ✅ Get formatted date
    public function getFormattedDateAttribute()
    {
        return $this->payment_date ? $this->payment_date->format('d/m/Y') : null;
    }

    // ✅ Get formatted date with time
    public function getFormattedDateTimeAttribute()
    {
        return $this->payment_date ? $this->payment_date->format('d/m/Y h:i A') : null;
    }

    // ✅ When payment is created or deleted, update balance and monthly record
    protected static function booted()
    {
        static::created(function ($payment) {
            $payment->employee->updateBalance();
        });

        static::updated(function ($payment) {
            $payment->employee->updateBalance();
        });

        static::deleted(function ($payment) {
            $payment->employee->updateBalance();
        });
    }
}