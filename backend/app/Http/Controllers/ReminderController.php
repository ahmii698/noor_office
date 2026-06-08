<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class ReminderController extends Controller
{
    // Get all reminders (index)
    public function index()
    {
        $reminders = DB::table('service_reminders')
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($reminders);
    }
    
    // Get single reminder by ID
    public function show($id)
    {
        $reminder = DB::table('service_reminders')->where('id', $id)->first();
        
        if (!$reminder) {
            return response()->json(['success' => false, 'message' => 'Reminder not found'], 404);
        }
        
        return response()->json($reminder);
    }
    
    // Store new reminder
    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_no' => 'required|string',
            'customer_name' => 'required|string',
            'customer_phone' => 'required|string',
            'customer_email' => 'nullable|email',
            'car_number' => 'required|string',
            'service_type' => 'required|string',
        ]);
        
        $reminderId = DB::table('service_reminders')->insertGetId([
            'invoice_no' => $validated['invoice_no'],
            'customer_name' => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'],
            'customer_email' => $validated['customer_email'] ?? null,
            'car_number' => $validated['car_number'],
            'service_type' => $validated['service_type'],
            'service_date' => Carbon::now(),
            'reminder_date' => Carbon::now()->addMonths(6),
            'reminder_sent' => 0,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now()
        ]);
        
        return response()->json([
            'success' => true, 
            'id' => $reminderId,
            'message' => 'Reminder scheduled for 6 months later'
        ]);
    }
    
    // Update reminder
    public function update(Request $request, $id)
    {
        $reminder = DB::table('service_reminders')->where('id', $id)->first();
        
        if (!$reminder) {
            return response()->json(['success' => false, 'message' => 'Reminder not found'], 404);
        }
        
        $updateData = [];
        
        if ($request->has('customer_name')) $updateData['customer_name'] = $request->customer_name;
        if ($request->has('customer_phone')) $updateData['customer_phone'] = $request->customer_phone;
        if ($request->has('customer_email')) $updateData['customer_email'] = $request->customer_email;
        if ($request->has('car_number')) $updateData['car_number'] = $request->car_number;
        if ($request->has('service_type')) $updateData['service_type'] = $request->service_type;
        if ($request->has('reminder_sent')) $updateData['reminder_sent'] = $request->reminder_sent;
        
        $updateData['updated_at'] = Carbon::now();
        
        DB::table('service_reminders')->where('id', $id)->update($updateData);
        
        return response()->json([
            'success' => true,
            'message' => 'Reminder updated successfully'
        ]);
    }
    
    // Delete reminder
    public function destroy($id)
    {
        $reminder = DB::table('service_reminders')->where('id', $id)->first();
        
        if (!$reminder) {
            return response()->json(['success' => false, 'message' => 'Reminder not found'], 404);
        }
        
        DB::table('service_reminders')->where('id', $id)->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Reminder deleted successfully'
        ]);
    }
    
    // Get all pending reminders (6 months ho gaye)
    public function getPendingReminders()
    {
        $reminders = DB::table('service_reminders')
            ->where('reminder_sent', 0)
            ->where('reminder_date', '<=', Carbon::today())
            ->orderBy('reminder_date', 'asc')
            ->get();
        
        foreach ($reminders as $reminder) {
            $reminder->days_overdue = Carbon::parse($reminder->reminder_date)->diffInDays(Carbon::today());
        }
        
        return response()->json($reminders);
    }
    
    // ✅ UPDATED: Add reminder when invoice is created (email optional)
    public function addReminder(Request $request)
    {
        try {
            // ✅ Email optional - null if not provided
            $customerEmail = $request->customer_email ?? null;
            
            $reminderId = DB::table('service_reminders')->insertGetId([
                'invoice_no' => $request->invoice_no,
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'customer_email' => $customerEmail,
                'car_number' => $request->car_number,
                'service_type' => $request->service_type ?? 'service',
                'service_date' => Carbon::now(),
                'reminder_date' => Carbon::now()->addMonths(6),
                'reminder_sent' => 0,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);
            
            return response()->json([
                'success' => true, 
                'id' => $reminderId,
                'message' => 'Reminder scheduled for 6 months later'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    // ✅ UPDATED: Send email and mark as sent (with better error handling)
    public function sendReminderEmail(Request $request)
    {
        try {
            $reminderId = $request->reminder_id;
            $customer = DB::table('service_reminders')->where('id', $reminderId)->first();
            
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reminder not found'
                ], 404);
            }
            
            if (!$customer->customer_email) {
                return response()->json([
                    'success' => false,
                    'message' => 'No email address found for this customer'
                ], 400);
            }
            
            // Prepare email
            $to = $customer->customer_email;
            $subject = "🔔 Service Reminder - 6 Months Complete - Noorani Car AC";
            
            $message = "Dear {$customer->customer_name},\n\n";
            $message .= "This is a friendly reminder that it's been 6 months since your last service.\n\n";
            $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            $message .= "📋 SERVICE DETAILS:\n";
            $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            $message .= "• Invoice #: {$customer->invoice_no}\n";
            $message .= "• Car Number: {$customer->car_number}\n";
            $message .= "• Service Date: " . Carbon::parse($customer->service_date)->format('d M Y') . "\n";
            $message .= "• Service Type: " . ucfirst($customer->service_type) . "\n\n";
            
            $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            $message .= "📞 BOOK YOUR APPOINTMENT:\n";
            $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            $message .= "Call us: +92 300 1234567\n";
            $message .= "Visit us: 123 Main Street, City\n\n";
            
            $message .= "Thank you for choosing Noorani Car AC & Autos!\n";
            $message .= "Drive Safe! 🚗❄️\n\n";
            $message .= "Regards,\nNoorani Car AC & Autos Team";
            
            // Add to email queue
            DB::table('email_queue')->insert([
                'to_email' => $to,
                'to_name' => $customer->customer_name,
                'subject' => $subject,
                'message' => $message,
                'status' => 'sent',
                'created_at' => Carbon::now(),
                'sent_at' => Carbon::now()
            ]);
            
            // Mark reminder as sent
            DB::table('service_reminders')
                ->where('id', $reminderId)
                ->update([
                    'reminder_sent' => 1,
                    'reminder_sent_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Reminder email sent successfully to ' . $customer->customer_email
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    // Get reminders by invoice number
    public function getByInvoiceNo($invoiceNo)
    {
        $reminders = DB::table('service_reminders')
            ->where('invoice_no', $invoiceNo)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($reminders);
    }
    
    // Mark reminder as sent
    public function markAsSent($id)
    {
        $reminder = DB::table('service_reminders')->where('id', $id)->first();
        
        if (!$reminder) {
            return response()->json(['success' => false, 'message' => 'Reminder not found'], 404);
        }
        
        DB::table('service_reminders')
            ->where('id', $id)
            ->update([
                'reminder_sent' => 1,
                'reminder_sent_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Reminder marked as sent'
        ]);
    }
    
    // Get today's due reminders
    public function getTodayDueReminders()
    {
        $reminders = DB::table('service_reminders')
            ->where('reminder_sent', 0)
            ->where('reminder_date', '=', Carbon::today())
            ->get();
        
        return response()->json($reminders);
    }
    
    // Get statistics for dashboard
    public function getStats()
    {
        $totalReminders = DB::table('service_reminders')->count();
        $pendingReminders = DB::table('service_reminders')
            ->where('reminder_sent', 0)
            ->where('reminder_date', '<=', Carbon::today())
            ->count();
        $sentReminders = DB::table('service_reminders')
            ->where('reminder_sent', 1)
            ->count();
        $upcomingReminders = DB::table('service_reminders')
            ->where('reminder_sent', 0)
            ->where('reminder_date', '>', Carbon::today())
            ->count();
        
        return response()->json([
            'total' => $totalReminders,
            'pending' => $pendingReminders,
            'sent' => $sentReminders,
            'upcoming' => $upcomingReminders
        ]);
    }
}