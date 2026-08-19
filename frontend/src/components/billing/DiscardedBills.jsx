// src/components/billing/DiscardedBills.jsx

import React, { useState, useEffect } from 'react';
import { 
  FiTrash2, 
  FiRefreshCw, 
  FiX, 
  FiClock, 
  FiUser, 
  FiPhone, 
  FiMail, 
  FiTruck,  // ✅ FiCar ki jagah FiTruck
  FiPackage,
  FiDollarSign,
  FiCalendar,
  FiTool
} from 'react-icons/fi';
import { 
  getDiscardedCarts, 
  restoreCart, 
  deleteDiscardedCart, 
  clearAllDiscarded 
} from '../../services/api';
import toast from 'react-hot-toast';

const DiscardedBills = ({ darkMode, onRestore, onClose }) => {
  const [discardedBills, setDiscardedBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const fetchDiscardedBills = async () => {
    setLoading(true);
    try {
      const response = await getDiscardedCarts();
      if (response.success) {
        setDiscardedBills(response.data || []);
      } else {
        setDiscardedBills([]);
      }
    } catch (error) {
      console.error('Error fetching discarded bills:', error);
      toast.error('Failed to load discarded bills');
      setDiscardedBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscardedBills();
  }, []);

  const handleRestore = async (cartId) => {
    try {
      const response = await restoreCart(cartId);
      if (response.success) {
        toast.success('Bill restored successfully!');
        setDiscardedBills(prev => prev.filter(c => c.id !== cartId));
        if (onRestore) {
          onRestore(response.data);
        }
      }
    } catch (error) {
      console.error('Error restoring bill:', error);
      toast.error(error.response?.data?.message || 'Failed to restore bill');
    }
  };

  const handleDelete = async (cartId) => {
    if (!window.confirm('Delete this discarded bill permanently?')) return;
    try {
      const response = await deleteDiscardedCart(cartId);
      if (response.success) {
        toast.success('Bill deleted permanently');
        setDiscardedBills(prev => prev.filter(c => c.id !== cartId));
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error(error.response?.data?.message || 'Failed to delete bill');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all discarded bills permanently?')) return;
    try {
      const response = await clearAllDiscarded();
      if (response.success) {
        toast.success(response.message || 'All discarded bills cleared');
        setDiscardedBills([]);
      }
    } catch (error) {
      console.error('Error clearing bills:', error);
      toast.error(error.response?.data?.message || 'Failed to clear bills');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const getTotalItems = (cartItems) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  const getTotalAmount = (cartSummary) => {
    if (!cartSummary) return 0;
    return cartSummary.total_amount || 0;
  };

  const getItemCount = (cartItems) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.length;
  };

  const toggleBillDetails = (id) => {
    if (selectedBill === id) {
      setSelectedBill(null);
    } else {
      setSelectedBill(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border ${darkMode ? 'border-gray-700' : 'border-gray-200'} animate-fadeIn`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center flex-shrink-0`}>
          <div>
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <FiClock className="text-yellow-500" />
              Discarded Bills
              <span className={`ml-2 text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ({discardedBills.length})
              </span>
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Bills that were drafted and can be restored
            </p>
          </div>
          <button 
            onClick={onClose} 
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition`}
          >
            <FiX className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-yellow-500 text-4xl mb-4">⏳</div>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading discarded bills...</p>
            </div>
          ) : discardedBills.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No discarded bills</p>
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                Discard a bill to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {discardedBills.map((bill) => {
                const isExpanded = selectedBill === bill.id;
                const totalItems = getTotalItems(bill.cart_items);
                const totalAmount = getTotalAmount(bill.cart_summary);
                const itemCount = getItemCount(bill.cart_items);
                const hasCustomer = bill.customer_name || bill.customer_phone;

                return (
                  <div 
                    key={bill.id} 
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      darkMode 
                        ? `bg-gray-800 border-gray-700 ${isExpanded ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'hover:border-yellow-500/50'}` 
                        : `bg-gray-50 border-gray-200 ${isExpanded ? 'border-yellow-400 ring-1 ring-yellow-400/50' : 'hover:border-yellow-400/70'}`
                    }`}
                  >
                    {/* Bill Header - Click to expand */}
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleBillDetails(bill.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              🗑️ Discarded
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(bill.discarded_at)}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              #{bill.id}
                            </span>
                            {hasCustomer && (
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                • {bill.customer_name || bill.customer_phone}
                              </span>
                            )}
                          </div>

                          {/* Quick Stats */}
                          <div className="mt-2 flex items-center gap-4 flex-wrap">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiPackage className="inline mr-1" size={14} />
                              {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiDollarSign className="inline mr-1" size={14} />
                              Total: <span className="font-bold text-red-500">Rs. {totalAmount.toLocaleString()}</span>
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiCalendar className="inline mr-1" size={14} />
                              Total Qty: {totalItems}
                            </span>
                          </div>

                          {/* Customer Info - Quick Preview */}
                          {hasCustomer && (
                            <div className="mt-1 flex items-center gap-3 flex-wrap text-xs">
                              {bill.customer_name && (
                                <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <FiUser size={12} /> {bill.customer_name}
                                </span>
                              )}
                              {bill.customer_phone && (
                                <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <FiPhone size={12} /> {bill.customer_phone}
                                </span>
                              )}
                              {bill.customer_car_number && (
                                <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <FiTruck size={12} /> {bill.customer_car_number}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(bill.id);
                            }}
                            className={`p-2 rounded-lg transition ${
                              darkMode 
                                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                                : 'bg-green-100 hover:bg-green-200 text-green-600'
                            }`}
                            title="Restore this bill"
                          >
                            <FiRefreshCw size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(bill.id);
                            }}
                            className={`p-2 rounded-lg transition ${
                              darkMode 
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                                : 'bg-red-100 hover:bg-red-200 text-red-600'
                            }`}
                            title="Delete this bill permanently"
                          >
                            <FiTrash2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBillDetails(bill.id);
                            }}
                            className={`p-2 rounded-lg transition ${
                              darkMode 
                                ? 'hover:bg-gray-700 text-gray-400' 
                                : 'hover:bg-gray-200 text-gray-500'
                            }`}
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <FiClock size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        {/* Full Customer Details */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                          {bill.customer_name && (
                            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <FiUser className="text-gray-400" /> {bill.customer_name}
                            </div>
                          )}
                          {bill.customer_phone && (
                            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <FiPhone className="text-gray-400" /> {bill.customer_phone}
                            </div>
                          )}
                          {bill.customer_email && (
                            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <FiMail className="text-gray-400" /> {bill.customer_email}
                            </div>
                          )}
                          {bill.customer_car_number && (
                            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <FiTruck className="text-gray-400" /> {bill.customer_car_number}
                            </div>
                          )}
                          {bill.customer_car_model && (
                            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <FiTool className="text-gray-400" /> {bill.customer_car_model}
                            </div>
                          )}
                          {bill.customer_birthday && (
                            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <FiCalendar className="text-gray-400" /> {bill.customer_birthday}
                            </div>
                          )}
                        </div>

                        {/* Cart Items */}
                        <div className="mt-3">
                          <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Cart Items ({itemCount})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {bill.cart_items && Array.isArray(bill.cart_items) && bill.cart_items.map((item, idx) => (
                              <span 
                                key={idx} 
                                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 ${
                                  darkMode 
                                    ? 'bg-gray-700 text-gray-300 border border-gray-600' 
                                    : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                              >
                                {item.type === 'service' ? (
                                  <FiTool size={10} className="text-red-400" />
                                ) : (
                                  <FiPackage size={10} className="text-blue-400" />
                                )}
                                {item.name}
                                {item.mileage && (
                                  <span className="text-blue-400 text-[10px]">({item.mileage}km)</span>
                                )}
                                <span className="text-gray-400">×</span>
                                <span className="font-semibold">{item.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Summary */}
                        {bill.cart_summary && (
                          <div className="mt-3 pt-3 border-t dark:border-gray-700 flex items-center gap-4 flex-wrap">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Subtotal: Rs. {(bill.cart_summary.subtotal || 0).toLocaleString()}
                            </span>
                            {bill.cart_summary.discount > 0 && (
                              <span className={`text-sm text-red-400`}>
                                Discount: -Rs. {(bill.cart_summary.discount || 0).toLocaleString()}
                              </span>
                            )}
                            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Total: <span className="text-red-500">Rs. {(bill.cart_summary.total_amount || 0).toLocaleString()}</span>
                            </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Total Items: {bill.cart_summary.total_items || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center flex-shrink-0`}>
          <button
            onClick={handleClearAll}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              darkMode 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            } ${discardedBills.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={discardedBills.length === 0}
          >
            <FiTrash2 className="inline mr-2" size={14} />
            Clear All
          </button>
          <div className="flex gap-2">
            <button
              onClick={fetchDiscardedBills}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FiRefreshCw className="inline mr-2" size={14} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                darkMode 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this CSS to your global styles or tailwind config
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default DiscardedBills;