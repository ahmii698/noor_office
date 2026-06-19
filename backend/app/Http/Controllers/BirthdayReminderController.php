<?php

namespace App\Http\Controllers;

use App\Models\BirthdayReminder;
use App\Models\BirthdayReminderSetting;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BirthdayReminderController extends Controller
{
    public function index()
    {
        $reminders = BirthdayReminder::orderBy('created_at', 'desc')->get();
        return response()->json($reminders);
    }

    // ✅ DEBUG VERSION
    public function getTodayReminders()
    {
        $today = Carbon::today()->toDateString();
        
        // ✅ Hardcoded for test
        // $today = '2026-06-19';
        
        // ✅ Debug Info
        $debug = [
            'carbon_today' => $today,
            'server_date' => date('Y-m-d'),
            'php_timezone' => date_default_timezone_get(),
            'customer_birthday' => DB::select("SELECT id, name, birthday FROM customers WHERE id = 1")
        ];
        
        $birthdayCustomers = DB::select("
            SELECT * FROM customers 
            WHERE DATE(birthday) = ? 
            AND birthday IS NOT NULL
        ", [$today]);
        
        $pendingReminders = BirthdayReminder::whereDate('birthday_date', $today)
            ->where('is_notified', false)
            ->get();
        
        return response()->json([
            'birthday_customers' => $birthdayCustomers,
            'pending_reminders' => $pendingReminders,
            'debug' => $debug,
            'query' => "SELECT * FROM customers WHERE DATE(birthday) = '$today' AND birthday IS NOT NULL"
        ]);
    }

    public function getPendingReminders()
    {
        $pendingReminders = BirthdayReminder::where('is_notified', false)
            ->whereDate('birthday_date', '>=', Carbon::today())
            ->orderBy('birthday_date', 'asc')
            ->get();
        
        return response()->json($pendingReminders);
    }

    public function checkAndResetReminders()
    {
        $today = Carbon::today()->toDateString();
        $setting = BirthdayReminderSetting::first();
        
        if (!$setting) {
            $setting = BirthdayReminderSetting::create(['last_reset_date' => $today]);
        }
        
        if ($setting->last_reset_date !== $today) {
            BirthdayReminder::where('is_notified', false)->update(['is_notified' => true]);
            $setting->update(['last_reset_date' => $today]);
        }
    }

    public function addReminder(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required|string',
            'customer_phone' => 'required|string',
            'customer_email' => 'nullable|email',
            'birthday_date' => 'required|date'
        ]);

        $reminder = BirthdayReminder::create([
            'customer_id' => $validated['customer_id'] ?? null,
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'],
            'customer_email' => $validated['customer_email'] ?? null,
            'birthday_date' => $validated['birthday_date'],
            'is_notified' => false
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Birthday reminder added successfully!',
            'data' => $reminder
        ], 201);
    }

    public function syncBirthdayReminders()
    {
        $today = Carbon::today()->toDateString();
        
        $customers = DB::select("
            SELECT * FROM customers 
            WHERE DATE(birthday) = ? 
            AND birthday IS NOT NULL
        ", [$today]);
        
        $createdCount = 0;
        
        foreach ($customers as $customer) {
            $exists = BirthdayReminder::where('customer_id', $customer->id)
                ->whereDate('birthday_date', $today)
                ->exists();
            
            if (!$exists) {
                BirthdayReminder::create([
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'customer_phone' => $customer->phone,
                    'customer_email' => $customer->email ?? null,
                    'birthday_date' => $today,
                    'is_notified' => false
                ]);
                $createdCount++;
            }
        }
        
        return response()->json([
            'success' => true,
            'message' => "Synced {$createdCount} birthday reminders for today!",
            'count' => $createdCount
        ]);
    }

    public function markNotified($id)
    {
        $reminder = BirthdayReminder::findOrFail($id);
        $reminder->update(['is_notified' => true]);
        
        return response()->json([
            'success' => true,
            'message' => 'Reminder marked as notified!'
        ]);
    }

    public function deleteReminder($id)
    {
        $reminder = BirthdayReminder::findOrFail($id);
        $reminder->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Reminder deleted!'
        ]);
    }
}