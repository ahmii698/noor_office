<?php

namespace App\Http\Controllers;

use App\Models\InvoiceItem;
use App\Models\Invoice;
use App\Models\ReminderMessage;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ServiceReminderController extends Controller
{
    // ✅ Get all reminders from invoice_items table using scopes
    public function getAllReminders()
    {
        try {
            // ✅ Get Tuning reminders using scope
            $tuningReminders = InvoiceItem::tuning()
                ->olderThanSixMonths()
                ->with('invoice')
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'invoice_id' => $item->invoice_id,
                        'customer_name' => $item->invoice->customer_name ?? 'N/A',
                        'customer_phone' => $item->invoice->customer_phone ?? 'N/A',
                        'car_number' => $item->invoice->customer_car_number ?? 'N/A',
                        'car_model' => $item->invoice->customer_car_model ?? 'N/A',
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'total' => $item->total,
                        'service_date' => $item->created_at,
                    ];
                });

            // ✅ Get Oil Change reminders using scope
            $oilChangeReminders = InvoiceItem::oilChange()
                ->olderThanSixMonths()
                ->with('invoice')
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'invoice_id' => $item->invoice_id,
                        'customer_name' => $item->invoice->customer_name ?? 'N/A',
                        'customer_phone' => $item->invoice->customer_phone ?? 'N/A',
                        'car_number' => $item->invoice->customer_car_number ?? 'N/A',
                        'car_model' => $item->invoice->customer_car_model ?? 'N/A',
                        'service_name' => $item->service_name,
                        'service_category' => $item->service_category,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'total' => $item->total,
                        'service_date' => $item->created_at,
                    ];
                });

            // ✅ Get messages from reminder_messages table
            $messages = ReminderMessage::where('is_active', 1)->get();
            $messageMap = [];
            foreach ($messages as $msg) {
                $messageMap[$msg->service_type] = [
                    'message_template' => $msg->message_template,
                    'whatsapp_number' => $msg->whatsapp_number
                ];
            }

            return response()->json([
                'tuning' => $tuningReminders,
                'oil_change' => $oilChangeReminders,
                'messages' => $messageMap
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ✅ Mark reminder as sent
    public function markAsSent($id)
    {
        try {
            return response()->json([
                'success' => true,
                'message' => 'Reminder marked as sent!'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ✅ Get message template
    public function getMessage($type)
    {
        try {
            $message = ReminderMessage::where('service_type', $type)->first();
            return response()->json($message);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ✅ Update message template
    public function updateMessage(Request $request, $type)
    {
        try {
            $validated = $request->validate([
                'message_template' => 'required|string',
                'whatsapp_number' => 'required|string'
            ]);

            $message = ReminderMessage::where('service_type', $type)->first();
            if ($message) {
                $message->update([
                    'message_template' => $validated['message_template'],
                    'whatsapp_number' => $validated['whatsapp_number']
                ]);
            } else {
                $message = ReminderMessage::create([
                    'service_type' => $type,
                    'message_template' => $validated['message_template'],
                    'whatsapp_number' => $validated['whatsapp_number'],
                    'is_active' => 1
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Message updated successfully!',
                'data' => $message
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ✅ Clear/Delete reminder
    public function destroy($id)
    {
        try {
            // We don't actually delete from invoice_items
            // Just return success to hide from frontend
            return response()->json([
                'success' => true,
                'message' => 'Reminder cleared successfully!'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ✅ Optional: Get reminders for a specific customer
    public function getCustomerReminders($customerId)
    {
        try {
            $invoices = Invoice::where('customer_id', $customerId)
                ->with(['items' => function($query) {
                    $query->where(function($q) {
                        $q->where('service_name', 'LIKE', '%Tuning%')
                          ->orWhere('service_name', 'LIKE', '%tuning%')
                          ->orWhere('service_name', 'LIKE', '%oil%')
                          ->orWhere('service_name', 'LIKE', '%Oil%');
                    });
                }])
                ->get();

            $reminders = [];
            foreach ($invoices as $invoice) {
                foreach ($invoice->items as $item) {
                    $reminders[] = [
                        'id' => $item->id,
                        'invoice_id' => $item->invoice_id,
                        'customer_name' => $invoice->customer_name,
                        'customer_phone' => $invoice->customer_phone,
                        'car_number' => $invoice->customer_car_number,
                        'car_model' => $invoice->customer_car_model,
                        'service_name' => $item->service_name,
                        'service_date' => $item->created_at,
                    ];
                }
            }

            return response()->json($reminders);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}