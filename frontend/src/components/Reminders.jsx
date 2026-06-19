// src/components/Reminders.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiBell, FiCalendar, FiUser, FiPhone, FiMail, FiCar, FiCheck, FiX, FiRefreshCw, FiGift, FiUsers } from 'react-icons/fi';
import api from '../services/api';

const Reminders = ({ darkMode }) => {
  const [birthdayCustomers, setBirthdayCustomers] = useState([]);
  const [pendingReminders, setPendingReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/birthday-reminders/today');
      console.log('✅ API Response:', response.data);
      
      setBirthdayCustomers(response.data.birthday_customers || []);
      setPendingReminders(response.data.pending_reminders || []);
      
      if (response.data.birthday_customers?.length > 0) {
        toast.success(`🎂 ${response.data.birthday_customers.length} birthday(s) today!`);
      }
    } catch (error) {
      console.error('❌ Error fetching reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiBell className="text-5xl text-red-500 animate-pulse mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading birthday reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <FiBell className="text-2xl text-red-500" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Birthday Reminders</h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Today's birthday reminders - Auto resets at midnight
              </p>
            </div>
          </div>
          <button
            onClick={fetchReminders}
            disabled={refreshing}
            className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
              refreshing ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ✅ TABLE FORMAT - Today's Birthdays */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
          <div className="flex items-center gap-3">
            <FiGift className="text-2xl text-yellow-500" />
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Today's Birthdays
            </h2>
            <span className={`text-sm px-3 py-1 rounded-full ${
              birthdayCustomers.length > 0 
                ? 'bg-yellow-500/20 text-yellow-600' 
                : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
              {birthdayCustomers.length} {birthdayCustomers.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>

        {birthdayCustomers.length === 0 ? (
          <div className="text-center py-16">
            <FiGift className="text-5xl text-gray-400 mx-auto mb-4" />
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No birthdays today
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Check back tomorrow for more birthdays!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Car Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Car Model</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Birthday</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {birthdayCustomers.map((customer, index) => (
                  <tr key={customer.id} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition`}>
                    <td className="px-6 py-4 text-sm text-center font-medium">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
                        }`}>
                          <FiUser className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        </div>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {customer.phone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {customer.car_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {customer.car_model || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-yellow-500" />
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(customer.birthday)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                        }`}>
                          🎂 Today
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          toast.success(`🎉 Happy Birthday ${customer.name}!`);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 mx-auto ${
                          darkMode 
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        <FiGift className="text-sm" />
                        Wish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Reminders - Table Format */}
      {pendingReminders.length > 0 && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
            <div className="flex items-center gap-3">
              <FiBell className="text-2xl text-red-500" />
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Pending Notifications
              </h2>
              <span className={`text-sm px-3 py-1 rounded-full bg-red-500/20 text-red-500`}>
                {pendingReminders.length}
              </span>
            </div>
            <button
              onClick={() => {
                pendingReminders.forEach(r => {
                  toast.success(`📧 Reminder sent to ${r.customer_name}`);
                });
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
            >
              Send All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Birthday</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {pendingReminders.map((reminder, index) => (
                  <tr key={reminder.id} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition`}>
                    <td className="px-6 py-4 text-sm text-center font-medium">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                        }`}>
                          <FiUser className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {reminder.customer_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {reminder.customer_phone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {reminder.customer_email || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-yellow-500" />
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(reminder.birthday_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            toast.success(`📧 Reminder sent to ${reminder.customer_name}`);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                            darkMode 
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <FiMail className="text-sm" />
                          Send
                        </button>
                        <button
                          onClick={() => {
                            setPendingReminders(prev => prev.filter(r => r.id !== reminder.id));
                            toast.success('Reminder dismissed');
                          }}
                          className={`p-2 rounded-lg transition ${
                            darkMode 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Auto-checks every hour • {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default Reminders;