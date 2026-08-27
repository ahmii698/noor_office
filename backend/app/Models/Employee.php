<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Employee extends Model
{
    protected $table = 'employees';

    protected $fillable = [
        'name',
        'monthly_salary',
        'salary_date',
        'join_date',
        'paid_amount',
        'balance_amount',
        'status',
        'created_by',
        'due_date',
        'manual_cycles_added', // ✅ NEW: manual "Restart Month" counter
    ];

    protected $casts = [
        'monthly_salary' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'salary_date' => 'integer',
        'join_date' => 'date',
        'due_date' => 'date',
        'manual_cycles_added' => 'integer', // ✅ NEW
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    // ✅ Payments relation
    public function payments(): HasMany
    {
        return $this->hasMany(EmployeePayment::class, 'employee_id');
    }

    // ✅ Monthly Records relation (kept for backward compatibility — not required by the new system)
    public function monthlyRecords(): HasMany
    {
        return $this->hasMany(EmployeeMonthlyRecord::class, 'employee_id');
    }

    // =========================================================================
    // ✅ MONTH-BASED SALARY SYSTEM
    // =========================================================================

    /**
     * Get list of every salary month from join_date to the current month.
     * ✅ UPDATED: "now" can be manually pushed forward via manual_cycles_added
     * (the Restart Month button), so an admin can force a new month to start
     * before its calendar month naturally arrives.
     */
    public function getMonthsSinceJoinList(): array
    {
        if (!$this->join_date) {
            return [now()->format('Y-m')];
        }

        $months = [];
        $cursor = $this->join_date->copy()->startOfMonth();
        $end = now()->addMonths($this->manual_cycles_added ?? 0)->startOfMonth();

        while ($cursor->lte($end)) {
            $months[] = $cursor->format('Y-m');
            $cursor->addMonth();
        }

        return $months;
    }

    /**
     * ✅ NEW: Shared calculation used by getMonthlyBreakdown() and
     * getAdvanceBalanceAttribute(). Builds the month-by-month breakdown
     * AND applies any unspent advance payments to the oldest unpaid
     * month(s) first, returning whatever advance is left over.
     */
    private function computeBreakdownAndAdvance()
    {
        $months = $this->getMonthsSinceJoinList(); // ascending, oldest first
        $currentMonth = now()->format('Y-m');
        $salary = (float) $this->monthly_salary;

        $paidByMonth = $this->payments()
            ->whereNotNull('for_month')
            ->selectRaw('for_month, SUM(amount) as total')
            ->groupBy('for_month')
            ->pluck('total', 'for_month');

        // ✅ Total advance pool (payments not tied to a specific month)
        $advancePool = (float) $this->payments()
            ->where('is_advance', true)
            ->sum('amount');

        $breakdown = collect();

        foreach ($months as $month) {
            $paid = (float) ($paidByMonth[$month] ?? 0);
            $balance = $salary - $paid;

            // ✅ Apply leftover advance to this month if it still owes something
            if ($balance > 0 && $advancePool > 0) {
                $applied = min($balance, $advancePool);
                $paid += $applied;
                $balance -= $applied;
                $advancePool -= $applied;
            }

            if ($balance <= 0) {
                $status = 'Paid';
            } elseif ($paid > 0) {
                $status = 'Partial';
            } else {
                $status = 'Pending';
            }

            $date = Carbon::createFromFormat('Y-m', $month);

            $breakdown->push([
                'month' => $month,
                'month_name' => $date->format('F Y'),
                'monthly_salary' => $salary,
                'paid_amount' => round($paid, 2),
                'balance_amount' => round($balance, 2),
                'status' => $status,
                'is_current_month' => $month === $currentMonth,
            ]);
        }

        return [$breakdown->sortByDesc('month')->values(), round($advancePool, 2)];
    }

    /**
     * Full month-by-month breakdown for the History view.
     * Every month from join_date to now (+ manual cycles) shows up,
     * with advance payments already applied against unpaid months.
     */
    public function getMonthlyBreakdown()
    {
        [$breakdown, ] = $this->computeBreakdownAndAdvance();
        return $breakdown;
    }

    /**
     * List of months that still have an outstanding balance
     * (used to populate the "which month are you paying?" dropdown).
     * Oldest unpaid month first, so Ahmii pays in order.
     */
    public function getUnpaidMonths()
    {
        return $this->getMonthlyBreakdown()
            ->filter(fn($m) => $m['balance_amount'] > 0)
            ->sortBy('month')
            ->values();
    }

    /**
     * ✅ NEW: Advance amount given but not yet consumed by any owed month
     * (e.g. gave 5000 advance but current month is already fully paid —
     * this sits here and auto-applies the moment a new month appears).
     */
    public function getAdvanceBalanceAttribute()
    {
        [, $advance] = $this->computeBreakdownAndAdvance();
        return $advance;
    }

    // =========================================================================
    // Balance = total owed across ALL months since join (incl. manual cycles),
    // minus total paid across all time (for_month payments + advance payments).
    // =========================================================================
    public function updateBalance()
    {
        $monthsSinceJoin = $this->getMonthsSinceJoinList();
        $totalDue = (float) $this->monthly_salary * count($monthsSinceJoin);
        $totalPaid = (float) $this->payments()->sum('amount');

        $this->paid_amount = $totalPaid;
        $this->balance_amount = $totalDue - $totalPaid;

        if ($this->balance_amount <= 0) {
            $this->status = 'Paid';
        } elseif ($this->paid_amount > 0) {
            $this->status = 'Partial';
        } else {
            $this->status = 'Pending';
        }

        $this->save();
    }

    /**
     * ✅ NEW: Manually force the next salary month to start now,
     * regardless of calendar date. Called by the Restart Month button.
     */
    public function forceNextMonth()
    {
        $this->manual_cycles_added = ($this->manual_cycles_added ?? 0) + 1;
        $this->save();
        $this->updateBalance();
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

    // ✅ Get formatted paid amount (all-time total)
    public function getFormattedPaidAmountAttribute()
    {
        return 'Rs. ' . number_format($this->paid_amount, 0);
    }

    // ✅ Get formatted balance amount
    public function getFormattedBalanceAmountAttribute()
    {
        return 'Rs. ' . number_format($this->balance_amount, 0);
    }

    // ✅ Get payment percentage (against total due since join, not just one month)
    public function getPaymentPercentageAttribute()
    {
        $monthsSinceJoin = $this->getMonthsSinceJoinList();
        $totalDue = (float) $this->monthly_salary * count($monthsSinceJoin);
        if ($totalDue == 0) return 0;
        return round(($this->paid_amount / $totalDue) * 100, 2);
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

    // ✅ Get formatted join date
    public function getFormattedJoinDateAttribute()
    {
        return $this->join_date ? $this->join_date->format('d-m-Y') : '-';
    }

    // ✅ Get join date for display
    public function getJoinDateDisplayAttribute()
    {
        if (!$this->join_date) return '-';
        return $this->join_date->format('d/m/Y');
    }

    // ✅ Get months since joined (count)
    public function getMonthsSinceJoinedAttribute()
    {
        return count($this->getMonthsSinceJoinList());
    }

    // ✅ Get total paid (all time) - for history view
    public function getTotalPaidAllTimeAttribute()
    {
        return $this->payments()->sum('amount');
    }

    // ✅ Get summary with join date
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
            'join_date' => $this->join_date,
            'join_date_display' => $this->join_date_display,
            'status' => $this->status,
            'is_due' => $this->is_due,
            'payment_percentage' => $this->payment_percentage,
            'payments_count' => $this->payments()->count(),
            'total_paid_all_time' => (float) $this->total_paid_all_time,
            'advance_balance' => (float) $this->advance_balance,
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

    // ✅ Scope to get employees by join date
    public function scopeJoinedAfter($query, $date)
    {
        return $query->where('join_date', '>=', $date);
    }

    public function scopeJoinedBefore($query, $date)
    {
        return $query->where('join_date', '<=', $date);
    }

    // ✅ Scope to get employees joined in current month
    public function scopeJoinedThisMonth($query)
    {
        return $query->whereYear('join_date', now()->year)
                     ->whereMonth('join_date', now()->month);
    }
}