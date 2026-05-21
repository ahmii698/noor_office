<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $table = 'services';
    
    // ✅ DISABLE timestamps - kyuki table mein created_at/updated_at columns nahi hain
    public $timestamps = false;
    
    protected $fillable = [
        'name', 
        'price', 
        'category', 
        'icon',
        'date_added'
    ];
    
    // ✅ Add casting for proper data types
    protected $casts = [
        'price' => 'decimal:2',
        'date_added' => 'datetime'
    ];
    
    // ✅ Optional: Add default values
    protected $attributes = [
        'icon' => 'tool',
        'price' => 0
    ];
    
    // ✅ Optional: Add accessor for formatted price
    public function getFormattedPriceAttribute()
    {
        return 'Rs. ' . number_format($this->price, 2);
    }
    
    // ✅ Optional: Add accessor for formatted date
    public function getFormattedDateAttribute()
    {
        return $this->date_added ? $this->date_added->format('d-m-Y') : null;
    }
    
    // ✅ Optional: Scope for active services
    public function scopeActive($query)
    {
        return $query->where('price', '>', 0);
    }
    
    // ✅ Optional: Scope by category
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }
}