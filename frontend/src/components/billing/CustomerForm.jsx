// src/components/billing/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  FiUser, FiPhone, FiCalendar, FiClock, FiTool, FiPackage, 
  FiCheckCircle, FiAlertCircle, FiX, FiArrowRight, FiLoader, FiMail
} from 'react-icons/fi';
import api from '../../services/api';

const CustomerForm = ({ onCustomerSubmit, initialData, darkMode }) => {
  const [customerDetails, setCustomerDetails] = useState(initialData || {
    name: '',
    phone: '',
    email: '',
    carNumber: '',
    carModel: '',
    birthday: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // ✅ Invoice Date & Time states
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [invoiceTime, setInvoiceTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  
  const [customerHistory, setCustomerHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // ✅ Birthday validation error
  const [birthdayError, setBirthdayError] = useState('');
  
  // ✅ Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Check user role on mount
  useEffect(() => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        const role = userData?.role || 'employee';
        setIsAdmin(role === 'admin');
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
      setIsAdmin(false);
    }
  }, []);

  // ✅ FORCE UPDATE - Always set current date when component mounts
  useEffect(() => {
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];
    setInvoiceDate(currentDate);
    console.log('📅 Current date set to:', currentDate);
  }, []);

  // ✅ Update invoiceDate when initialData changes (for restored data)
  useEffect(() => {
    if (initialData?.date) {
      const datePart = initialData.date.split('T')[0];
      if (datePart) {
        setInvoiceDate(datePart);
      }
    }
  }, [initialData]);

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  };

  // ✅ Format date from YYYY-MM-DD (or ISO datetime) to MM/DD/YYYY for display
  const formatToDisplay = (dateStr) => {
    if (!dateStr) return '';
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${month}/${day}/${year}`;
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }
    
    return dateStr;
  };

  // ✅ Format date from MM/DD/YYYY to YYYY-MM-DD for API
  const formatToAPI = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  // ✅ Validate birthday format
  const validateBirthday = (value) => {
    if (!value) {
      setBirthdayError('');
      return true;
    }
    
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      setBirthdayError('Please use mm/dd/yyyy format');
      return false;
    }
    
    const parts = value.split('/');
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (month < 1 || month > 12) {
      setBirthdayError('Month must be between 1-12');
      return false;
    }
    
    if (day < 1 || day > 31) {
      setBirthdayError('Day must be between 1-31');
      return false;
    }
    
    const checkDate = new Date(year, month - 1, day);
    if (checkDate.getMonth() !== month - 1 || checkDate.getDate() !== day) {
      setBirthdayError('Invalid date (check month/day combination)');
      return false;
    }
    
    if (year < 1900 || year > 2100) {
      setBirthdayError('Please enter a valid year (1900-2100)');
      return false;
    }
    
    setBirthdayError('');
    return true;
  };

  // ✅ Handle birthday change with auto-slash
  const handleBirthdayChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9/]/g, '');
    
    if (value.length === 2 && !value.includes('/')) {
      value = value + '/';
    } else if (value.length === 5 && value.split('/').length === 2 && !value.endsWith('/')) {
      const parts = value.split('/');
      if (parts.length === 2 && parts[1].length === 2) {
        value = value + '/';
      }
    }
    
    setCustomerDetails(prev => ({ ...prev, birthday: value }));
    
    if (value.length === 10) {
      validateBirthday(value);
    } else {
      setBirthdayError('');
    }
  };

  // Search customer history when phone number changes
  useEffect(() => {
    const searchCustomerHistory = async () => {
      if (customerDetails.phone && customerDetails.phone.length >= 4) {
        setSearching(true);
        try {
          let customerData = null;
          try {
            const customerRes = await api.get(`/customers/phone/${customerDetails.phone}`);
            if (customerRes.data && customerRes.data.id) {
              customerData = customerRes.data;
            }
          } catch (err) {
            console.log('Customer not found in customers table, checking invoices...');
          }

          const response = await api.get('/invoices');
          if (response.data && Array.isArray(response.data)) {
            const history = response.data
              .filter(inv => inv.customer_phone === customerDetails.phone)
              .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
              .slice(0, 10);
            
            setCustomerHistory(history);
            
            if (history.length > 0) {
              setShowHistory(true);
            } else {
              setShowHistory(false);
            }
            
            if (customerData || history.length > 0) {
              const lastInvoice = history[0] || {};
              
              const birthdayValue = customerData?.birthday 
                ? formatToDisplay(customerData.birthday) 
                : lastInvoice.customer_birthday 
                  ? formatToDisplay(lastInvoice.customer_birthday)
                  : '';
              
              setCustomerDetails(prev => ({
                ...prev,
                name: customerData?.name || lastInvoice.customer_name || prev.name,
                email: customerData?.email || lastInvoice.customer_email || prev.email,
                carNumber: customerData?.car_number || lastInvoice.customer_car_number || prev.carNumber,
                carModel: customerData?.car_model || lastInvoice.customer_car_model || prev.carModel,
                birthday: birthdayValue || prev.birthday || '',
              }));
              
              if (customerData?.name || lastInvoice.customer_name) {
                toast.success(`Welcome back ${customerData?.name || lastInvoice.customer_name}!`, { duration: 2000 });
              }
            }
          }
        } catch (err) {
          console.error('Error fetching customer history:', err);
        } finally {
          setSearching(false);
        }
      } else {
        setShowHistory(false);
        setCustomerHistory([]);
      }
    };
    
    searchCustomerHistory();
  }, [customerDetails.phone]);

  // ✅ Handle submit with Date & Time - Name empty ho toh "Walk-in" set karo
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ✅ Pakistan Time mein date/time banao (NO UTC conversion)
    // Directly string format mein bhejo "YYYY-MM-DD HH:MM:SS"
    const dateTimeStr = `${invoiceDate} ${invoiceTime}:00`;
    
    // ✅ If name is empty, set it to "Walk-in"
    const customerName = customerDetails.name?.trim() || 'Walk-in';
    
    console.log('📅 Invoice DateTime:', {
      date: invoiceDate,
      time: invoiceTime,
      full: dateTimeStr,
      name: customerName
    });
    
    onCustomerSubmit({
      name: customerName,
      phone: customerDetails.phone || '',
      email: customerDetails.email || '',
      carNumber: customerDetails.carNumber || '',
      carModel: customerDetails.carModel || '',
      birthday: customerDetails.birthday || '',
      date: dateTimeStr // ✅ Plain string, not ISO
    });
  };

  const updateField = (field, value) => {
    if (field === 'phone') {
      setCustomerDetails({ ...customerDetails, phone: value, name: '', email: '', carNumber: '', carModel: '', birthday: '' });
    } else if (field === 'birthday') {
      // Birthday handled by handleBirthdayChange
    } else {
      setCustomerDetails({ ...customerDetails, [field]: value });
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="px-6 py-4 bg-red-500">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <FiUser className="text-white text-xl" />
              <h3 className="text-lg font-semibold text-white">Step 1: Customer Details</h3>
            </div>
            <p className="text-xs text-red-100 mt-1">All fields are optional - Just click Continue to proceed</p>
          </div>
          <div className="text-white text-right">
            <p className="text-xs opacity-80 flex items-center gap-1"><FiCalendar className="text-xs" /> Date</p>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="px-3 py-1 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 w-36"
            />
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ✅ Phone Number - Optional */}
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiPhone className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Phone Number 
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={customerDetails.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Enter phone number (auto-searches history)"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                  darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
                ]}`}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <FiLoader className="animate-spin text-red-500" />
                </div>
              )}
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Enter at least 4 digits to search history
            </p>
          </div>
          
          {/* ✅ Customer Name - Optional */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiUser className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Customer Name 
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
            </label>
            <input
              type="text"
              value={customerDetails.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter customer name (optional)"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              ]}`}
            />
          </div>
          
          {/* ✅ Email Address - Optional */}
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiMail className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Email Address 
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={customerDetails.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="customer@example.com"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                  darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
                ]}`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1`}>
                <FiClock className="text-xs" /> We'll send a service reminder after 6 months
              </p>
            </div>
          </div>
          
          {/* ✅ Car Number Plate - Optional */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiTool className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Car Number Plate 
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
            </label>
            <input
              type="text"
              value={customerDetails.carNumber}
              onChange={(e) => updateField('carNumber', e.target.value)}
              placeholder="e.g., ABC-1234 (optional)"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              ]}`}
            />
          </div>
          
          {/* ✅ Car Model - Optional */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiPackage className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Car Model 
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional)</span>
            </label>
            <input
              type="text"
              value={customerDetails.carModel}
              onChange={(e) => updateField('carModel', e.target.value)}
              placeholder="e.g., Toyota Corolla 2020"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              ]}`}
            />
          </div>

          {/* ✅ Birthday - TEXT INPUT */}
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiCalendar className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Birthday 
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(Optional - mm/dd/yyyy)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerDetails.birthday}
                onChange={handleBirthdayChange}
                placeholder="e.g. 01/15/1990"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                  darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
                ]} ${customerDetails.birthday && !birthdayError ? 'border-green-500' : ''} ${birthdayError ? 'border-red-500' : ''}`}
                maxLength={10}
                inputMode="numeric"
              />
              {customerDetails.birthday && !birthdayError && customerDetails.birthday.length === 10 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✅ Valid</span>
                </div>
              )}
              {birthdayError && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">⚠️</span>
                </div>
              )}
            </div>
            {birthdayError && (
              <p className="text-xs text-red-500 mt-1">{birthdayError}</p>
            )}
            {customerDetails.birthday && !birthdayError && customerDetails.birthday.length === 10 && (
              <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                ✅ Valid date
              </p>
            )}
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1`}>
              <FiCalendar className="text-xs" /> Format: mm/dd/yyyy (e.g., 01/15/1990)
            </p>
          </div>

          {/* ✅ Invoice Date & Time - Two inputs side by side */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiClock className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> 
              Invoice Date & Time
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  ]}`}
                />
              </div>
              <div>
                <input
                  type="time"
                  value={invoiceTime}
                  onChange={(e) => setInvoiceTime(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${[
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  ]}`}
                />
              </div>
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1`}>
              <FiClock className="text-xs" /> This date & time will be used for the invoice
            </p>
          </div>
        </div>
        
        {/* ✅ Customer History Section */}
        {showHistory && customerHistory.length > 0 && (
          <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                <FiClock className="text-sm" /> Previous Visits ({customerHistory.length})
              </h4>
              <button onClick={() => setShowHistory(false)} className={`text-xs ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} flex items-center gap-1`}>
                <FiX className="text-xs" /> Hide
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-red-800' : 'border-red-200'}`}>
                    <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date</th>
                    <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Services</th>
                    {isAdmin && (
                      <>
                        <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</th>
                        <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {customerHistory.map((inv, idx) => (
                    <tr key={inv.id || idx}>
                      <td className={`py-2 px-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {new Date(inv.invoice_date).toLocaleDateString()}
                      </td>
                      <td className={`py-2 px-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {inv.items?.map(i => i.service_name).slice(0, 2).join(', ') || 'N/A'}
                        {inv.items?.length > 2 && ` +${inv.items.length - 2}`}
                      </td>
                      {isAdmin && (
                        <>
                          <td className={`py-2 px-2 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            Rs. {inv.total_amount?.toLocaleString() || 0}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 w-fit ${
                              inv.status === 'Paid' 
                                ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                : darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {inv.status === 'Paid' ? <FiCheckCircle className="text-xs" /> : <FiAlertCircle className="text-xs" />}
                              {inv.status}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {customerHistory.length >= 10 && (
              <p className={`text-xs text-center mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Showing last 10 visits</p>
            )}
          </div>
        )}
        
        <div className="mt-6">
          <button
            type="submit"
            className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2"
          >
            Continue to Billing <FiArrowRight className="text-lg" />
          </button>
        </div>
        
        <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
          <p className="flex items-center gap-2">
            <FiClock className="text-red-500" />
            <strong>Note:</strong> All fields are optional. If you provide an email address, we'll automatically send a service reminder after 6 months!
          </p>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;