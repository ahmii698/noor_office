// src/components/ReminderChecker.jsx
import React, { useState, useEffect } from 'react';
import { FiBell, FiMail, FiClock, FiCheckCircle, FiX } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReminderChecker = ({ darkMode }) => {
  const [pendingReminders, setPendingReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  // Check for pending reminders
  const checkReminders = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Use birthday-reminders/today endpoint (jo already kaam kar raha hai)
      const response = await api.get('/birthday-reminders/today');
      console.log('Reminders response:', response.data);
      
      // Extract birthday customers and pending reminders
      const birthdays = response.data.birthday_customers || [];
      const pending = response.data.pending_reminders || [];
      
      // Combine both lists for display
      const combined = [
        ...birthdays.map(c => ({
          id: `birthday-${c.id}`,
          customer_name: c.name,
          customer_phone: c.phone,
          customer_email: c.email,
          car_number: c.car_number,
          service_type: '🎂 Birthday',
          service_date: c.birthday,
          reminder_date: c.birthday,
          days_overdue: 0,
          is_birthday: true
        })),
        ...pending.map(r => ({
          ...r,
          is_birthday: false
        }))
      ];
      
      setPendingReminders(combined);
      
      if (combined.length > 0) {
        const birthdayCount = birthdays.length;
        const pendingCount = pending.length;
        let message = '';
        if (birthdayCount > 0) message += `🎂 ${birthdayCount} birthday(s) `;
        if (pendingCount > 0) message += `🔔 ${pendingCount} reminder(s) `;
        toast.success(`${message} today!`);
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
      setPendingReminders([]);
    } finally {
      setLoading(false);
    }
  };

  // Send reminder email to customer
  const sendReminder = async (reminderId) => {
    // Birthday reminders - just mark as notified
    if (reminderId.toString().startsWith('birthday-')) {
      toast.success('Birthday reminder noted! 🎂');
      setPendingReminders(prev => prev.filter(r => r.id !== reminderId));
      return;
    }
    
    setSending(prev => ({ ...prev, [reminderId]: true }));
    try {
      await api.post('/reminders/send-email', { reminder_id: reminderId });
      toast.success('Reminder email sent successfully!');
      setPendingReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSending(prev => ({ ...prev, [reminderId]: false }));
    }
  };

  // Send all reminders at once
  const sendAllReminders = async () => {
    if (pendingReminders.length === 0) {
      toast.error('No pending reminders');
      return;
    }
    
    setLoading(true);
    let successCount = 0;
    for (const reminder of pendingReminders) {
      // Skip birthday reminders
      if (reminder.id.toString().startsWith('birthday-')) {
        successCount++;
        continue;
      }
      try {
        await api.post('/reminders/send-email', { reminder_id: reminder.id });
        successCount++;
      } catch (error) {
        console.error('Error sending reminder:', error);
      }
    }
    setPendingReminders(prev => prev.filter(r => !r.id.toString().startsWith('birthday-')));
    setLoading(false);
    toast.success(`${successCount} reminders sent successfully!`);
  };

  // Auto check every hour
  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
    return () => clearInterval(interval);
  }, []);

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50`}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) checkReminders();
        }}
        className={`relative p-3 rounded-full shadow-lg transition ${
          darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
        } text-white`}
      >
        <FiBell className="text-2xl" />
        {pendingReminders.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {pendingReminders.length}
          </span>
        )}
        {loading && (
          <span className="absolute -bottom-1 -right-1">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </span>
        )}
      </button>

      {/* Modal for pending reminders */}
      {isOpen && (
        <div className={`absolute bottom-16 right-0 w-96 max-h-[500px] rounded-lg shadow-xl overflow-hidden ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          {/* Header */}
          <div className={`p-4 flex justify-between items-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <FiClock className="text-red-500" />
              Today's Reminders
              <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-red-500/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
                {pendingReminders.length}
              </span>
            </h3>
            <div className="flex gap-2">
              {pendingReminders.length > 0 && (
                <button
                  onClick={sendAllReminders}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send All'}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded hover:bg-gray-500/20 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                <FiX className="text-lg" />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {pendingReminders.length === 0 ? (
              <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <FiCheckCircle className="text-4xl text-green-500 mx-auto mb-2" />
                <p>No reminders today</p>
                <p className="text-sm">All good! 🎉</p>
              </div>
            ) : (
              pendingReminders.map(reminder => {
                const isBirthday = reminder.id?.toString().startsWith('birthday-');
                return (
                  <div key={reminder.id} className={`p-4 border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {isBirthday ? '🎂 ' : ''}{reminder.customer_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {reminder.car_number || 'No Car'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isBirthday 
                              ? 'bg-yellow-500/20 text-yellow-600' 
                              : darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {isBirthday ? '🎂 Birthday' : (reminder.service_type || 'Service')}
                          </span>
                          <span className="text-xs text-gray-400">
                            📅 {formatDate(reminder.reminder_date || reminder.service_date)}
                          </span>
                        </div>
                        {!isBirthday && reminder.days_overdue > 0 && (
                          <p className="text-xs text-red-500 mt-1 font-semibold">
                            ⚠️ {reminder.days_overdue} days overdue!
                          </p>
                        )}
                        {reminder.customer_email && (
                          <p className="text-xs text-gray-400 mt-1">
                            📧 {reminder.customer_email}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => sendReminder(reminder.id)}
                        disabled={sending[reminder.id]}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 ml-2 flex-shrink-0"
                      >
                        <FiMail className="text-xs" />
                        {sending[reminder.id] ? 'Sending...' : isBirthday ? 'Wish' : 'Remind'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div className={`p-2 text-center text-xs ${darkMode ? 'text-gray-500 border-t border-gray-700' : 'text-gray-400 border-t border-gray-200'}`}>
            Auto-checks every hour • {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderChecker;