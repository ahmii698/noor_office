// src/components/finance/UpcomingPayments.jsx
import React, { useState, useEffect } from 'react';
import { FiClock, FiCalendar, FiAlertCircle, FiFileText, FiDollarSign, FiUsers, FiHome, FiZap, FiPlus, FiX, FiEdit2, FiTrash2, FiSave, FiLoader } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';

const UpcomingPayments = ({ darkMode }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    type: 'bill',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    recurring: 'one-time'
  });

  const reminderTypes = [
    { value: 'salary', label: 'Salary', icon: FiUsers, color: 'green' },
    { value: 'rent', label: 'Rent', icon: FiHome, color: 'purple' },
    { value: 'bill', label: 'Bill', icon: FiZap, color: 'blue' },
    { value: 'other', label: 'Other', icon: FiAlertCircle, color: 'red' }
  ];

  // Fetch reminders from API
  const fetchReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reminders');
      if (response.data && Array.isArray(response.data)) {
        // Transform API data to match component format
        const transformedReminders = response.data.map(reminder => ({
          id: reminder.id,
          type: reminder.type,
          date: reminder.reminder_date,
          description: reminder.description,
          amount: reminder.amount,
          recurring: reminder.recurring || 'one-time'
        }));
        setReminders(transformedReminders);
      } else {
        setReminders([]);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError('Failed to load reminders. Please check your connection.');
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  // Add new reminder
  const handleAddReminder = async (reminderData) => {
    try {
      const response = await api.post('/reminders', {
        type: reminderData.type,
        date: reminderData.date,
        description: reminderData.description,
        amount: reminderData.amount,
        recurring: reminderData.recurring
      });
      
      if (response.data) {
        toast.success('Reminder added successfully!');
        fetchReminders(); // Refresh list
        return true;
      }
    } catch (err) {
      console.error('Error adding reminder:', err);
      toast.error(err.response?.data?.message || 'Failed to add reminder');
      return false;
    }
  };

  // Update reminder
  const handleUpdateReminder = async (reminderData) => {
    try {
      const response = await api.put(`/reminders/${reminderData.id}`, {
        type: reminderData.type,
        reminder_date: reminderData.date,
        description: reminderData.description,
        amount: reminderData.amount,
        recurring: reminderData.recurring
      });
      
      if (response.data) {
        toast.success('Reminder updated successfully!');
        fetchReminders(); // Refresh list
        return true;
      }
    } catch (err) {
      console.error('Error updating reminder:', err);
      toast.error(err.response?.data?.message || 'Failed to update reminder');
      return false;
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      toast.success('Reminder deleted successfully!');
      fetchReminders(); // Refresh list
      return true;
    } catch (err) {
      console.error('Error deleting reminder:', err);
      toast.error(err.response?.data?.message || 'Failed to delete reminder');
      return false;
    }
  };

  // Load reminders on component mount
  useEffect(() => {
    fetchReminders();
  }, []);

  const handleAddClick = () => {
    setEditingReminder(null);
    setFormData({
      type: 'bill',
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      recurring: 'one-time'
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      type: reminder.type,
      date: reminder.date,
      description: reminder.description,
      amount: reminder.amount,
      recurring: reminder.recurring || 'one-time'
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      await handleDeleteReminder(id);
    }
  };

  const handleSubmit = async (e) => {
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

    let success;
    if (editingReminder) {
      success = await handleUpdateReminder({
        id: editingReminder.id,
        ...formData,
        amount: amountNum
      });
    } else {
      success = await handleAddReminder({
        ...formData,
        amount: amountNum
      });
    }

    if (success) {
      setIsModalOpen(false);
      setEditingReminder(null);
      setFormData({
        type: 'bill',
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        recurring: 'one-time'
      });
    }
  };

  const getTypeIcon = (type) => {
    const found = reminderTypes.find(t => t.value === type);
    const Icon = found?.icon || FiAlertCircle;
    return <Icon className="text-xs" />;
  };

  const getTypeColor = (type) => {
    const found = reminderTypes.find(t => t.value === type);
    const color = found?.color || 'red';
    const colors = {
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[color] || colors.red;
  };

  // Filter reminders for next 30 days
  const getUpcomingReminders = () => {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    
    return reminders.filter(r => {
      const reminderDate = new Date(r.date);
      return reminderDate >= today && reminderDate <= next30Days;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const upcomingReminders = getUpcomingReminders();

  if (loading) {
    return (
      <div className={`min-h-[200px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="text-center">
          <FiLoader className="text-4xl text-red-500 animate-spin mx-auto mb-3" />
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center flex-wrap gap-3`}>
          <div className="flex items-center gap-2">
            <FiClock className="text-xl text-red-500" />
            <div>
              <h3 className="text-lg font-semibold">Upcoming Payments & Reminders</h3>
              <p className="text-sm opacity-70 mt-1">Salary, bills, and other recurring payments due in next 30 days</p>
            </div>
          </div>
          <button
            onClick={handleAddClick}
            className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2 shadow-md"
          >
            <FiPlus className="text-sm" /> Add Reminder
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiCalendar className="inline mr-1" /> Date</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiAlertCircle className="inline mr-1" /> Type</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiFileText className="inline mr-1" /> Description</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiDollarSign className="inline mr-1" /> Amount</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiClock className="inline mr-1" /> Status</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {upcomingReminders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <FiClock className="text-6xl mx-auto text-gray-400" />
                    <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No upcoming reminders</p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Click "Add Reminder" to create a new reminder</p>
                   </td>
                </tr>
              ) : (
                upcomingReminders.map(reminder => {
                  const daysLeft = Math.ceil((new Date(reminder.date) - new Date()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysLeft < 0;
                  return (
                    <tr key={reminder.id} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4">{format(new Date(reminder.date), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${getTypeColor(reminder.type)}`}>
                          {getTypeIcon(reminder.type)}
                          {reminder.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">{reminder.description}</td>
                      <td className="px-6 py-4 font-semibold text-red-500">Rs. {reminder.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${
                          isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          daysLeft <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          <FiClock className="text-xs" />
                          {isOverdue ? 'Overdue' : `${daysLeft} days left`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditClick(reminder)}
                            className="p-1.5 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
                            title="Edit reminder"
                          >
                            <FiEdit2 className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(reminder.id)}
                            className="p-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                            title="Delete reminder"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reminder Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                >
                  {reminderTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Due Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description *</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Employee Salary, Electricity Bill, etc."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount (Rs.) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Recurring</label>
                <select
                  name="recurring"
                  value={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                >
                  <option value="one-time">One Time</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiSave className="text-sm" />
                  {editingReminder ? 'Update Reminder' : 'Add Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UpcomingPayments;