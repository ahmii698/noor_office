<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashInHandController extends Controller
{
    private const TABLE = 'cash_in_hand_entries';

    private function currentBalance(): float
    {
        return (float) DB::table(self::TABLE)
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'add' THEN amount ELSE -amount END), 0) as bal")
            ->value('bal');
    }

    // GET /api/cash-in-hand  -> balance + poori history (newest first)
    public function index()
    {
        $entries = DB::table(self::TABLE)->orderByDesc('id')->get();

        return response()->json([
            'success' => true,
            'balance' => $this->currentBalance(),
            'data'    => $entries,
        ]);
    }

    // POST /api/cash-in-hand  { type: add|withdraw, amount, note }
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Only admin can update cash in hand'], 403);
        }

        $data = $request->validate([
            'type'   => 'required|in:add,withdraw',
            'amount' => 'required|numeric|gt:0',
            'note'   => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($data, $user) {
            // lock taake do requests ek saath aayen to balance galat na ho
            DB::table(self::TABLE)->lockForUpdate()->count();

            $before = $this->currentBalance();
            $amount = (float) $data['amount'];
            $after  = $data['type'] === 'add' ? $before + $amount : $before - $amount;

            if ($after < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Withdraw amount cash in hand se zyada hai',
                ], 422);
            }

            $id = DB::table(self::TABLE)->insertGetId([
                'type'           => $data['type'],
                'amount'         => $amount,
                'balance_before' => $before,
                'balance_after'  => $after,
                'note'           => $data['note'] ?? null,
                'user_name'      => $user->name ?? 'Admin',
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cash in hand updated',
                'balance' => $after,
                'data'    => DB::table(self::TABLE)->find($id),
            ], 201);
        });
    }
}