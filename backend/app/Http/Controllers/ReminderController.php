<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    public function index()
    {
        $reminders = Reminder::where('reminder_date', '>=', now())
            ->where('is_active', true)
            ->orderBy('reminder_date')
            ->get();
        return response()->json($reminders);
    }

    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:salary,rent,bill,other',
            'date' => 'required|date',
            'description' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'recurring' => 'nullable|in:one-time,monthly,weekly,yearly'
        ]);

        $reminder = Reminder::create([
            'type' => $request->type,
            'reminder_date' => $request->date,
            'description' => $request->description,
            'amount' => $request->amount,
            'recurring' => $request->recurring ?? 'one-time',
            'is_active' => true
        ]);

        return response()->json($reminder, 201);
    }

    public function update(Request $request, $id)
    {
        $reminder = Reminder::findOrFail($id);
        $reminder->update($request->all());
        return response()->json($reminder);
    }

    public function destroy($id)
    {
        Reminder::destroy($id);
        return response()->json(['message' => 'Reminder deleted']);
    }
}