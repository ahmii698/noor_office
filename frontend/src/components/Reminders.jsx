// src/components/Reminders.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  FiBell, FiCalendar, FiUser, FiPhone, FiMail, FiTruck,
  FiCheck, FiX, FiRefreshCw, FiGift, FiUsers, FiTool, 
  FiDroplet, FiEdit2, FiSend, FiMessageSquare, 
  FiClock, FiAlertTriangle, FiMessageCircle, FiTrash2
} from 'react-icons/fi';
import api from '../services/api';

const Reminders = ({ darkMode }) => {
  const [activeTab, setActiveTab] = useState('birthday');
  const [birthdayCustomers, setBirthdayCustomers] = useState([]);
  const [tuningReminders, setTuningReminders] = useState([]);
  const [oilChangeReminders, setOilChangeReminders] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    service_type: '',
    message_template: '',
    whatsapp_number: ''
  });

  const tabs = [
    { id: 'birthday', label: '🎂 Birthday', icon: FiGift, count: birthdayCustomers.length },
    { id: 'tuning', label: '🔧 Tuning', icon: FiTool, count: tuningReminders.length },
    { id: 'oil_change', label: '🛢️ Oil Change', icon: FiDroplet, count: oilChangeReminders.length },
  ];

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // ✅ Birthday reminders from API
      const birthdayRes = await api.get('/birthday-reminders/today');
      setBirthdayCustomers(birthdayRes.data.birthday_customers || []);
      
      // ✅ Service reminders from invoice_items
      const serviceRes = await api.get('/service-reminders/all');
      setTuningReminders(serviceRes.data.tuning || []);
      setOilChangeReminders(serviceRes.data.oil_change || []);
      setMessages(serviceRes.data.messages || {});
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
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

  const getDaysAgo = (date) => {
    if (!date) return 0;
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // ✅ Direct chat open karne ke liye function
  const sendWhatsApp = (phone, message) => {
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('92') && cleanPhone.length > 0) {
      cleanPhone = '92' + cleanPhone;
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank');
  };

  // ✅ Generate message with all placeholders
  const generateMessage = (reminder, type) => {
    const template = messages[type]?.message_template || '';
    let message = template
      .replace(/{customer_name}/g, reminder.customer_name || 'N/A')
      .replace(/{car_number}/g, reminder.car_number || 'N/A')
      .replace(/{car_model}/g, reminder.car_model || 'N/A')
      .replace(/{service_date}/g, formatDate(reminder.service_date))
      .replace(/{phone}/g, reminder.customer_phone || 'N/A')
      .replace(/{service_name}/g, reminder.service_name || 'N/A')
      .replace(/{service_category}/g, reminder.service_category || 'N/A')
      .replace(/{quantity}/g, reminder.quantity || 1)
      .replace(/{price}/g, reminder.price || 0)
      .replace(/{total}/g, reminder.total || 0);
    return message;
  };

  // ✅ Mark as sent (tracking purpose)
  const markAsSent = async (id, type) => {
    try {
      await api.put(`/service-reminders/mark-sent/${id}`);
      toast.success('Reminder marked as sent!');
      fetchAllData();
      window.dispatchEvent(new Event('reminder-update'));
    } catch (error) {
      console.error('Error marking as sent:', error);
      toast.error('Failed to mark as sent');
    }
  };

  // ✅ MANUAL CLEAR FUNCTION - Birthday ke liye
  const clearBirthdayReminder = async (id, customerName) => {
    try {
      await api.delete(`/birthday-reminders/${id}`);
      toast.success(`✅ ${customerName} ka birthday reminder clear ho gaya!`);
      fetchAllData();
      window.dispatchEvent(new Event('reminder-update'));
    } catch (error) {
      console.error('Error clearing birthday reminder:', error);
      if (error.response?.status === 404) {
        toast.error('Reminder already cleared or not found');
      } else {
        toast.error('Failed to clear reminder');
      }
    }
  };

  // ✅ MANUAL CLEAR FUNCTION - Service Reminder ke liye (Tuning / Oil Change)
  const clearServiceReminder = async (id, customerName, type) => {
    try {
      await api.delete(`/service-reminders/${id}`);
      toast.success(`✅ ${customerName} ka ${type} reminder clear ho gaya!`);
      fetchAllData();
      window.dispatchEvent(new Event('reminder-update'));
    } catch (error) {
      console.error('Error clearing service reminder:', error);
      if (error.response?.status === 404) {
        toast.error('Reminder already cleared or not found');
      } else {
        toast.error('Failed to clear reminder');
      }
    }
  };

  const openEditModal = (type) => {
    const msg = messages[type] || { message_template: '', whatsapp_number: '03322751363' };
    setEditForm({
      service_type: type,
      message_template: msg.message_template || '',
      whatsapp_number: msg.whatsapp_number || '03322751363'
    });
    setShowEditModal(true);
  };

  const saveMessage = async () => {
    try {
      await api.post(`/service-reminders/message/${editForm.service_type}`, {
        message_template: editForm.message_template,
        whatsapp_number: editForm.whatsapp_number
      });
      toast.success('Message updated successfully!');
      setShowEditModal(false);
      fetchAllData();
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Failed to save message');
    }
  };

  const sendAll = async (type, reminders) => {
    if (reminders.length === 0) {
      toast.error(`No ${type} reminders to send`);
      return;
    }
    for (const reminder of reminders) {
      const message = generateMessage(reminder, type);
      sendWhatsApp(reminder.customer_phone, message);
      await markAsSent(reminder.id, type);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    toast.success(`All ${type} reminders sent!`);
  };

  const getCurrentData = () => {
    switch(activeTab) {
      case 'birthday': return birthdayCustomers;
      case 'tuning': return tuningReminders;
      case 'oil_change': return oilChangeReminders;
      default: return [];
    }
  };

  const getCurrentType = () => {
    switch(activeTab) {
      case 'birthday': return 'birthday';
      case 'tuning': return 'tuning';
      case 'oil_change': return 'oil_change';
      default: return 'birthday';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiBell className="text-5xl text-red-500 animate-pulse mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading reminders...</p>
        </div>
      </div>
    );
  }

  const currentData = getCurrentData();
  const currentType = getCurrentType();

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
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Reminders</h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Birthday, Tuning & Oil Change reminders
              </p>
            </div>
          </div>
          <button
            onClick={fetchAllData}
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

      {/* Tabs */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
                  isActive
                    ? darkMode
                      ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                      : 'bg-red-50 text-red-600 border-b-2 border-red-500'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="text-lg" />
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tab.count > 0
                    ? isActive
                      ? 'bg-red-500/20 text-red-500'
                      : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                    : darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {currentData.length === 0 ? (
            <div className="text-center py-12">
              {activeTab === 'birthday' && <FiGift className="text-5xl text-gray-400 mx-auto mb-4" />}
              {activeTab === 'tuning' && <FiTool className="text-5xl text-gray-400 mx-auto mb-4" />}
              {activeTab === 'oil_change' && <FiDroplet className="text-5xl text-gray-400 mx-auto mb-4" />}
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No {activeTab === 'birthday' ? 'birthday' : activeTab === 'tuning' ? 'tuning' : 'oil change'} reminders
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {activeTab === 'birthday' ? 'Check back tomorrow for birthdays!' : 'All caught up!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Car</th>
                    {activeTab === 'birthday' ? (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Birthday</th>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Service</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Service Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Days Ago</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Action</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Clear</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {currentData.map((item, index) => {
                    const isBirthday = activeTab === 'birthday';
                    const name = isBirthday ? item.name : item.customer_name;
                    const phone = isBirthday ? item.phone : item.customer_phone;
                    const car = isBirthday ? item.car_number || 'N/A' : item.car_number || 'N/A';
                    const date = isBirthday ? item.birthday : item.service_date;
                    const daysAgo = isBirthday ? 0 : getDaysAgo(item.service_date);
                    
                    let message = '';
                    if (isBirthday) {
                      message = messages.birthday?.message_template || '🎂 Happy Birthday {customer_name}!';
                      message = message.replace(/{customer_name}/g, name);
                    } else {
                      message = generateMessage(item, activeTab);
                    }
                    
                    return (
                      <tr key={item.id || index} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 text-sm text-center">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isBirthday 
                                ? darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
                                : activeTab === 'tuning'
                                  ? darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                                  : darkMode ? 'bg-green-500/20' : 'bg-green-100'
                            }`}>
                              <FiUser className={`${
                                isBirthday 
                                  ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                                  : activeTab === 'tuning'
                                    ? darkMode ? 'text-blue-400' : 'text-blue-600'
                                    : darkMode ? 'text-green-400' : 'text-green-600'
                              }`} />
                            </div>
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{phone}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            {car}
                          </span>
                        </td>
                        {isBirthday ? (
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                              🎂 {formatDate(date)}
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                {item.service_name || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(date)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                daysAgo >= 180 ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-600'
                              }`}>
                                {daysAgo} days
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              sendWhatsApp(phone, message);
                              if (!isBirthday) {
                                markAsSent(item.id, activeTab);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 mx-auto ${
                              darkMode ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            <FiMessageCircle className="text-sm" />
                            {isBirthday ? 'Wish' : 'Send'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              if (isBirthday) {
                                clearBirthdayReminder(item.id, name);
                              } else {
                                clearServiceReminder(item.id, name, activeTab);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 mx-auto ${
                              darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            <FiTrash2 className="text-sm" />
                            Clear
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Send All Button */}
          {activeTab !== 'birthday' && currentData.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => sendAll(activeTab, currentData)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
              >
                <FiSend className="text-sm" />
                Send All {activeTab === 'tuning' ? 'Tuning' : 'Oil Change'} Reminders
              </button>
            </div>
          )}

          {/* Edit Message Button */}
          {activeTab !== 'birthday' && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => openEditModal(activeTab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FiEdit2 className="text-sm" />
                Edit Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Auto-checks every hour • {new Date().toLocaleTimeString()}
      </div>

      {/* Edit Message Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-2xl w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FiMessageSquare className="text-red-500" />
                Edit {editForm.service_type?.replace('_', ' ').toUpperCase()} Message
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Message Template
                  <span className="text-xs text-gray-400 block mt-1">
                    Use {'{customer_name}'}, {'{car_number}'}, {'{car_model}'}, {'{service_date}'}, {'{phone}'}, {'{service_name}'}, {'{quantity}'}, {'{price}'}, {'{total}'} as placeholders
                  </span>
                </label>
                <textarea
                  value={editForm.message_template}
                  onChange={(e) => setEditForm({ ...editForm, message_template: e.target.value })}
                  rows="5"
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={editForm.whatsapp_number}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g., 03322751363"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveMessage}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiCheck className="text-sm" /> Save Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;