// src/components/finance/ExpensesRecord.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText, FiPlus, FiDownload, FiCalendar, FiDollarSign, FiTool, FiPieChart, FiX, FiEdit2, FiCheckCircle } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ExpensesRecord = ({ expenses, onAddExpense, onUpdateExpense, darkMode }) => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'Operational',
    category: 'Other'
  });
  const [editingCell, setEditingCell] = useState({ expenseId: null, field: null, value: '' });

  const expenseTypes = ['Operational', 'Salary', 'Rent', 'Utilities', 'Marketing', 'Maintenance', 'Tax', 'Other'];
  const expenseCategories = ['Office', 'Staff', 'Infrastructure', 'Marketing', 'Supplies', 'Travel', 'Software', 'Other'];

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) {
      toast.error('Please fill all required fields');
      return;
    }
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (editingExpense) {
      const updatedExpense = { ...editingExpense, ...formData, amount: amountNum };
      onUpdateExpense(updatedExpense);
      toast.success('Expense updated successfully!');
    } else {
      const newExpense = { id: Date.now(), ...formData, amount: amountNum };
      onAddExpense(newExpense);
      toast.success('Expense added successfully!');
    }
    setFormData({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'Operational', category: 'Other' });
    setEditingExpense(null);
    setShowExpenseForm(false);
  };

  const startInlineEdit = (expenseId, field, currentValue) => {
    setEditingCell({ expenseId, field, value: currentValue });
  };

  const saveInlineEdit = (expenseId, field) => {
    let newValue = editingCell.value;
    if (field === 'amount') {
      newValue = parseFloat(editingCell.value);
      if (isNaN(newValue) || newValue <= 0) {
        toast.error('Please enter a valid amount');
        setEditingCell({ expenseId: null, field: null, value: '' });
        return;
      }
    }
    const expenseToUpdate = expenses.find(e => e.id === expenseId);
    const updatedExpense = { ...expenseToUpdate, [field]: newValue };
    onUpdateExpense(updatedExpense);
    toast.success(`${field} updated successfully!`);
    setEditingCell({ expenseId: null, field: null, value: '' });
  };

  const exportToExcel = () => {
    const exportData = expenses.map(e => ({
      Date: e.date,
      Description: e.description,
      Amount: `Rs. ${e.amount.toLocaleString()}`,
      Type: e.type,
      Category: e.category || 'Other'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finance_Report');
    XLSX.writeFile(wb, `Finance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text('Finance Report', 14, 10);
    doc.autoTable({
      head: [['Date', 'Description', 'Amount', 'Type', 'Category']],
      body: expenses.map(e => [e.date, e.description, `Rs. ${e.amount.toLocaleString()}`, e.type, e.category || 'Other']),
      startY: 20,
    });
    doc.save(`Finance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF');
  };

  return (
    <>
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center flex-wrap gap-3`}>
          <div className="flex items-center gap-2">
            <FiFileText className={`text-xl ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Expenses Record</h3>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEditingExpense(null); setFormData({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'Operational', category: 'Other' }); setShowExpenseForm(true); }} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 shadow-md">
              <FiPlus className="text-sm" /> Add Expense
            </button>
            <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md">
              <FiFileText className="text-sm" /> Excel
            </button>
            <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md">
              <FiDownload className="text-sm" /> PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                  <FiCalendar className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Date
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                  <FiFileText className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Description
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                  <FiDollarSign className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Amount
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                  <FiTool className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Type
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                  <FiPieChart className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Category
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <FiFileText className="text-6xl mx-auto text-gray-500" />
                    <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No expenses added yet</p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Click "Add Expense" to create a new expense record</p>
                   </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {editingCell.expenseId === exp.id && editingCell.field === 'date' ? 
                        <input type="date" value={editingCell.value} onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} onBlur={() => saveInlineEdit(exp.id, 'date')} className={`px-2 py-1 border rounded focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} autoFocus /> : 
                        <div onDoubleClick={() => startInlineEdit(exp.id, 'date', exp.date)} className={`cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <FiCalendar className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> {exp.date}
                        </div>}
                    </td>
                    <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {editingCell.expenseId === exp.id && editingCell.field === 'description' ? 
                        <input type="text" value={editingCell.value} onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} onBlur={() => saveInlineEdit(exp.id, 'description')} className={`px-2 py-1 border rounded w-48 focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} autoFocus /> : 
                        <div onDoubleClick={() => startInlineEdit(exp.id, 'description', exp.description)} className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">{exp.description}</div>}
                    </td>
                    <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {editingCell.expenseId === exp.id && editingCell.field === 'amount' ? 
                        <input type="number" value={editingCell.value} onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} onBlur={() => saveInlineEdit(exp.id, 'amount')} className={`w-32 px-2 py-1 border rounded focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} autoFocus step="0.01" min="0" /> : 
                        <div onDoubleClick={() => startInlineEdit(exp.id, 'amount', exp.amount)} className="cursor-pointer font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">Rs. {exp.amount.toLocaleString()}</div>}
                    </td>
                    <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {editingCell.expenseId === exp.id && editingCell.field === 'type' ? 
                        <select value={editingCell.value} onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} onBlur={() => saveInlineEdit(exp.id, 'type')} className={`px-2 py-1 border rounded focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} autoFocus>
                          {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select> : 
                        <div onDoubleClick={() => startInlineEdit(exp.id, 'type', exp.type)} className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">
                          <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            <FiTool className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> {exp.type}
                          </span>
                        </div>}
                    </td>
                    <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {editingCell.expenseId === exp.id && editingCell.field === 'category' ? 
                        <select value={editingCell.value} onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })} onBlur={() => saveInlineEdit(exp.id, 'category')} className={`px-2 py-1 border rounded focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} autoFocus>
                          {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select> : 
                        <div onDoubleClick={() => startInlineEdit(exp.id, 'category', exp.category || 'Other')} className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">
                          <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            <FiPieChart className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> {exp.category || 'Other'}
                          </span>
                        </div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>
              <button onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} className="text-gray-500 hover:text-gray-700 text-2xl"><FiX /></button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiCalendar className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Date *
                </label>
                <input type="date" name="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiFileText className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Description *
                </label>
                <input type="text" name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} placeholder="Enter description" required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiDollarSign className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Amount (Rs.) *
                </label>
                <input type="number" name="amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} placeholder="Enter amount" min="0" step="0.01" required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiTool className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Type
                </label>
                <select name="type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}>
                  {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiPieChart className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Category
                </label>
                <select name="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}>
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} className={`flex-1 px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                  <FiX className="text-sm" /> Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md">
                  <FiCheckCircle className="text-sm" /> {editingExpense ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpensesRecord;