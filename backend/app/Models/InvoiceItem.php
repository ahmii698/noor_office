<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $table = 'invoice_items';
    
    protected $fillable = [
        'invoice_id', 
        'service_id', 
        'service_name', 
        'service_category',
        'mileage',        // ✅ ADDED
        'quantity', 
        'price', 
        'total'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'total' => 'decimal:2',
        'quantity' => 'integer',
        'mileage' => 'integer',  // ✅ ADDED
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Enable automatic timestamp management
    public $timestamps = true;

    // ✅ Relationship with Invoice
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    // ✅ Relationship with Service (if service_id is not null)
    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    // ✅ Accessor to get customer name from invoice
    public function getCustomerNameAttribute()
    {
        return $this->invoice->customer_name ?? 'N/A';
    }

    // ✅ Accessor to get customer phone from invoice
    public function getCustomerPhoneAttribute()
    {
        return $this->invoice->customer_phone ?? 'N/A';
    }

    // ✅ Accessor to get car number from invoice
    public function getCarNumberAttribute()
    {
        return $this->invoice->customer_car_number ?? 'N/A';
    }

    // ✅ Accessor to get car model from invoice
    public function getCarModelAttribute()
    {
        return $this->invoice->customer_car_model ?? 'N/A';
    }

    // ✅ Accessor for formatted mileage
    public function getFormattedMileageAttribute()
    {
        if (!$this->mileage) return 'Not recorded';
        return number_format($this->mileage) . ' km';
    }

    // ✅ Check if this is an oil change service
    public function getIsOilChangeAttribute()
    {
        $keywords = ['oil', 'engine oil', 'oil change', 'oil filter', 'oil service'];
        $name = strtolower($this->service_name ?? '');
        $category = strtolower($this->service_category ?? '');
        
        foreach ($keywords as $keyword) {
            if (strpos($name, $keyword) !== false || strpos($category, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    // ✅ Check if this is a tuning service
    public function getIsTuningAttribute()
    {
        $keywords = ['tuning', 'tune up', 'engine tuning'];
        $name = strtolower($this->service_name ?? '');
        $category = strtolower($this->service_category ?? '');
        
        foreach ($keywords as $keyword) {
            if (strpos($name, $keyword) !== false || strpos($category, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    // ✅ Get item total with proper formatting
    public function getFormattedTotalAttribute()
    {
        return 'Rs. ' . number_format($this->total, 2);
    }

    // ✅ Get item price with proper formatting
    public function getFormattedPriceAttribute()
    {
        return 'Rs. ' . number_format($this->price, 2);
    }

    // ✅ Get customer info from invoice
    public function getCustomerInfoAttribute()
    {
        $inv = $this->invoice;
        if (!$inv) return 'N/A';
        $info = $inv->customer_name ?? 'Guest';
        if ($inv->customer_phone) {
            $info .= ' (' . $inv->customer_phone . ')';
        }
        return $info;
    }

    // ✅ Get car info from invoice
    public function getCarInfoAttribute()
    {
        $inv = $this->invoice;
        if (!$inv) return 'N/A';
        $info = $inv->customer_car_number ?? 'No car';
        if ($inv->customer_car_model) {
            $info .= ' - ' . $inv->customer_car_model;
        }
        return $info;
    }

    // ✅ Get item summary with mileage
    public function getSummaryAttribute()
    {
        $summary = $this->service_name;
        if ($this->mileage) {
            $summary .= ' (Mileage: ' . number_format($this->mileage) . ' km)';
        }
        return $summary;
    }

    // ============================================================
    // ✅ SCOPES
    // ============================================================

    // ✅ Scope to get tuning items
    public function scopeTuning($query)
    {
        return $query->where(function($q) {
            $q->where('service_name', 'LIKE', '%Tuning%')
              ->orWhere('service_name', 'LIKE', '%tuning%')
              ->orWhere('service_category', 'LIKE', '%Tuning%')
              ->orWhere('service_category', 'LIKE', '%tuning%');
        });
    }

    // ✅ Scope to get oil change items
    public function scopeOilChange($query)
    {
        return $query->where(function($q) {
            $q->where('service_name', 'LIKE', '%oil%')
              ->orWhere('service_name', 'LIKE', '%Oil%')
              ->orWhere('service_category', 'LIKE', '%oil%')
              ->orWhere('service_category', 'LIKE', '%Oil%');
        });
    }

    // ✅ Scope to get items with mileage recorded
    public function scopeWithMileage($query)
    {
        return $query->whereNotNull('mileage');
    }

    // ✅ Scope to get items without mileage
    public function scopeWithoutMileage($query)
    {
        return $query->whereNull('mileage');
    }

    // ✅ Scope to get items older than 6 months
    public function scopeOlderThanSixMonths($query)
    {
        return $query->whereDate('created_at', '<=', now()->subMonths(6)->toDateString());
    }

    // ✅ Scope to get items by service category
    public function scopeByCategory($query, $category)
    {
        return $query->where('service_category', $category);
    }

    // ✅ Scope to search items by name
    public function scopeSearch($query, $search)
    {
        return $query->where('service_name', 'LIKE', "%{$search}%");
    }

    // ============================================================
    // ✅ STATIC METHODS
    // ============================================================

    // ✅ Get all oil change items with mileage
    public static function getOilChangesWithMileage()
    {
        return self::oilChange()
                   ->withMileage()
                   ->with('invoice')
                   ->orderBy('created_at', 'desc')
                   ->get();
    }

    // ✅ Get statistics for items
    public static function getStatistics()
    {
        return [
            'total_items' => self::count(),
            'total_revenue' => (float) self::sum('total'),
            'total_quantity' => (int) self::sum('quantity'),
            'oil_changes' => self::oilChange()->count(),
            'tuning_items' => self::tuning()->count(),
            'with_mileage' => self::withMileage()->count(),
            'without_mileage' => self::withoutMileage()->count(),
        ];
    }
}