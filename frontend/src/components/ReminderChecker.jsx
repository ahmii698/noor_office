// src/components/ReminderChecker.jsx
import React, { useState, useEffect } from 'react';
import { FiBell, FiMail, FiClock, FiCheckCircle } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReminderChecker = ({ darkMode }) => {
  const [pendingReminders, setPendingReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState({});

  // Check for pending reminders
  const checkReminders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reminders/pending');
      setPendingReminders(response.data);
      if (response.data.length > 0) {
        toast.success(`${response.data.length} customers need service reminder!`);
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send reminder email to customer
  const sendReminder = async (reminderId) => {
    setSending(prev => ({ ...prev, [reminderId]: true }));
    try {
      await api.post('/reminders/send-email', { reminder_id: reminderId });
      toast.success('Reminder email sent successfully!');
      // Remove from list
      setPendingReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
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
    
    for (const reminder of pendingReminders) {
      await sendReminder(reminder.id);
    }
    toast.success('All reminders sent!');
  };

  // Auto check every hour
  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
    return () => clearInterval(interval);
  }, []);

  // When invoice is created, add reminder
  const addReminderForInvoice = async (invoiceData, serviceType) => {
    try {
      await api.post('/reminders/add', {
        invoice_no: invoiceData.invoice_no,
        customer_name: invoiceData.customer_name,
        customer_phone: invoiceData.customer_phone,
        customer_email: invoiceData.customer_email,
        car_number: invoiceData.customer_car_number,
        service_type: serviceType
      });
      console.log('Reminder added for 6 months later');
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50`}>
      {/* Bell Icon with Badge */}
      <button
        onClick={checkReminders}
        className={`relative p-3 rounded-full shadow-lg transition ${
          darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
        } text-white`}
      >
        <FiBell className="text-2xl" />
        {pendingReminders.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {pendingReminders.length}
          </span>
        )}
      </button>

      {/* Modal for pending reminders */}
      {pendingReminders.length > 0 && (
        <div className={`absolute bottom-16 right-0 w-96 rounded-lg shadow-xl overflow-hidden ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className={`p-4 flex justify-between items-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <FiClock className="text-red-500" />
              Service Reminders ({pendingReminders.length})
            </h3>
            <button
              onClick={sendAllReminders}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Send All
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {pendingReminders.map(reminder => (
              <div key={reminder.id} className={`p-4 border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {reminder.customer_name}
                    </p>
                    <p className="text-sm text-gray-500">{reminder.car_number}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Service: {reminder.service_type} | {reminder.service_date}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Due since {reminder.reminder_date}
                    </p>
                  </div>
                  <button
                    onClick={() => sendReminder(reminder.id)}
                    disabled={sending[reminder.id]}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FiMail className="text-xs" />
                    {sending[reminder.id] ? 'Sending...' : 'Remind'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderChecker;