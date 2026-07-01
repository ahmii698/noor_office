<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $fillable = [
        'name',
        'monthly_salary',
        'salary_date',
        'paid_amount',
        'balance_amount',
        'status',
        'created_by',
        'due_date'
    ];

    protected $casts = [
        'monthly_salary' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'salary_date' => 'integer',
        'due_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    // ✅ Payments relation
    public function payments(): HasMany
    {
        return $this->hasMany(EmployeePayment::class, 'employee_id');
    }

    // ✅ Monthly Records relation
    public function monthlyRecords(): HasMany
    {
        return $this->hasMany(EmployeeMonthlyRecord::class, 'employee_id');
    }

    // ✅ Get current month's record
    public function getCurrentMonthRecord()
    {
        $currentMonth = now()->format('Y-m');
        return $this->monthlyRecords()->where('month', $currentMonth)->first();
    }

    // ✅ Create or update monthly record
    public function updateMonthlyRecord()
    {
        $currentMonth = now()->format('Y-m');
        $record = $this->monthlyRecords()->where('month', $currentMonth)->first();
        
        if ($record) {
            $record->update([
                'monthly_salary' => $this->monthly_salary,
                'paid_amount' => $this->paid_amount,
                'balance_amount' => $this->balance_amount,
                'status' => $this->status,
            ]);
        } else {
            $this->monthlyRecords()->create([
                'month' => $currentMonth,
                'monthly_salary' => $this->monthly_salary,
                'paid_amount' => $this->paid_amount,
                'balance_amount' => $this->balance_amount,
                'status' => $this->status,
            ]);
        }
    }

    // ✅ Get history of all months
    public function getMonthlyHistory()
    {
        return $this->monthlyRecords()
            ->orderBy('month', 'desc')
            ->get();
    }

    // ✅ Update balance and monthly record
    public function updateBalance()
    {
        $this->paid_amount = $this->payments()->sum('amount');
        $this->balance_amount = $this->monthly_salary - $this->paid_amount;
        
        if ($this->balance_amount <= 0) {
            $this->status = 'Paid';
        } elseif ($this->paid_amount > 0) {
            $this->status = 'Partial';
        } else {
            $this->status = 'Pending';
        }
        
        $this->save();
        
        // ✅ Update monthly record
        $this->updateMonthlyRecord();
    }

    // ✅ Reset salary for new month (Keep previous month record safe)
    public function resetSalary()
    {
        // ✅ Before resetting, ensure current month record is saved
        $currentMonth = now()->format('Y-m');
        $record = $this->monthlyRecords()->where('month', $currentMonth)->first();
        
        if (!$record) {
            // ✅ If no record exists, create one with current data
            $this->monthlyRecords()->create([
                'month' => $currentMonth,
                'monthly_salary' => $this->monthly_salary,
                'paid_amount' => $this->paid_amount,
                'balance_amount' => $this->balance_amount,
                'status' => $this->status,
            ]);
        } else {
            // ✅ Update existing record with final values
            $record->update([
                'monthly_salary' => $this->monthly_salary,
                'paid_amount' => $this->paid_amount,
                'balance_amount' => $this->balance_amount,
                'status' => $this->status,
            ]);
        }

        // ✅ Reset for new month
        $this->paid_amount = 0;
        $this->balance_amount = $this->monthly_salary;
        $this->status = 'Pending';
        $this->save();

        // ✅ Create record for new month (after reset)
        $this->updateMonthlyRecord();
        
        return $this;
    }

    // ✅ Check if salary is due for this month
    public function isSalaryDue()
    {
        if (!$this->salary_date) return true;
        
        $today = now();
        $todayDay = $today->day;
        $lastDayOfMonth = $today->copy()->endOfMonth()->day;
        
        $effectiveSalaryDate = min($this->salary_date, $lastDayOfMonth);
        
        return $todayDay >= $effectiveSalaryDate;
    }

    // ✅ Get creator
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ✅ Get creator name
    public function getCreatorNameAttribute()
    {
        return $this->creator ? $this->creator->name : 'System';
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

    // ✅ Get payment percentage
    public function getPaymentPercentageAttribute()
    {
        if ($this->monthly_salary == 0) return 0;
        return round(($this->paid_amount / $this->monthly_salary) * 100, 2);
    }

    // ✅ Get salary date display
    public function getSalaryDateDisplayAttribute()
    {
        if (!$this->salary_date) return '-';
        
        $day = $this->salary_date;
        $suffix = $this->getDaySuffix($day);
        return "{$day}{$suffix} of every month";
    }

    // ✅ Get day suffix
    private function getDaySuffix($day)
    {
        if ($day >= 11 && $day <= 13) return 'th';
        switch ($day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    // ✅ Check if salary is due
    public function getIsDueAttribute()
    {
        if (!$this->salary_date) return false;
        
        $today = now();
        $todayDay = $today->day;
        $lastDayOfMonth = $today->copy()->endOfMonth()->day;
        $effectiveDate = min($this->salary_date, $lastDayOfMonth);
        
        return $todayDay >= $effectiveDate && $this->balance_amount > 0;
    }

    // ✅ Get summary
    public function getSummary()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'monthly_salary' => (float) $this->monthly_salary,
            'paid_amount' => (float) $this->paid_amount,
            'balance_amount' => (float) $this->balance_amount,
            'salary_date' => $this->salary_date,
            'salary_date_display' => $this->salary_date_display,
            'status' => $this->status,
            'is_due' => $this->is_due,
            'payment_percentage' => $this->payment_percentage,
            'payments_count' => $this->payments()->count(),
            'monthly_records_count' => $this->monthlyRecords()->count(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    // ✅ Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    public function scopePartial($query)
    {
        return $query->where('status', 'Partial');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'Paid');
    }

    public function scopeSearch($query, $search)
    {
        return $query->where('name', 'LIKE', "%{$search}%");
    }

    public function scopeWithBalance($query)
    {
        return $query->where('balance_amount', '>', 0);
    }
}