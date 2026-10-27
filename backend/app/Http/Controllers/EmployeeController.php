<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeePayment;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EmployeeController extends Controller
{
    /**
     * Get all employees with payments
     * GET /api/employees
     */
    public function index(Request $request)
    {
        try {
            $employees = Employee::with(['payments'])
                ->orderBy('created_at', 'desc')
                ->get();

            $transformed = $employees->map(function($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'monthly_salary' => (float) $employee->monthly_salary,
                    'salary_date' => $employee->salary_date,
                    'join_date' => $employee->join_date ? $employee->join_date->format('Y-m-d') : null,
                    'paid_amount' => (float) $employee->paid_amount,
                    'balance_amount' => (float) $employee->balance_amount,
                    'advance_balance' => (float) $employee->advance_balance, // ✅ NEW
                    'loan_balance' => (float) $employee->loan_balance, // ✅ LOAN
                    'last_loan_date' => $employee->last_loan_date, // ✅ LOAN
                    'status' => $employee->status,
                    'payments' => $employee->payments->map(function($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'payment_date' => $payment->payment_date,
                            'for_month' => $payment->for_month,
                            'for_month_name' => $payment->for_month_name,
                            'is_advance' => (bool) $payment->is_advance, // ✅ NEW
                            'note' => $payment->note,
                            'created_by' => $payment->created_by,
                        ];
                    }),
                    'created_by' => $employee->created_by,
                    'created_at' => $employee->created_at,
                    'updated_at' => $employee->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transformed,
                'statistics' => [
                    'total_employees' => $employees->count(),
                    'total_salary' => (float) $employees->sum('monthly_salary'),
                    'total_paid' => (float) $employees->sum('paid_amount'),
                    'total_balance' => (float) $employees->sum('balance_amount'),
                    'pending' => $employees->where('status', 'Pending')->count(),
                    'partial' => $employees->where('status', 'Partial')->count(),
                    'paid' => $employees->where('status', 'Paid')->count(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching employees: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employees: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single employee with details
     * GET /api/employees/{id}
     */
    public function show($id)
    {
        try {
            $employee = Employee::with(['payments'])->find($id);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'monthly_salary' => (float) $employee->monthly_salary,
                    'salary_date' => $employee->salary_date,
                    'join_date' => $employee->join_date ? $employee->join_date->format('Y-m-d') : null,
                    'paid_amount' => (float) $employee->paid_amount,
                    'balance_amount' => (float) $employee->balance_amount,
                    'advance_balance' => (float) $employee->advance_balance, // ✅ NEW
                    'loan_balance' => (float) $employee->loan_balance, // ✅ LOAN
                    'last_loan_date' => $employee->last_loan_date, // ✅ LOAN
                    'status' => $employee->status,
                    'payments' => $employee->payments->map(function($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'payment_date' => $payment->payment_date,
                            'for_month' => $payment->for_month,
                            'for_month_name' => $payment->for_month_name,
                            'is_advance' => (bool) $payment->is_advance, // ✅ NEW
                            'note' => $payment->note,
                            'created_by' => $payment->created_by,
                        ];
                    }),
                    'created_by' => $employee->created_by,
                    'created_at' => $employee->created_at,
                    'updated_at' => $employee->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching employee: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employee details: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new employee
     * POST /api/employees
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'monthly_salary' => 'required|numeric|min:0',
                'salary_date' => 'nullable|integer|min:1|max:31',
                'join_date' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $createdBy = $this->getCreatedBy($request);

            DB::beginTransaction();

            $employee = Employee::create([
                'name' => $request->name,
                'monthly_salary' => $request->monthly_salary,
                'paid_amount' => 0,
                'balance_amount' => $request->monthly_salary,
                'salary_date' => $request->salary_date,
                'join_date' => $request->join_date ?? now(),
                'status' => 'Pending',
                'created_by' => $createdBy,
                'manual_cycles_added' => 0,
            ]);

            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee added successfully!',
                'data' => $employee->load(['payments'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating employee: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to add employee: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update employee
     * PUT /api/employees/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $employee = Employee::find($id);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'monthly_salary' => 'sometimes|required|numeric|min:0',
                'salary_date' => 'nullable|integer|min:1|max:31',
                'join_date' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $updateData = [];

            if ($request->has('name')) {
                $updateData['name'] = $request->name;
            }

            if ($request->has('monthly_salary')) {
                $updateData['monthly_salary'] = $request->monthly_salary;
            }

            if ($request->has('salary_date')) {
                $updateData['salary_date'] = $request->salary_date;
            }

            if ($request->has('join_date')) {
                $updateData['join_date'] = $request->join_date;
            }

            $employee->update($updateData);

            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully!',
                'data' => $employee->load(['payments'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating employee: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update employee: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete employee (with all records)
     * DELETE /api/employees/{id}
     */
    public function destroy($id)
    {
        try {
            $employee = Employee::find($id);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            DB::beginTransaction();

            $employee->payments()->delete();
            $employee->loans()->delete();         // ✅ LOAN
            $employee->loanPayments()->delete();  // ✅ LOAN
            $employee->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee deleted successfully!'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting employee: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete employee: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get list of unpaid months for an employee (for the payment dropdown)
     * GET /api/employees/{id}/unpaid-months
     */
    public function unpaidMonths($id)
    {
        try {
            $employee = Employee::find($id);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $employee->getUnpaidMonths()
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching unpaid months: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch unpaid months: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ NEW: Manually force a new salary month to start right now
     * (before its calendar month naturally arrives).
     * POST /api/employees/{id}/restart-month
     */
    public function restartMonth($id)
    {
        try {
            $employee = Employee::find($id);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            DB::beginTransaction();

            $employee->forceNextMonth();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'New salary month started for ' . $employee->name . '!',
                'data' => $employee->load(['payments'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error restarting month: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to restart month: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Make payment to employee for a SPECIFIC month
     * POST /api/employee-payments
     */
    public function makePayment(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'amount' => 'required|numeric|min:1',
                'for_month' => 'required|date_format:Y-m',
                'note' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $employee = Employee::find($request->employee_id);

            if (!$employee) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $monthBreakdown = collect($employee->getMonthlyBreakdown())
                ->firstWhere('month', $request->for_month);

            if (!$monthBreakdown) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid month — employee was not active during ' . $request->for_month
                ], 422);
            }

            if ($request->amount > $monthBreakdown['balance_amount']) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Payment amount (Rs. ' . number_format($request->amount) . ') cannot exceed ' . $monthBreakdown['month_name'] . '\'s remaining balance (Rs. ' . number_format($monthBreakdown['balance_amount']) . ')'
                ], 422);
            }

            $createdBy = $this->getCreatedBy($request);

            $payment = EmployeePayment::create([
                'employee_id' => $employee->id,
                'amount' => $request->amount,
                'payment_date' => now(),
                'for_month' => $request->for_month,
                'is_advance' => false,
                'note' => $request->note ?? 'Salary payment',
                'created_by' => $createdBy,
            ]);

            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment of Rs. ' . number_format($request->amount) . ' recorded for ' . $monthBreakdown['month_name'] . '!',
                'data' => [
                    'payment' => $payment,
                    'employee' => $employee->load(['payments'])
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error making payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to record payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ NEW: Give an employee an advance — not tied to any month.
     * Auto-applies to the next unpaid month(s) whenever they appear.
     * POST /api/employee-payments/advance
     */
    public function makeAdvancePayment(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'amount' => 'required|numeric|min:1',
                'note' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $employee = Employee::find($request->employee_id);

            if (!$employee) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            // Sanity cap: an advance shouldn't exceed one month's salary
            if ($request->amount > $employee->monthly_salary) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Advance amount (Rs. ' . number_format($request->amount) . ') cannot exceed one month\'s salary (Rs. ' . number_format($employee->monthly_salary) . ')'
                ], 422);
            }

            $createdBy = $this->getCreatedBy($request);

            $payment = EmployeePayment::create([
                'employee_id' => $employee->id,
                'amount' => $request->amount,
                'payment_date' => now(),
                'for_month' => null,
                'is_advance' => true,
                'note' => $request->note ?? 'Advance payment',
                'created_by' => $createdBy,
            ]);

            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Advance payment of Rs. ' . number_format($request->amount) . ' recorded for ' . $employee->name . '!',
                'data' => [
                    'payment' => $payment,
                    'employee' => $employee->load(['payments'])
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error making advance payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to record advance payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete payment
     * DELETE /api/employee-payments/{id}
     */
    public function deletePayment($id)
    {
        try {
            $payment = EmployeePayment::find($id);

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            DB::beginTransaction();

            $employee = $payment->employee;
            $deletedAmount = $payment->amount;

            $payment->delete();

            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment of Rs. ' . number_format($deletedAmount) . ' deleted successfully!',
                'data' => $employee->load(['payments'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Full month-by-month history since join_date
     * GET /api/employees/{id}/monthly-history
     */
    public function monthlyHistory($id)
    {
        try {
            $employee = Employee::find($id);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $history = $employee->getMonthlyBreakdown();

            return response()->json([
                'success' => true,
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->name,
                        'monthly_salary' => (float) $employee->monthly_salary,
                        'salary_date' => $employee->salary_date,
                        'join_date' => $employee->join_date ? $employee->join_date->format('Y-m-d') : null,
                        'advance_balance' => (float) $employee->advance_balance, // ✅ NEW
                    ],
                    'history' => $history,
                    'current_month' => now()->format('F Y'),
                    'total_months' => $history->count(),
                    'totals' => [
                        'total_salary' => (float) $history->sum('monthly_salary'),
                        'total_paid' => (float) $history->sum('paid_amount'),
                        'total_balance' => (float) $history->sum('balance_amount'),
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching monthly history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch monthly history: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Give loan to employee (loan_date user khud deta hai)
     * POST /api/employee-loans
     */
    public function giveLoan(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'amount' => 'required|numeric|min:1',
                'loan_date' => 'required|date',
                'note' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first(),
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $employee = Employee::find($request->employee_id);

            $loan = EmployeeLoan::create([
                'employee_id' => $employee->id,
                'amount' => $request->amount,
                'loan_date' => $request->loan_date,
                'note' => $request->note ?? 'Loan',
                'created_by' => $this->getCreatedBy($request),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Loan of Rs. ' . number_format($request->amount) . ' given to ' . $employee->name . '!',
                'data' => [
                    'loan' => $loan,
                    'loan_balance' => (float) $employee->loan_balance,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error giving loan: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to give loan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Employee loan wapas kare (payment_date user khud deta hai)
     * POST /api/employee-loans/repay
     */
    public function repayLoan(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'amount' => 'required|numeric|min:1',
                'payment_date' => 'required|date',
                'note' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first(),
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $employee = Employee::find($request->employee_id);
            $balance = (float) $employee->loan_balance;

            if ($request->amount > $balance) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Repayment (Rs. ' . number_format($request->amount) . ') cannot exceed loan balance (Rs. ' . number_format($balance) . ')'
                ], 422);
            }

            $payment = EmployeeLoanPayment::create([
                'employee_id' => $employee->id,
                'amount' => $request->amount,
                'payment_date' => $request->payment_date,
                'note' => $request->note ?? 'Loan repayment',
                'created_by' => $this->getCreatedBy($request),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Repayment of Rs. ' . number_format($request->amount) . ' recorded!',
                'data' => [
                    'payment' => $payment,
                    'loan_balance' => (float) $employee->loan_balance,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error repaying loan: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to record repayment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Poori loan history (loans + repayments, running balance ke saath)
     * GET /api/employee-loans/{employeeId}/history
     */
    public function loanHistory($employeeId)
    {
        try {
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $loans = $employee->loans()->get()->map(function ($l) {
                return [
                    'type' => 'loan',
                    'id' => $l->id,
                    'date' => $l->loan_date->format('Y-m-d'),
                    'amount' => (float) $l->amount,
                    'note' => $l->note,
                    'created_by' => $l->created_by,
                    'ts' => $l->created_at ? $l->created_at->timestamp : 0,
                ];
            });

            $repayments = $employee->loanPayments()->get()->map(function ($p) {
                return [
                    'type' => 'repayment',
                    'id' => $p->id,
                    'date' => $p->payment_date->format('Y-m-d'),
                    'amount' => (float) $p->amount,
                    'note' => $p->note,
                    'created_by' => $p->created_by,
                    'ts' => $p->created_at ? $p->created_at->timestamp : 0,
                ];
            });

            $entries = $loans->concat($repayments)->all();

            // Purani se nayi (running balance ke liye)
            usort($entries, fn($a, $b) => [$a['date'], $a['ts']] <=> [$b['date'], $b['ts']]);

            $running = 0;
            foreach ($entries as &$entry) {
                $running += $entry['type'] === 'loan' ? $entry['amount'] : -$entry['amount'];
                $entry['running_balance'] = round($running, 2);
            }
            unset($entry);

            // Display ke liye nayi pehle
            $entries = array_reverse($entries);

            $totalLoan = (float) $loans->sum('amount');
            $totalRepaid = (float) $repayments->sum('amount');

            return response()->json([
                'success' => true,
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->name,
                    ],
                    'entries' => array_values($entries),
                    'totals' => [
                        'total_loan' => $totalLoan,
                        'total_repaid' => $totalRepaid,
                        'balance' => round($totalLoan - $totalRepaid, 2),
                    ],
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching loan history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch loan history: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Delete a loan entry
     * DELETE /api/employee-loans/loan/{id}
     */
    public function deleteLoan($id)
    {
        try {
            $loan = EmployeeLoan::find($id);

            if (!$loan) {
                return response()->json(['success' => false, 'message' => 'Loan not found'], 404);
            }

            $employee = $loan->employee;

            // Delete ke baad balance minus mein nahi jana chahiye
            if (((float) $employee->loan_balance - (float) $loan->amount) < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete this loan: repayments already recorded exceed the remaining loans. Delete the repayment first.'
                ], 422);
            }

            $loan->delete();

            return response()->json([
                'success' => true,
                'message' => 'Loan entry deleted successfully!'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting loan: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete loan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Delete a repayment entry
     * DELETE /api/employee-loans/repayment/{id}
     */
    public function deleteLoanRepayment($id)
    {
        try {
            $payment = EmployeeLoanPayment::find($id);

            if (!$payment) {
                return response()->json(['success' => false, 'message' => 'Repayment not found'], 404);
            }

            $payment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Repayment deleted successfully!'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting repayment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete repayment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper: Get created by user name
     */
    private function getCreatedBy(Request $request)
    {
        $createdBy = 'System';

        try {
            if (auth()->guard('sanctum')->check()) {
                $user = auth()->guard('sanctum')->user();
                if ($user) {
                    return $user->name ?? $user->email ?? 'Admin';
                }
            }

            if (auth()->guard('web')->check()) {
                $user = auth()->guard('web')->user();
                if ($user) {
                    return $user->name ?? $user->email ?? 'Admin';
                }
            }

            if (auth()->check()) {
                $user = auth()->user();
                if ($user) {
                    return $user->name ?? $user->email ?? 'Admin';
                }
            }

            if ($request->user()) {
                $user = $request->user();
                return $user->name ?? $user->email ?? 'Admin';
            }

        } catch (\Exception $e) {
            Log::error('Auth check error: ' . $e->getMessage());
        }

        return $createdBy;
    }
}