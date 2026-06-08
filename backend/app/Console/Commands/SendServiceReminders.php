<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class SendServiceReminders extends Command
{
    protected $signature = 'reminders:send';
    protected $description = 'Send 6-month service reminders to admin';

    public function handle()
    {
        $reminders = DB::table('service_reminders')
            ->where('reminder_sent', 0)
            ->where('reminder_date', '<=', Carbon::today())
            ->get();

        if ($reminders->count() == 0) {
            $this->info('No pending reminders');
            return;
        }

        $emailBody = "Dear Owner,\n\n";
        $emailBody .= "Following customers completed 6 months since their last service. Please contact them:\n\n";
        $emailBody .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

        foreach ($reminders as $reminder) {
            $emailBody .= "• Customer: {$reminder->customer_name}\n";
            $emailBody .= "  Phone: {$reminder->customer_phone}\n";
            $emailBody .= "  Car Number: {$reminder->car_number}\n";
            $emailBody .= "  Service: {$reminder->service_type}\n";
            $emailBody .= "  Service Date: " . Carbon::parse($reminder->service_date)->format('d M Y') . "\n\n";
            
            // ✅ reminder_sent_at HATADO - sirf reminder_sent update karo
            DB::table('service_reminders')
                ->where('id', $reminder->id)
                ->update(['reminder_sent' => 1]);
        }

        $emailBody .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        $emailBody .= "Total: {$reminders->count()} customers\n";
        $emailBody .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $emailBody .= "Call them for repeat business!\n";
        $emailBody .= "Regards,\nNoorani System";

        Mail::raw($emailBody, function($mail) {
            $mail->to(env('ADMIN_EMAIL', 'admin@nooraniac.com'))
                 ->subject('🔔 Service Reminder - ' . now()->format('d M Y'));
        });

        $this->info('Sent ' . $reminders->count() . ' reminders to admin');
    }
}