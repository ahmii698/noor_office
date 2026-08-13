<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $table = 'invoices';
    
    protected $fillable = [
        'invoice_no', 
        'customer_id', 
        'customer_name', 
        'customer_phone',
        'customer_email',        // ✅ ADDED
        'customer_car_number', 
        'customer_car_model',
        'customer_birthday',     // ✅ ADDED
        'invoice_date',
        'subtotal',
        'discount',
        'discount_note',
        'total_amount', 
        'paid_amount', 
        'remaining_amount', 
        'payment_method', 
        'status',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'customer_birthday' => 'date',  // ✅ ADDED
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];

    // Enable timestamps (Laravel will automatically manage created_at and updated_at)
    public $timestamps = true;

    // Relationships
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    // Relationship with User who created this invoice
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Accessor for creator name
    public function getCreatorNameAttribute()
    {
        return $this->creator ? $this->creator->name : 'System';
    }

    // Accessor for creator role
    public function getCreatorRoleAttribute()
    {
        return $this->creator ? $this->creator->role : 'system';
    }

    // ✅ Accessor for formatted discount
    public function getFormattedDiscountAttribute()
    {
        return $this->discount > 0 ? 'Rs. ' . number_format($this->discount, 2) : 'None';
    }

    // ✅ Accessor for formatted subtotal
    public function getFormattedSubtotalAttribute()
    {
        return 'Rs. ' . number_format($this->subtotal, 2);
    }

    // ✅ Check if discount was applied
    public function getHasDiscountAttribute()
    {
        return $this->discount > 0;
    }

    // ✅ NEW - Get formatted birthday (MM/DD/YYYY)
    public function getFormattedBirthdayAttribute()
    {
        if (!$this->customer_birthday) return 'Not Provided';
        return $this->customer_birthday->format('m/d/Y');
    }

    // ✅ NEW - Check if customer has birthday today
    public function getIsBirthdayTodayAttribute()
    {
        if (!$this->customer_birthday) return false;
        $today = now();
        return $this->customer_birthday->month == $today->month && 
               $this->customer_birthday->day == $today->day;
    }

    // ✅ NEW - Get customer age
    public function getCustomerAgeAttribute()
    {
        if (!$this->customer_birthday) return null;
        return $this->customer_birthday->age;
    }

    // ✅ NEW - Get upcoming birthday (next occurrence)
    public function getNextBirthdayAttribute()
    {
        if (!$this->customer_birthday) return null;
        $birthday = $this->customer_birthday;
        $next = \Carbon\Carbon::create(now()->year, $birthday->month, $birthday->day);
        if ($next->isPast()) {
            $next->addYear();
        }
        return $next;
    }

    // ✅ NEW - Get days until next birthday
    public function getDaysUntilBirthdayAttribute()
    {
        $next = $this->next_birthday;
        if (!$next) return null;
        return now()->diffInDays($next);
    }

    // ✅ NEW - Get formatted customer info
    public function getCustomerInfoAttribute()
    {
        $info = $this->customer_name;
        if ($this->customer_phone) {
            $info .= ' (' . $this->customer_phone . ')';
        }
        if ($this->customer_car_number) {
            $info .= ' - ' . $this->customer_car_number;
        }
        return $info;
    }

    // ✅ Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'Pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'Paid');
    }

    public function scopePartial($query)
    {
        return $query->where('status', 'Partial');
    }

    public function scopeByCustomer($query, $phone)
    {
        return $query->where('customer_phone', $phone);
    }

    public function scopeByDateRange($query, $start, $end)
    {
        return $query->whereBetween('invoice_date', [$start, $end]);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('invoice_date', now()->toDateString());
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('invoice_date', now()->month)
                     ->whereYear('invoice_date', now()->year);
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('invoice_date', [
            now()->startOfWeek()->toDateString(),
            now()->endOfWeek()->toDateString()
        ]);
    }

    public function scopeThisYear($query)
    {
        return $query->whereYear('invoice_date', now()->year);
    }

    // ✅ Search by invoice number, customer name, phone
    public function scopeSearch($query, $search)
    {
        return $query->where('invoice_no', 'LIKE', "%{$search}%")
                     ->orWhere('customer_name', 'LIKE', "%{$search}%")
                     ->orWhere('customer_phone', 'LIKE', "%{$search}%")
                     ->orWhere('customer_car_number', 'LIKE', "%{$search}%");
    }

    // ✅ Get total statistics
    public static function getStatistics()
    {
        return [
            'total_invoices' => self::count(),
            'total_revenue' => (float) self::sum('total_amount'),
            'total_paid' => (float) self::sum('paid_amount'),
            'total_remaining' => (float) self::sum('remaining_amount'),
            'total_discount' => (float) self::sum('discount'),
            'pending_count' => self::pending()->count(),
            'paid_count' => self::paid()->count(),
            'partial_count' => self::partial()->count(),
            'today_revenue' => (float) self::today()->sum('total_amount'),
            'this_month_revenue' => (float) self::thisMonth()->sum('total_amount'),
            'this_year_revenue' => (float) self::thisYear()->sum('total_amount'),
        ];
    }

    // ✅ Get birthday customers today
    public static function getBirthdayCustomersToday()
    {
        $today = now();
        return self::whereMonth('customer_birthday', $today->month)
                   ->whereDay('customer_birthday', $today->day)
                   ->get();
    }
}