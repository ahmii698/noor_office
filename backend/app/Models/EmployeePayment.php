<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePayment extends Model
{
    protected $table = 'employee_payments';

    protected $fillable = [
        'employee_id',
        'amount',
        'payment_date',
        'for_month',   // ✅ NEW: which salary month this payment is for, e.g. '2026-05'
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

    // ✅ Relationship with Employee
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    // ✅ Creator relationship (User who created this payment)
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

    // ✅ Get formatted date only (d/m/Y)
    public function getFormattedDateAttribute()
    {
        if (!$this->payment_date) return 'N/A';
        return $this->payment_date->format('d/m/Y');
    }

    // ✅ Get formatted time only (h:i A)
    public function getFormattedTimeAttribute()
    {
        if (!$this->payment_date) return 'N/A';
        return $this->payment_date->format('h:i A');
    }

    // ✅ Get formatted date with time (d/m/Y h:i A)
    public function getFormattedDateTimeAttribute()
    {
        if (!$this->payment_date) return 'N/A';
        return $this->payment_date->format('d/m/Y h:i A');
    }

    // ✅ Get date for API (Y-m-d)
    public function getDateForApiAttribute()
    {
        if (!$this->payment_date) return null;
        return $this->payment_date->format('Y-m-d');
    }

    // ✅ NEW: Get the salary month name for display (e.g. "May 2026")
    public function getForMonthNameAttribute()
    {
        if (!$this->for_month) return 'N/A';
        try {
            $date = \Carbon\Carbon::createFromFormat('Y-m', $this->for_month);
            return $date->format('F Y');
        } catch (\Exception $e) {
            return $this->for_month;
        }
    }

    // ✅ Get note or default
    public function getNoteDisplayAttribute()
    {
        return $this->note ?? 'Salary payment';
    }

    // ✅ Check if payment is from current month (based on payment_date, not for_month)
    public function getIsCurrentMonthAttribute()
    {
        if (!$this->payment_date) return false;
        return $this->payment_date->format('Y-m') === now()->format('Y-m');
    }

    // ✅ Scopes
    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeByDateRange($query, $start, $end)
    {
        return $query->whereBetween('payment_date', [$start, $end]);
    }

    public function scopeCurrentMonth($query)
    {
        return $query->whereYear('payment_date', now()->year)
                     ->whereMonth('payment_date', now()->month);
    }

    // ✅ NEW: Filter payments by which salary month they were FOR
    public function scopeForMonth($query, $month)
    {
        return $query->where('for_month', $month);
    }

    public function scopeOrderByDateDesc($query)
    {
        return $query->orderBy('payment_date', 'desc');
    }

    // ✅ Boot method to auto-update employee balance
    // Still fires on every create/update/delete — but Employee::updateBalance()
    // itself has been rewritten to sum ACROSS ALL MONTHS (not just current cycle),
    // so this stays correct no matter which for_month a payment belongs to.
    protected static function booted()
    {
        static::created(function ($payment) {
            if ($payment->employee) {
                $payment->employee->updateBalance();
            }
        });

        static::updated(function ($payment) {
            if ($payment->employee) {
                $payment->employee->updateBalance();
            }
        });

        static::deleted(function ($payment) {
            if ($payment->employee) {
                $payment->employee->updateBalance();
            }
        });
    }
}