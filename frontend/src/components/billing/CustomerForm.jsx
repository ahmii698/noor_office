// src/components/billing/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  FiUser, FiPhone, FiCalendar, FiClock, FiTool, FiPackage, 
  FiCheckCircle, FiAlertCircle, FiX, FiArrowRight
} from 'react-icons/fi';

const CustomerForm = ({ invoices, onCustomerSubmit, initialData, darkMode }) => {
  const [customerDetails, setCustomerDetails] = useState(initialData || {
    name: '',
    phone: '',
    carNumber: '',
    carModel: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [customerHistory, setCustomerHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Search customer history when phone number changes
  useEffect(() => {
    if (customerDetails.phone && customerDetails.phone.length >= 4) {
      const history = invoices.filter(inv => 
        inv.customer?.phone === customerDetails.phone
      ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
      
      setCustomerHistory(history);
      setShowHistory(history.length > 0);
      
      if (history.length > 0) {
        const lastInvoice = history[0];
        if (lastInvoice.customer) {
          if (!customerDetails.name) {
            setCustomerDetails(prev => ({ ...prev, name: lastInvoice.customer.name || '' }));
          }
          if (!customerDetails.carNumber) {
            setCustomerDetails(prev => ({ ...prev, carNumber: lastInvoice.customer.carNumber || '' }));
          }
          if (!customerDetails.carModel) {
            setCustomerDetails(prev => ({ ...prev, carModel: lastInvoice.customer.carModel || '' }));
          }
          toast.success(`Welcome back ${lastInvoice.customer.name}!`, { duration: 2000 });
        }
      }
    } else {
      setShowHistory(false);
      setCustomerHistory([]);
    }
  }, [customerDetails.phone, invoices]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.carNumber) {
      toast.error('Please fill all required fields (Name, Phone, Car Number)');
      return;
    }
    onCustomerSubmit(customerDetails);
  };

  const updateField = (field, value) => {
    if (field === 'phone') {
      setCustomerDetails({ ...customerDetails, phone: value, name: '', carNumber: '', carModel: '' });
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
            <p className="text-xs text-red-100 mt-1">Enter customer information - Phone number auto-searches history</p>
          </div>
          <div className="text-white text-right">
            <p className="text-xs opacity-80 flex items-center gap-1"><FiCalendar className="text-xs" /> Date</p>
            <input
              type="date"
              value={customerDetails.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="px-3 py-1 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiPhone className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Phone Number * (Type to search history)
            </label>
            <input
              type="tel"
              value={customerDetails.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Enter phone number"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
              required
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiUser className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Customer Name *
            </label>
            <input
              type="text"
              value={customerDetails.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter customer name"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
              required
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiTool className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Car Number Plate *
            </label>
            <input
              type="text"
              value={customerDetails.carNumber}
              onChange={(e) => updateField('carNumber', e.target.value)}
              placeholder="e.g., ABC-1234"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
              required
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiPackage className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Car Model (Optional)
            </label>
            <input
              type="text"
              value={customerDetails.carModel}
              onChange={(e) => updateField('carModel', e.target.value)}
              placeholder="e.g., Toyota Corolla 2020"
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
        
        {/* Customer History Section - Red/Pink theme */}
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
                    <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><FiCalendar className="inline text-xs mr-1" /> Date</th>
                    <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><FiTool className="inline text-xs mr-1" /> Services</th>
                    <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><FiPackage className="inline text-xs mr-1" /> Total</th>
                    <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}><FiCheckCircle className="inline text-xs mr-1" /> Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerHistory.map((inv, idx) => (
                    <tr key={inv.id} className={`border-b ${darkMode ? 'border-red-800/50' : 'border-red-100'} hover:bg-red-50 dark:hover:bg-red-900/20`}>
                      <td className={`py-2 px-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(inv.date).toLocaleDateString()}</td>
                      <td className={`py-2 px-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {inv.items.map(i => i.name).slice(0, 2).join(', ')}
                        {inv.items.length > 2 && ` +${inv.items.length - 2}`}
                      </td>
                      <td className={`py-2 px-2 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Rs. {inv.total.toLocaleString()}</td>
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
      </form>
    </div>
  );
};

export default CustomerForm;