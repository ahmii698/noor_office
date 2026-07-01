// src/components/finance/ExpensesRecord.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle, FiSearch, FiTrendingDown, FiDollarSign, FiHome, FiGrid } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ExpensesRecord = ({ expenses, onAddExpense, onUpdateExpense, darkMode, refreshExpenses }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('fixed');
  const [localExpenses, setLocalExpenses] = useState(expenses);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'General',
    isRecurring: false,
    recurringType: 'monthly',
    lastPaidDate: '',
    nextPaymentDate: ''
  });

  // ✅ Fixed Monthly Categories - Match with your database
  const fixedCategories = useMemo(() => ['Rent', 'Utilities', 'Salary', 'Office', 'Staff'], []);
  const otherCategories = useMemo(() => ['General', 'Maintenance', 'Tea/Coffee', 'Stationery', 'Marketing', 'Repair', 'Other'], []);

  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  // Memoized filtered expenses - Yeh sirf tab calculate hoga jab dependencies change hongi
  const filteredExpenses = useMemo(() => {
    let filtered = localExpenses;
    
    if (activeTab === 'fixed') {
      filtered = filtered.filter(exp => fixedCategories.includes(exp.category));
    } else {
      filtered = filtered.filter(exp => otherCategories.includes(exp.category));
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.description?.toLowerCase().includes(term) ||
        exp.category?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [localExpenses, activeTab, searchTerm, fixedCategories, otherCategories]);

  // Memoized total expenses
  const totalExpenses = useMemo(() => 
    filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0),
    [filteredExpenses]
  );

  // Memoized counts for tabs
  const fixedCount = useMemo(() => 
    localExpenses.filter(e => fixedCategories.includes(e.category)).length,
    [localExpenses, fixedCategories]
  );

  const otherCount = useMemo(() => 
    localExpenses.filter(e => otherCategories.includes(e.category)).length,
    [localExpenses, otherCategories]
  );

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const calculateNextPaymentDate = useCallback((lastPaidDate, recurringType) => {
    if (!lastPaidDate) return '';
    const date = new Date(lastPaidDate);
    if (recurringType === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (recurringType === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (recurringType === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString().split('T')[0];
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.date) {
      toast.error('Please fill all fields');
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    let expenseData = {
      description: formData.description,
      amount: amountNum,
      date: formData.date,
      category: formData.category
    };

    if (formData.isRecurring) {
      expenseData.isRecurring = true;
      expenseData.recurringType = formData.recurringType;
      expenseData.lastPaidDate = formData.lastPaidDate || formData.date;
      expenseData.nextPaymentDate = formData.nextPaymentDate || calculateNextPaymentDate(expenseData.lastPaidDate, formData.recurringType);
    }

    let success;
    if (editingExpense) {
      success = await onUpdateExpense({
        id: editingExpense.id,
        ...expenseData
      });
    } else {
      success = await onAddExpense(expenseData);
    }

    if (success) {
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'General',
        isRecurring: false,
        recurringType: 'monthly',
        lastPaidDate: '',
        nextPaymentDate: ''
      });
    }
  }, [formData, editingExpense, onAddExpense, onUpdateExpense, calculateNextPaymentDate]);

  const handlePayNow = useCallback(async (expense) => {
    const today = new Date().toISOString().split('T')[0];
    let newNextPaymentDate = '';
    
    const recurringType = expense.recurring_type || 'monthly';
    
    const date = new Date(today);
    if (recurringType === 'monthly') {
      date.setMonth(date.getMonth() + 1);
      newNextPaymentDate = date.toISOString().split('T')[0];
    } else if (recurringType === 'weekly') {
      date.setDate(date.getDate() + 7);
      newNextPaymentDate = date.toISOString().split('T')[0];
    } else if (recurringType === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
      newNextPaymentDate = date.toISOString().split('T')[0];
    } else {
      date.setMonth(date.getMonth() + 1);
      newNextPaymentDate = date.toISOString().split('T')[0];
    }
    
    try {
      const response = await api.put(`/expenses/${expense.id}`, {
        description: expense.description,
        amount: expense.amount,
        expense_date: today,
        category: expense.category,
        last_paid_date: today,
        next_payment_date: newNextPaymentDate,
        is_recurring: 1,
        recurring_type: recurringType
      });
      
      if (response.data) {
        setLocalExpenses(prevExpenses => 
          prevExpenses.map(exp => 
            exp.id === expense.id 
              ? { ...exp, last_paid_date: today, next_payment_date: newNextPaymentDate, is_recurring: 1 }
              : exp
          )
        );
        
        toast.success(`✅ Payment recorded for ${expense.description}!`);
        toast.success(`📅 Last paid: ${new Date(today).toLocaleDateString()}`);
        toast.success(`📅 Next payment due on ${new Date(newNextPaymentDate).toLocaleDateString()}`);
        
        if (refreshExpenses) {
          setTimeout(() => refreshExpenses(), 500);
        }
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error('Failed to record payment');
    }
  }, [refreshExpenses]);

  const handleEdit = useCallback((expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      date: expense.expense_date || expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || 'General',
      isRecurring: expense.is_recurring === 1,
      recurringType: expense.recurring_type || 'monthly',
      lastPaidDate: expense.last_paid_date || '',
      nextPaymentDate: expense.next_payment_date || ''
    });
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (expenseId, expenseDesc) => {
    if (window.confirm(`Are you sure you want to delete "${expenseDesc}"?`)) {
      try {
        await api.delete(`/expenses/${expenseId}`);
        setLocalExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));
        toast.success('Expense deleted successfully!');
        if (refreshExpenses) {
          setTimeout(() => refreshExpenses(), 500);
        }
      } catch (err) {
        console.error('Error deleting expense:', err);
        toast.error('Failed to delete expense');
      }
    }
  }, [refreshExpenses]);

  const isOverdue = useCallback((nextPaymentDate) => {
    if (!nextPaymentDate) return false;
    return new Date(nextPaymentDate) < new Date();
  }, []);

  const clearSearch = useCallback(() => setSearchTerm(''), []);

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h3 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <FiTrendingDown className="text-red-500 text-xl" />
            Expenses Record
          </h3>
          <div className="flex gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`px-4 py-2 pl-10 pr-8 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{ width: '250px' }}
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              {searchTerm && (
                <button onClick={clearSearch} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  <FiX size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md whitespace-nowrap"
            >
              <FiPlus /> Add Expense
            </button>
          </div>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('fixed')}
            className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
              activeTab === 'fixed'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FiHome className="text-lg" /> Fixed Monthly Expenses
            <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {fixedCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('other')}
            className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
              activeTab === 'other'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FiGrid className="text-lg" /> Other Expenses
            <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {otherCount}
            </span>
          </button>
        </div>
      </div>

      <div className={`px-6 py-2 text-sm ${darkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-gray-50'}`}>
        {activeTab === 'fixed' ? (
          <div className="flex items-center gap-4">
            <FiHome className="text-red-500" />
            <span>Monthly recurring expenses: Rent, Utilities, and Salary. These expenses have "Pay Now" option to record monthly payments.</span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <FiGrid className="text-blue-500" />
            <span>One-time and variable expenses: Maintenance, Tea/Coffee, Stationery, Marketing, Repairs, and other general expenses.</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase">Last Paid</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase">Next Due</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FiTrendingDown className="text-5xl text-gray-400" />
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm ? `No expenses found matching "${searchTerm}"` : 
                       activeTab === 'fixed' ? 'No fixed monthly expenses added yet.' : 
                       'No other expenses added yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-medium">
                    {expense.description}
                    {expense.is_recurring === 1 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">Recurring</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      fixedCategories.includes(expense.category) 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {expense.category || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {expense.last_paid_date ? new Date(expense.last_paid_date).toLocaleDateString() : 
                     expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {expense.is_recurring === 1 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium whitespace-nowrap ${isOverdue(expense.next_payment_date) ? 'text-red-500 font-bold' : 'text-yellow-500'}`}>
                          {expense.next_payment_date ? new Date(expense.next_payment_date).toLocaleDateString() : 'Not set'}
                        </span>
                        {isOverdue(expense.next_payment_date) && (
                          <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded whitespace-nowrap">Overdue!</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">One-time</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500 whitespace-nowrap">Rs. {parseFloat(expense.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2 flex-wrap">
                      {expense.is_recurring === 1 && (
                        <button
                          onClick={() => handlePayNow(expense)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition flex items-center gap-1 shadow-md whitespace-nowrap"
                          title="Pay Now"
                        >
                          <FiDollarSign size={12} /> Pay Now
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(expense)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 transition bg-blue-50 dark:bg-blue-900/20 rounded"
                        title="Edit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id, expense.description)}
                        className="p-1.5 text-red-500 hover:text-red-700 transition bg-red-50 dark:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredExpenses.length > 0 && (
            <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
              <tr>
                <td colSpan="4" className="px-4 py-3 text-right font-bold">Total:</td>
                <td className="px-4 py-3 text-right font-bold text-red-500">Rs. {totalExpenses.toLocaleString()}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingExpense(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description *</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="e.g., Shop Rent, Employee Salary"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount * (Rs.)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Payment Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                >
                  <optgroup label="Fixed Monthly Expenses">
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                 
                  </optgroup>
                  <optgroup label="Other Expenses">
                    {otherCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-red-500 focus:ring-red-400"
                  />
                  <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    🔄 This is a recurring expense (Monthly Rent, Salary, etc.)
                  </label>
                </div>
                
                {formData.isRecurring && (
                  <div className="mt-3 pl-6 space-y-3 border-l-2 border-red-300">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Recurring Type</label>
                      <select
                        name="recurringType"
                        value={formData.recurringType}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                      >
                        <option value="monthly">📅 Monthly</option>
                        <option value="weekly">📆 Weekly</option>
                        <option value="yearly">🗓️ Yearly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Last Paid Date</label>
                      <input
                        type="date"
                        name="lastPaidDate"
                        value={formData.lastPaidDate}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave empty to use payment date</p>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Next Payment Date</label>
                      <input
                        type="date"
                        name="nextPaymentDate"
                        value={formData.nextPaymentDate}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave empty to auto-calculate</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiCheckCircle className="text-sm" /> {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesRecord;