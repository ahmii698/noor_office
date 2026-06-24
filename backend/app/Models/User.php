<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // ✅ Check if user is admin
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    // ✅ Check if user is employee
    public function isEmployee()
    {
        return $this->role === 'employee';
    }

    // ✅ Check if user has specific role
    public function hasRole($role)
    {
        return $this->role === $role;
    }

    // ✅ Check if user has permission (admin can do everything, employee only view)
    public function hasPermission($permission)
    {
        // Admin has all permissions
        if ($this->isAdmin()) {
            return true;
        }

        // Employee permissions (view only)
        $viewPermissions = [
            'view_invoices',
            'view_products', 
            'view_customers',
            'view_reminders',
            'view_dashboard',
            'view_records',
            'view_finance',
        ];

        return in_array($permission, $viewPermissions);
    }
}