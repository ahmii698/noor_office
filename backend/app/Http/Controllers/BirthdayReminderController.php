<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Carbon\Carbon;

class BirthdayReminderController extends Controller
{
    // ✅ Get all customers with birthday
    public function index()
    {
        $customers = Customer::whereNotNull('birthday')->get();
        return response()->json($customers);
    }

    // ✅ Get today's birthday reminders directly from customers table
    public function getTodayReminders()
    {
        $today = Carbon::today()->toDateString();
        
        // Directly fetch from customers table where birthday = today
        $birthdayCustomers = Customer::whereDate('birthday', $today)
            ->whereNotNull('birthday')
            ->get();
        
        return response()->json([
            'birthday_customers' => $birthdayCustomers,
            'pending_reminders' => []
        ]);
    }

    // ✅ Get pending birthday reminders
    public function getPendingReminders()
    {
        $today = Carbon::today()->toDateString();
        
        $pendingReminders = Customer::whereDate('birthday', $today)
            ->whereNotNull('birthday')
            ->get();
        
        return response()->json($pendingReminders);
    }

    // ❌ No longer needed - kept for compatibility
    public function checkAndResetReminders()
    {
        return response()->json([
            'success' => true,
            'message' => 'Birthdays are now fetched directly from customers table'
        ]);
    }

    // ❌ No longer needed - kept for compatibility
    public function addReminder(Request $request)
    {
        return response()->json([
            'success' => false,
            'message' => 'Birthday reminders are now fetched directly from customers table. Please update customer birthday directly.'
        ], 400);
    }

    // ❌ No longer needed - kept for compatibility
    public function syncBirthdayReminders()
    {
        return response()->json([
            'success' => true,
            'message' => 'Birthdays are now fetched directly from customers table. No sync needed.'
        ]);
    }

    // ❌ No longer needed - kept for compatibility
    public function markNotified($id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Birthday reminders are now fetched directly from customers table. No need to mark as notified.'
        ], 400);
    }

    // ❌ No longer needed - kept for compatibility
    public function deleteReminder($id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Birthday reminders are now fetched directly from customers table. Please update customer birthday directly.'
        ], 400);
    }
}