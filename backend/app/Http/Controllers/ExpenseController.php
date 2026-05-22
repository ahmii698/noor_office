<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        $expenses = Expense::all();
        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $request->validate([
            'description' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'type' => 'nullable|string',
            'category' => 'nullable|string',
            'isRecurring' => 'nullable|boolean',
            'recurringType' => 'nullable|string|in:monthly,weekly,yearly',
            'lastPaidDate' => 'nullable|date',
            'nextPaymentDate' => 'nullable|date'
        ]);

        $expense = Expense::create([
            'description' => $request->description,
            'amount' => $request->amount,
            'expense_date' => $request->date,
            'type' => $request->type ?? 'expense',
            'category' => $request->category ?? 'General',
            'is_recurring' => $request->isRecurring ? 1 : 0,
            'recurring_type' => $request->recurringType ?? 'monthly',
            'last_paid_date' => $request->lastPaidDate ?? null,
            'next_payment_date' => $request->nextPaymentDate ?? null
        ]);

        return response()->json($expense, 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        
        $updateData = [
            'description' => $request->description ?? $expense->description,
            'amount' => $request->amount ?? $expense->amount,
            'expense_date' => $request->expense_date ?? $request->date ?? $expense->expense_date,
            'category' => $request->category ?? $expense->category,
        ];
        
        // Handle is_recurring
        if ($request->has('is_recurring')) {
            $updateData['is_recurring'] = $request->is_recurring;
        }
        
        // Handle recurring_type
        if ($request->has('recurring_type')) {
            $updateData['recurring_type'] = $request->recurring_type;
        }
        
        // ✅ FIX: Handle last_paid_date (from Pay Now button)
        if ($request->has('last_paid_date')) {
            $updateData['last_paid_date'] = $request->last_paid_date;
        }
        
        // ✅ FIX: Handle next_payment_date (from Pay Now button)
        if ($request->has('next_payment_date')) {
            $updateData['next_payment_date'] = $request->next_payment_date;
        }
        
        $expense->update($updateData);
        
        return response()->json($expense);
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);
        $expense->delete();
        return response()->json(['message' => 'Expense deleted successfully']);
    }
}