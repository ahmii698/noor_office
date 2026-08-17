<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeMonthlyRecord extends Model
{
    protected $table = 'employee_monthly_records';

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
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    // ✅ Relationship with Employee
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    // ✅ Get month name (e.g., "August 2026")
    public function getMonthNameAttribute()
    {
        if (!$this->month) return 'N/A';
        
        try {
            $date = \Carbon\Carbon::createFromFormat('Y-m', $this->month);
            return $date->format('F Y');
        } catch (\Exception $e) {
            return $this->month;
        }
    }

    // ✅ Get short month name (e.g., "Aug 2026")
    public function getMonthShortAttribute()
    {
        if (!$this->month) return 'N/A';
        
        try {
            $date = \Carbon\Carbon::createFromFormat('Y-m', $this->month);
            return $date->format('M Y');
        } catch (\Exception $e) {
            return $this->month;
        }
    }

    // ✅ Check if this is current month
    public function getIsCurrentMonthAttribute()
    {
        if (!$this->month) return false;
        return $this->month === now()->format('Y-m');
    }

    // ✅ Get formatted monthly salary
    public function getFormattedMonthlySalaryAttribute()
    {
        return 'Rs. ' . number_format($this->monthly_salary, 0);
    }

    // ✅ Get formatted paid amount
    public function getFormattedPaidAmountAttribute()
    {
        return 'Rs. ' . number_format($this->paid_amount, 0);
    }

    // ✅ Get formatted balance amount
    public function getFormattedBalanceAmountAttribute()
    {
        return 'Rs. ' . number_format($this->balance_amount, 0);
    }

    // ✅ Get status badge color
    public function getStatusColorAttribute()
    {
        switch ($this->status) {
            case 'Paid':
                return 'green';
            case 'Partial':
                return 'yellow';
            default:
                return 'red';
        }
    }

    // ✅ Get status badge class for frontend
    public function getStatusBadgeClassAttribute()
    {
        switch ($this->status) {
            case 'Paid':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Partial':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            default:
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        }
    }

    // ✅ Check if balance is negative (overpaid)
    public function getIsOverpaidAttribute()
    {
        return $this->balance_amount < 0;
    }

    // ✅ Get payment percentage
    public function getPaymentPercentageAttribute()
    {
        if ($this->monthly_salary == 0) return 0;
        return round(($this->paid_amount / $this->monthly_salary) * 100, 2);
    }

    // ✅ Scopes
    public function scopeCurrentMonth($query)
    {
        return $query->where('month', now()->format('Y-m'));
    }

    public function scopeByMonth($query, $month)
    {
        return $query->where('month', $month);
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'Paid');
    }

    public function scopePartial($query)
    {
        return $query->where('status', 'Partial');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeOrderByMonthDesc($query)
    {
        return $query->orderBy('month', 'desc');
    }
}