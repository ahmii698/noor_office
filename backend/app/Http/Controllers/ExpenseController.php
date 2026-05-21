<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        return response()->json(Expense::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'description' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'type' => 'nullable|string',
            'category' => 'nullable|string'
        ]);

        $expense = Expense::create([
            'description' => $request->description,
            'amount' => $request->amount,
            'expense_date' => $request->date,
            'type' => $request->type,
            'category' => $request->category
        ]);

        return response()->json($expense, 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        $expense->update($request->all());
        return response()->json($expense);
    }

    public function destroy($id)
    {
        Expense::destroy($id);
        return response()->json(['message' => 'Expense deleted']);
    }
}