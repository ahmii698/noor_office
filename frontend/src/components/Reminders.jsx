// src/components/Reminders.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  FiBell, FiCalendar, FiUser, FiPhone, FiMail, FiTruck,
  FiCheck, FiX, FiRefreshCw, FiGift, FiUsers, FiTool, 
  FiDroplet, FiEdit2, FiSend, FiMessageSquare, 
  FiClock, FiAlertTriangle, FiMessageCircle, FiTrash2,
  FiStar, FiHeart, FiDollarSign, FiEdit,
  FiEye
} from 'react-icons/fi';
import api from '../services/api';

// ✅ Bank Names List - Same as Billing
const BANK_NAMES = [
  { value: 'allied', label: 'Allied Bank' },
  { value: 'alfalah', label: 'Bank Alfalah' },
  { value: 'hbl', label: 'HBL (Habib Bank Limited)' },
  { value: 'meezan', label: 'Meezan Bank' },
  { value: 'ubl', label: 'UBL (United Bank Limited)' },
];

const Reminders = ({ darkMode }) => {
  const [activeTab, setActiveTab] = useState('birthday');
  const [birthdayCustomers, setBirthdayCustomers] = useState([]);
  const [tuningReminders, setTuningReminders] = useState([]);
  const [oilChangeReminders, setOilChangeReminders] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    service_type: '',
    message_template: '',
    whatsapp_number: ''
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Payment History States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ✅ Get payment method display with bank name
  const getPaymentMethodDisplay = () => {
    if (paymentMethod === 'cash') return 'Cash';
    if (paymentMethod === 'card') return 'Credit/Debit Card';
    if (paymentMethod === 'bank') {
      const bank = BANK_NAMES.find(b => b.value === selectedBank);
      return bank ? `Bank Transfer (${bank.label})` : 'Bank Transfer';
    }
    if (paymentMethod === 'online') return 'Mobile Wallet';
    return paymentMethod;
  };

  // ✅ Check user role on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setIsAdmin(userData.role === 'admin');
    }
  }, []);

  // ✅ Base tabs (everyone can see)
  const baseTabs = [
    { id: 'birthday', label: 'Birthday', icon: FiGift, count: birthdayCustomers.length },
    { id: 'tuning', label: 'Tuning', icon: FiTool, count: tuningReminders.length },
    { id: 'oil_change', label: 'Oil Change', icon: FiDroplet, count: oilChangeReminders.length },
  ];

  // ✅ Admin only tabs
  const adminTabs = [
    { id: 'pending_payments', label: 'Pending Payments', icon: FiDollarSign, count: pendingPayments.length },
  ];

  // ✅ All tabs based on role
  const tabs = [...baseTabs, ...(isAdmin ? adminTabs : [])];

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const birthdayRes = await api.get('/birthday-reminders/today');
      setBirthdayCustomers(birthdayRes.data.birthday_customers || []);
      
      const serviceRes = await api.get('/service-reminders/all');
      setTuningReminders(serviceRes.data.tuning || []);
      setOilChangeReminders(serviceRes.data.oil_change || []);
      setMessages(serviceRes.data.messages || {});
      
      if (isAdmin) {
        const paymentRes = await api.get('/pending-payments');
        setPendingPayments(paymentRes.data.data || []);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Auto-refresh every 3 hours (10800000 milliseconds)
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10800000); // 3 hours in milliseconds
    return () => clearInterval(interval);
  }, [isAdmin]);

  // ✅ Fetch payment history for specific invoice
  const fetchPaymentHistory = async (invoiceNo) => {
    setLoadingHistory(true);
    setSelectedInvoiceNo(invoiceNo);
    try {
      const response = await api.get(`/payment-history/${invoiceNo}`);
      if (response.data.success) {
        setPaymentHistory(response.data.data);
        setShowHistoryModal(true);
      } else {
        toast.error('Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDaysAgo = (date) => {
    if (!date) return 0;
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

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

  // ✅ Handle payment update with payment method + bank name + date/time
  const handlePaymentUpdate = async () => {
    if (!isAdmin) {
      toast.error('Only admin can record payments');
      return;
    }
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedPayment.remaining_amount) {
      toast.error(`Amount cannot exceed remaining balance: Rs. ${selectedPayment.remaining_amount.toLocaleString()}`);
      return;
    }

    if (paymentMethod === 'bank' && !selectedBank) {
      toast.error('Please select a bank for bank transfer');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentMethodDisplay = getPaymentMethodDisplay();
      const currentDateTime = new Date().toISOString();
      
      await api.put(`/pending-payments/${selectedPayment.id}`, { 
        amount,
        payment_method: paymentMethodDisplay,
        paid_at: currentDateTime
      });
      
      const formattedTime = new Date(currentDateTime).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi'
      });
      
      toast.success(`✅ Rs. ${amount.toLocaleString()} payment recorded via ${paymentMethodDisplay} at ${formattedTime}!`);
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setSelectedBank('');
      fetchAllData();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error(error.response?.data?.message || 'Failed to update payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = (payment) => {
    if (!isAdmin) {
      toast.error('Only admin can record payments');
      return;
    }
    setSelectedPayment(payment);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setSelectedBank('');
    setShowPaymentModal(true);
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

  const getCurrentData = () => {
    switch(activeTab) {
      case 'birthday': return birthdayCustomers;
      case 'tuning': return tuningReminders;
      case 'oil_change': return oilChangeReminders;
      case 'pending_payments': return pendingPayments;
      default: return [];
    }
  };

  const getCurrentType = () => {
    switch(activeTab) {
      case 'birthday': return 'birthday';
      case 'tuning': return 'tuning';
      case 'oil_change': return 'oil_change';
      case 'pending_payments': return 'pending_payments';
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
  const isPendingPayments = activeTab === 'pending_payments';

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
                {isAdmin ? 'Birthday, Tuning, Oil Change & Pending Payments reminders' : 'Birthday, Tuning & Oil Change reminders'}
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
        <div className="flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition flex items-center justify-center gap-2 whitespace-nowrap ${
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
              {activeTab === 'pending_payments' && <FiDollarSign className="text-5xl text-gray-400 mx-auto mb-4" />}
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No {activeTab === 'birthday' ? 'birthday' : activeTab === 'tuning' ? 'tuning' : activeTab === 'oil_change' ? 'oil change' : 'pending payments'} reminders
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {activeTab === 'birthday' ? 'Check back tomorrow for birthdays!' : activeTab === 'pending_payments' ? 'All payments are up to date!' : 'All caught up!'}
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
                    ) : activeTab === 'pending_payments' ? (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Paid</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Pending</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Service</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Service Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Days Ago</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Action</th>
                    {!isPendingPayments && <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Clear</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {currentData.map((item, index) => {
                    const isBirthday = activeTab === 'birthday';
                    const isPending = activeTab === 'pending_payments';
                    const name = isBirthday ? item.name : item.customer_name;
                    const phone = isBirthday ? item.phone : item.customer_phone;
                    const car = isBirthday ? item.car_number || 'N/A' : item.car_number || 'N/A';
                    const date = isBirthday ? item.birthday : item.service_date;
                    const daysAgo = isBirthday ? 0 : getDaysAgo(item.service_date);
                    
                    let message = '';
                    if (isBirthday) {
                      message = messages.birthday?.message_template || 'Happy Birthday {customer_name}!';
                      message = message.replace(/{customer_name}/g, name);
                    } else if (!isPending) {
                      message = generateMessage(item, activeTab);
                    }
                    
                    return (
                      <tr key={item.id || index} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 text-sm text-center">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{phone}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            {car}
                          </span>
                        </td>
                        {isBirthday ? (
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                              <FiStar className="text-xs" /> {formatDate(date)}
                            </span>
                          </td>
                        ) : isPending ? (
                          <>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                {item.invoice_no}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Rs. {item.total_amount?.toLocaleString() || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                              Rs. {item.paid_amount?.toLocaleString() || 0}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                item.remaining_amount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                              }`}>
                                Rs. {item.remaining_amount?.toLocaleString() || 0}
                              </span>
                            </td>
                          </>
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
                          {isPending ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openPaymentModal(item)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                                  darkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                <FiEdit className="text-sm" />
                                Record Payment
                              </button>
                              <button
                                onClick={() => fetchPaymentHistory(item.invoice_no)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                                  darkMode ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}
                                title="View Payment History"
                              >
                                <FiEye className="text-sm" />
                                History
                              </button>
                            </div>
                          ) : (
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
                          )}
                        </td>
                        {!isPending && (
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
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit Message Button - Only for service reminders */}
          {activeTab !== 'birthday' && activeTab !== 'pending_payments' && (
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
        Auto-checks every 3 hours • {new Date().toLocaleTimeString()}
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

      {/* ✅ Payment Modal - WITH BANK DROPDOWN like Billing */}
      {showPaymentModal && selectedPayment && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FiDollarSign className="text-red-500" />
                Record Payment
              </h3>
              <button 
                onClick={() => { setShowPaymentModal(false); setSelectedPayment(null); setPaymentAmount(''); setPaymentMethod('cash'); setSelectedBank(''); }} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FiX />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Customer</p>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedPayment.customer_name}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Invoice #</p>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedPayment.invoice_no}</p>
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Rs. {selectedPayment.total_amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Paid</p>
                    <p className={`font-semibold text-green-600 dark:text-green-400`}>Rs. {selectedPayment.paid_amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                    <p className={`font-semibold text-red-600 dark:text-red-400`}>Rs. {selectedPayment.remaining_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Payment Amount (Rs.)
                  <span className="text-xs text-gray-400 block mt-1">Max: Rs. {selectedPayment.remaining_amount?.toLocaleString()}</span>
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  min="0.01"
                  max={selectedPayment.remaining_amount}
                  step="0.01"
                  autoFocus
                />
              </div>

              {/* Payment Method Dropdown */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'bank') {
                      setSelectedBank('');
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="online">Mobile Wallet</option>
                </select>
              </div>

              {/* Bank Selection - Only when Bank Transfer selected */}
              {paymentMethod === 'bank' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Bank
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">-- Select Bank --</option>
                    {BANK_NAMES.map((bank) => (
                      <option key={bank.value} value={bank.value}>
                        {bank.label}
                      </option>
                    ))}
                  </select>
                  {!selectedBank && paymentMethod === 'bank' && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                      ⚠️ Please select a bank
                    </p>
                  )}
                  {selectedBank && paymentMethod === 'bank' && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      ✅ Selected: {BANK_NAMES.find(b => b.value === selectedBank)?.label}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setSelectedPayment(null); setPaymentAmount(''); setPaymentMethod('cash'); setSelectedBank(''); }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePaymentUpdate}
                  disabled={isSubmitting || (paymentMethod === 'bank' && !selectedBank)}
                  className={`flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md ${
                    isSubmitting || (paymentMethod === 'bank' && !selectedBank) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiCheck className="text-sm" /> Record Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Payment History Modal - WITH CORRECT TIME ZONE */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-2xl w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FiClock className="text-purple-500" />
                Payment History - {selectedInvoiceNo}
              </h3>
              <button 
                onClick={() => { setShowHistoryModal(false); setPaymentHistory([]); }} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FiX />
              </button>
            </div>
            <div className="p-6">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading history...</p>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FiClock className="text-4xl text-gray-400 mx-auto mb-3" />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No payment history found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Payment Method</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Date & Time</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase">Received By</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {paymentHistory.map((payment, index) => (
                          <tr key={payment.id || index} className={darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2 text-sm text-center">{index + 1}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400">
                              Rs. {parseFloat(payment.amount).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {payment.payment_method || 'Cash'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {payment.paid_at ? (
                                new Date(payment.paid_at).toLocaleString('en-US', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'Asia/Karachi'
                                })
                              ) : (
                                <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                              }`}>
                                Admin
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} font-semibold`}>
                        <tr>
                          <td colSpan="1" className="px-4 py-3 text-right">Total Paid:</td>
                          <td className="px-4 py-3 text-green-600 dark:text-green-400">
                            Rs. {paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}
                          </td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => { setShowHistoryModal(false); setPaymentHistory([]); }}
                  className={`px-4 py-2 rounded-lg transition ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Close
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