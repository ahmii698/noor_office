<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EmployeeController extends Controller
{
    /**
     * Get all employees with payments and monthly records
     * GET /api/employees
     */
    public function index(Request $request)
    {
        try {
            $employees = Employee::with(['payments', 'monthlyRecords'])
                ->orderBy('created_at', 'desc')
                ->get();
            
            // ✅ Transform data for frontend
            $transformed = $employees->map(function($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'monthly_salary' => (float) $employee->monthly_salary,
                    'salary_date' => $employee->salary_date,
                    'paid_amount' => (float) $employee->paid_amount,
                    'balance_amount' => (float) $employee->balance_amount,
                    'status' => $employee->status,
                    'payments' => $employee->payments->map(function($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'payment_date' => $payment->payment_date,
                            'note' => $payment->note,
                            'created_by' => $payment->created_by,
                        ];
                    }),
                    'monthly_records' => $employee->monthlyRecords->map(function($record) {
                        return [
                            'id' => $record->id,
                            'month' => $record->month,
                            'monthly_salary' => (float) $record->monthly_salary,
                            'paid_amount' => (float) $record->paid_amount,
                            'balance_amount' => (float) $record->balance_amount,
                            'status' => $record->status,
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
            $employee = Employee::with(['payments', 'monthlyRecords'])->find($id);
            
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
                    'paid_amount' => (float) $employee->paid_amount,
                    'balance_amount' => (float) $employee->balance_amount,
                    'status' => $employee->status,
                    'payments' => $employee->payments->map(function($payment) {
                        return [
                            'id' => $payment->id,
                            'amount' => (float) $payment->amount,
                            'payment_date' => $payment->payment_date,
                            'note' => $payment->note,
                            'created_by' => $payment->created_by,
                        ];
                    }),
                    'monthly_records' => $employee->monthlyRecords->map(function($record) {
                        return [
                            'id' => $record->id,
                            'month' => $record->month,
                            'monthly_salary' => (float) $record->monthly_salary,
                            'paid_amount' => (float) $record->paid_amount,
                            'balance_amount' => (float) $record->balance_amount,
                            'status' => $record->status,
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
                'status' => 'Pending',
                'created_by' => $createdBy,
            ]);

            // ✅ Create monthly record for current month
            $employee->updateMonthlyRecord();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee added successfully!',
                'data' => $employee->load(['payments', 'monthlyRecords'])
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
                // ✅ Recalculate balance
                $updateData['balance_amount'] = $request->monthly_salary - $employee->paid_amount;
            }
            
            if ($request->has('salary_date')) {
                $updateData['salary_date'] = $request->salary_date;
            }

            $employee->update($updateData);
            
            // ✅ Update balance and monthly record
            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully!',
                'data' => $employee->load(['payments', 'monthlyRecords'])
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
            
            // ✅ Delete payments, monthly records, and employee
            $employee->payments()->delete();
            $employee->monthlyRecords()->delete();
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
     * Make payment to employee
     * POST /api/employee-payments
     */
    public function makePayment(Request $request)
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
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            if ($request->amount > $employee->balance_amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment amount (Rs. ' . number_format($request->amount) . ') cannot exceed balance amount (Rs. ' . number_format($employee->balance_amount) . ')'
                ], 422);
            }

            $createdBy = $this->getCreatedBy($request);

            // ✅ Create payment record
            $payment = EmployeePayment::create([
                'employee_id' => $employee->id,
                'amount' => $request->amount,
                'payment_date' => now(),
                'note' => $request->note ?? 'Salary payment',
                'created_by' => $createdBy,
            ]);

            // ✅ Update employee balance (auto updates monthly record)
            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment of Rs. ' . number_format($request->amount) . ' recorded successfully!',
                'data' => [
                    'payment' => $payment,
                    'employee' => $employee->load(['payments', 'monthlyRecords'])
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
            $payment->delete();
            
            // ✅ Update employee balance (auto updates monthly record)
            $employee->updateBalance();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment deleted successfully!',
                'data' => $employee->load(['payments', 'monthlyRecords'])
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
     * Reset salary for new month
     * POST /api/employees/{id}/reset-salary
     */
    public function resetSalary($id)
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

            // ✅ Reset salary using model method
            $employee->resetSalary();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '✅ Salary reset successfully for new month! Previous month record saved.',
                'data' => $employee->load(['payments', 'monthlyRecords'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error resetting salary: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset salary: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Get monthly history of an employee
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

            $history = $employee->monthlyRecords()
                ->orderBy('month', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->name,
                        'monthly_salary' => (float) $employee->monthly_salary,
                        'salary_date' => $employee->salary_date,
                    ],
                    'history' => $history->map(function($record) {
                        return [
                            'id' => $record->id,
                            'month' => $record->month,
                            'month_name' => $record->month_name,
                            'monthly_salary' => (float) $record->monthly_salary,
                            'paid_amount' => (float) $record->paid_amount,
                            'balance_amount' => (float) $record->balance_amount,
                            'status' => $record->status,
                            'is_current_month' => $record->is_current_month,
                            'created_at' => $record->created_at,
                        ];
                    }),
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
     * Helper: Get created by user name
     */
    private function getCreatedBy(Request $request)
    {
        $createdBy = 'System';
        
        try {
            // Try sanctum guard
            if (auth()->guard('sanctum')->check()) {
                $user = auth()->guard('sanctum')->user();
                if ($user) {
                    return $user->name ?? $user->email ?? 'Admin';
                }
            }
            
            // Try web guard
            if (auth()->guard('web')->check()) {
                $user = auth()->guard('web')->user();
                if ($user) {
                    return $user->name ?? $user->email ?? 'Admin';
                }
            }
            
            // Try default auth
            if (auth()->check()) {
                $user = auth()->user();
                if ($user) {
                    return $user->name ?? $user->email ?? 'Admin';
                }
            }
            
            // Try request user
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