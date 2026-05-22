// src/components/finance/FinanceExpenses.jsx
import React, { useState, useEffect, useCallback } from 'react';
import ExpensesRecord from './ExpensesRecord';
import { FiLoader } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FinanceExpenses = ({ darkMode }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch expenses from API - Optimized with useCallback
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/expenses');
      if (response.data && Array.isArray(response.data)) {
        setExpenses(response.data);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses. Please check your connection.');
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new expense - Optimized with useCallback
  const handleAddExpense = useCallback(async (expenseData) => {
    try {
      const response = await api.post('/expenses', {
        description: expenseData.description,
        amount: expenseData.amount,
        date: expenseData.date,
        category: expenseData.category,
        isRecurring: expenseData.isRecurring || false,
        recurringType: expenseData.recurringType || 'monthly',
        lastPaidDate: expenseData.lastPaidDate || null,
        nextPaymentDate: expenseData.nextPaymentDate || null
      });
      
      if (response.data) {
        toast.success('Expense added successfully!');
        await fetchExpenses();
        return true;
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      toast.error(err.response?.data?.message || 'Failed to add expense');
      return false;
    }
  }, [fetchExpenses]);

  // Update existing expense - Optimized with useCallback
  const handleUpdateExpense = useCallback(async (updatedExpense) => {
    try {
      const response = await api.put(`/expenses/${updatedExpense.id}`, {
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        date: updatedExpense.date,
        category: updatedExpense.category,
        isRecurring: updatedExpense.isRecurring || false,
        recurringType: updatedExpense.recurringType || 'monthly',
        lastPaidDate: updatedExpense.lastPaidDate || null,
        nextPaymentDate: updatedExpense.nextPaymentDate || null
      });
      
      if (response.data) {
        toast.success('Expense updated successfully!');
        await fetchExpenses();
        return true;
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      toast.error(err.response?.data?.message || 'Failed to update expense');
      return false;
    }
  }, [fetchExpenses]);

  // Load expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ExpensesRecord 
        expenses={expenses} 
        onAddExpense={handleAddExpense} 
        onUpdateExpense={handleUpdateExpense} 
        darkMode={darkMode} 
      />
      
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">⚠️ {error}</p>
          <button 
            onClick={fetchExpenses}
            className="mt-2 px-4 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default FinanceExpenses;