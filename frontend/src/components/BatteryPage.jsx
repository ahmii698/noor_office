// src/components/BatteryPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  FiSave, FiPrinter, FiSearch, FiCreditCard,
  FiPackage, FiDollarSign, FiUser, FiPhone,
  FiPlus, FiEdit2, FiTrash2, FiX
} from 'react-icons/fi';
import api from '../services/api';
import logo from '/logo.jpg';

// ✅ Bank Names List
const BANK_NAMES = [
  { value: 'allied', label: 'Allied Bank' },
  { value: 'alfalah', label: 'Bank Alfalah' },
  { value: 'hbl', label: 'HBL (Habib Bank Limited)' },
  { value: 'meezan', label: 'Meezan Bank' },
  { value: 'ubl', label: 'UBL (United Bank Limited)' },
];

const BatteryPage = ({ darkMode }) => {
  const [batteries, setBatteries] = useState([]);
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tradeInAmount, setTradeInAmount] = useState('');
  const [tradeInNote, setTradeInNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Admin check
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBattery, setEditingBattery] = useState(null);
  const [batteryFormData, setBatteryFormData] = useState({
    name: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    low_stock_threshold: 3,
    category: 'Battery'
  });

  // ✅ Prevents double-submit (double click / slow network) from ever
  // firing handleSubmit twice.
  const isSubmittingRef = useRef(false);

  // ✅ Check user role on mount
  useEffect(() => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        setIsAdmin(userData.role === 'admin');
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
      setIsAdmin(false);
    }
  }, []);

  // ✅ Get payment method display name
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

  // Fetch battery products from inventory
  useEffect(() => {
    fetchBatteries();
  }, []);

  const fetchBatteries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products');
      let products = [];
      if (response.data?.data) {
        products = response.data.data;
      } else if (Array.isArray(response.data)) {
        products = response.data;
      }
      
      const batteryProducts = products.filter(p => {
        const isHidden = p.is_hidden === 1 || p.is_hidden === true;
        if (isHidden) return false;
        return p.name?.toLowerCase().includes('battery') ||
               p.category?.toLowerCase().includes('battery');
      });
      setBatteries(batteryProducts);
      
      if (batteryProducts.length === 0) {
        toast('No battery products found. Add batteries in Inventory first.', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error fetching batteries:', error);
      toast.error('Failed to load batteries');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add Battery - Category forced to "Battery"
  const handleAddBattery = async () => {
    if (!batteryFormData.name || !batteryFormData.purchase_price || !batteryFormData.selling_price || !batteryFormData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const payload = {
        name: batteryFormData.name,
        purchase_price: parseFloat(batteryFormData.purchase_price),
        selling_price: parseFloat(batteryFormData.selling_price),
        quantity: parseInt(batteryFormData.quantity),
        low_stock_threshold: parseInt(batteryFormData.low_stock_threshold) || 3,
        category: 'Battery',
        is_hidden: 0
      };

      await api.post('/products', payload);
      toast.success('Battery added successfully!');
      await fetchBatteries();
      setIsModalOpen(false);
      setBatteryFormData({ name: '', purchase_price: '', selling_price: '', quantity: '', low_stock_threshold: 3, category: 'Battery' });
    } catch (error) {
      console.error('Error adding battery:', error);
      toast.error(error.response?.data?.message || 'Failed to add battery');
    }
  };

  // ✅ Update Battery - Category forced to "Battery"
  const handleUpdateBattery = async () => {
    if (!batteryFormData.name || !batteryFormData.purchase_price || !batteryFormData.selling_price || !batteryFormData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const payload = {
        name: batteryFormData.name,
        purchase_price: parseFloat(batteryFormData.purchase_price),
        selling_price: parseFloat(batteryFormData.selling_price),
        quantity: parseInt(batteryFormData.quantity),
        low_stock_threshold: parseInt(batteryFormData.low_stock_threshold) || 3,
        category: 'Battery'
      };

      await api.put(`/products/${editingBattery.id}`, payload);
      toast.success('Battery updated successfully!');
      await fetchBatteries();
      setIsModalOpen(false);
      setEditingBattery(null);
      setBatteryFormData({ name: '', purchase_price: '', selling_price: '', quantity: '', low_stock_threshold: 3, category: 'Battery' });
    } catch (error) {
      console.error('Error updating battery:', error);
      toast.error(error.response?.data?.message || 'Failed to update battery');
    }
  };

  // ✅ Delete Battery
  const handleDeleteBattery = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await api.delete(`/products/${id}`);
      toast.success('Battery deleted successfully!');
      await fetchBatteries();
    } catch (error) {
      console.error('Error deleting battery:', error);
      toast.error(error.response?.data?.message || 'Failed to delete battery');
    }
  };

  // ✅ Open Add Modal
  const openAddModal = () => {
    setEditingBattery(null);
    setBatteryFormData({ 
      name: '', 
      purchase_price: '', 
      selling_price: '', 
      quantity: '', 
      low_stock_threshold: 3, 
      category: 'Battery' 
    });
    setIsModalOpen(true);
  };

  // ✅ Open Edit Modal
  const openEditModal = (battery) => {
    setEditingBattery(battery);
    setBatteryFormData({
      name: battery.name,
      purchase_price: battery.purchase_price || '',
      selling_price: battery.selling_price || '',
      quantity: battery.quantity || '',
      low_stock_threshold: battery.low_stock_threshold || 3,
      category: 'Battery'
    });
    setIsModalOpen(true);
  };

  // Search customer by phone (optional)
  const searchCustomer = async () => {
    if (!customerPhone || customerPhone.length < 4) {
      toast.error('Enter at least 4 digits');
      return;
    }

    try {
      const response = await api.get('/invoices');
      if (response.data && Array.isArray(response.data)) {
        const found = response.data.find(inv => inv.customer_phone === customerPhone);
        if (found) {
          setCustomerName(found.customer_name || '');
          toast.success(`Customer found: ${found.customer_name}`);
        } else {
          setCustomerName('');
          toast.info('New customer');
        }
      }
    } catch (error) {
      console.error('Error searching customer:', error);
    }
  };

  // Handle battery selection
  const selectBattery = (battery) => {
    if (selectedBattery?.id === battery.id) {
      setSelectedBattery(null);
    } else {
      setSelectedBattery(battery);
    }
  };

  // ✅ Submit battery sale - ONLY battery, no other items, no double-submit
  const handleSubmit = async () => {
    // ✅ Hard guard against double-click / double-fire
    if (isSubmittingRef.current) {
      return;
    }

    if (!selectedBattery) {
      toast.error('Please select a battery');
      return;
    }

    const currentStock = selectedBattery.quantity || 0;
    if (currentStock <= 0) {
      toast.error('Selected battery is out of stock!');
      return;
    }

    if (paymentMethod === 'bank' && !selectedBank) {
      toast.error('Please select a bank for bank transfer');
      return;
    }

    const batteryPrice = selectedBattery.selling_price || selectedBattery.price || 0;
    const tradeIn = parseFloat(tradeInAmount) || 0;
    const totalAmount = batteryPrice - tradeIn;
    const paid = paymentAmount && paymentAmount !== '' ? parseFloat(paymentAmount) : 0;

    if (paid > totalAmount) {
      toast.error(`Payment cannot exceed total amount (Rs. ${totalAmount.toLocaleString()})`);
      return;
    }

    const finalCustomerName = customerName?.trim() || 'Walk-in';
    const finalCustomerPhone = customerPhone?.trim() || 'N/A';

    isSubmittingRef.current = true;
    setIsProcessing(true);
    try {
      const invoiceNo = `INV-${Date.now()}`;
      const remaining = totalAmount - paid;
      const status = remaining <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');

      const newStock = currentStock - 1;
      await api.put(`/products/${selectedBattery.id}`, { quantity: newStock });

      // ✅ Send ONLY battery - NO other items
      const payload = {
        invoice_no: invoiceNo,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        customer_email: null,
        customer_car_number: null,
        customer_car_model: null,
        subtotal: batteryPrice,
        discount: tradeIn,
        discount_note: tradeIn > 0 ? `Battery Trade-in: ${tradeInNote || 'Old battery'}` : null,
        total_amount: totalAmount,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_method: getPaymentMethodDisplay(),
        status: status,
        invoice_date: new Date().toISOString(),
        items: [{
          service_name: selectedBattery.name,
          service_category: 'Battery',
          price: batteryPrice,
          quantity: 1,
          mileage: null
        }]
      };

      console.log('📤 Battery sale payload (ONLY battery):', JSON.stringify(payload, null, 2));

      const response = await api.post('/invoices', payload);
      console.log('✅ Battery sale response:', response.data);

      await fetchBatteries();
      
      toast.success(`✅ Battery sale completed! Stock updated: ${newStock} left`);
      
      setSelectedBattery(null);
      setCustomerPhone('');
      setCustomerName('');
      setTradeInAmount('');
      setTradeInNote('');
      setPaymentAmount('');
      setPaymentMethod('cash');
      setSelectedBank('');

      // ✅ Dispatch event to refresh Billing page cart
      window.dispatchEvent(new Event('cart-updated'));

    } catch (error) {
      console.error('❌ Error saving battery sale:', error);
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      isSubmittingRef.current = false;
      setIsProcessing(false);
    }
  };

  // ✅ Print receipt - UPDATED FOOTER (same as BillingInvoice)
  const printReceipt = () => {
    if (!selectedBattery) {
      toast.error('No battery selected');
      return;
    }

    const batteryPrice = selectedBattery.selling_price || selectedBattery.price || 0;
    const tradeIn = parseFloat(tradeInAmount) || 0;
    const totalAmount = batteryPrice - tradeIn;
    const paid = paymentAmount && paymentAmount !== '' ? parseFloat(paymentAmount) : 0;
    const finalCustomerName = customerName?.trim() || 'Walk-in';
    const finalCustomerPhone = customerPhone?.trim() || 'N/A';

    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      toast.error('Please allow popups');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Battery Receipt</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 15px; }
            .logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
            .shop-name { font-size: 22px; font-weight: bold; color: #1f2937; }
            .subtitle { font-size: 13px; color: #6b7280; }
            .details { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .row { display: flex; justify-content: space-between; padding: 5px 0; }
            .total { font-size: 20px; font-weight: bold; color: #dc2626; text-align: right; margin-top: 15px; border-top: 2px solid #e5e7eb; padding-top: 15px; }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 12px; 
              color: #6b7280; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 15px; 
            }
            .footer .address { 
              margin-bottom: 4px; 
              font-weight: 600;
            }
            .footer .phone { 
              margin-bottom: 4px;
              font-weight: 600;
            }
            .footer .social { 
              margin-top: 4px; 
            }
            .footer .social span { 
              display: block; 
              margin: 2px 0;
              font-weight: 500;
            }
            .battery-name { font-size: 18px; font-weight: bold; color: #1f2937; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo" />
            <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
            <div class="subtitle">Professional Auto Care Service</div>
          </div>
          
          <div class="details">
            <div class="row"><strong>Invoice #:</strong> INV-${Date.now()}</div>
            <div class="row"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div class="row"><strong>Customer:</strong> ${finalCustomerName}</div>
            <div class="row"><strong>Phone:</strong> ${finalCustomerPhone}</div>
            <div class="row" style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">
              <strong>Battery:</strong> <span class="battery-name">${selectedBattery.name}</span>
            </div>
            <div class="row"><strong>Price:</strong> Rs. ${batteryPrice.toLocaleString()}</div>
            ${tradeIn > 0 ? `<div class="row"><strong>Trade-in:</strong> <span style="color:#dc2626;">- Rs. ${tradeIn.toLocaleString()}</span></div>` : ''}
            ${tradeInNote ? `<div class="row"><strong>Note:</strong> ${tradeInNote}</div>` : ''}
            <div class="row"><strong>Payment Method:</strong> ${getPaymentMethodDisplay()}</div>
          </div>
          
          <div class="total">
            Total: Rs. ${totalAmount.toLocaleString()}
            <div style="font-size:14px;font-weight:normal;color:#16a34a;">
              Paid: Rs. ${paid.toLocaleString()}
            </div>
            ${(totalAmount - paid) > 0 ? `<div style="font-size:14px;font-weight:normal;color:#ea580c;">Remaining: Rs. ${(totalAmount - paid).toLocaleString()}</div>` : ''}
          </div>
          
          <!-- ✅ UPDATED FOOTER - Same as BillingInvoice -->
          <div class="footer">
            <div class="address">
              Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi
            </div>
            <div class="phone">
              📞 0337 3267363
            </div>
            <div class="social">
              <span>📘 Facebook: https://www.facebook.com/Noorani.Car.AC/</span>
              <span>📷 Instagram: https://www.instagram.com/nooranicarac/</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const filteredBatteries = batteries.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading batteries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-lg" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Battery Sale</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sell batteries with trade-in option</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center gap-2 shadow-md"
              >
                <FiPlus className="text-sm" /> Add Battery
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Battery Selection */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select Battery</h3>
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{batteries.length} available</span>
            </div>

            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search batteries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredBatteries.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FiPackage className="text-4xl mx-auto mb-2" />
                  {searchTerm ? 'No matching batteries' : 'No batteries available'}
                </div>
              ) : (
                filteredBatteries.map(battery => {
                  const isSelected = selectedBattery?.id === battery.id;
                  const stock = battery.quantity || 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <div
                      key={battery.id}
                      onClick={() => !isOutOfStock && selectBattery(battery)}
                      className={`relative group p-4 rounded-xl border-2 cursor-pointer transition ${
                        isSelected 
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                          : isOutOfStock 
                            ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                      }`}
                    >
                      {/* ✅ Left side - Name, Stock, Price */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {battery.name}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Stock: {stock} units
                          </p>
                          <p className="text-red-500 font-bold text-lg mt-1">
                            Rs. {(battery.selling_price || battery.price || 0).toLocaleString()}
                          </p>
                          {isOutOfStock && <span className="text-xs text-red-500">Out of stock!</span>}
                          {isSelected && <span className="text-xs text-green-500">✓ Selected</span>}
                        </div>
                        
                        {/* ✅ Right side - Sirf Edit/Delete Buttons */}
                        {isAdmin && (
                          <div className="flex gap-1 flex-shrink-0 ml-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(battery); }} 
                              className="p-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition text-xs shadow-md"
                              title="Edit Battery"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteBattery(battery.id, battery.name); }} 
                              className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition text-xs shadow-md"
                              title="Delete Battery"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {batteries.length > 0 && (
              <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <p>💡 Click on a battery to select it</p>
              </div>
            )}
          </div>

          {/* Right - Sale Form */}
          <div className="space-y-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Customer Details</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Phone Number (Optional)" 
                    value={customerPhone} 
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} 
                    className={`flex-1 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                    maxLength="11" 
                  />
                  <button 
                    onClick={searchCustomer} 
                    className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                  >
                    <FiSearch />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Customer Name (Optional - Walk-in by default)" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                />
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                  Leave blank for Walk-in customer
                </p>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Sale Details</h3>

              {selectedBattery ? (
                <>
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-4`}>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedBattery.name}</p>
                    <p className="text-red-500 font-bold text-lg">Rs. {(selectedBattery.selling_price || selectedBattery.price || 0).toLocaleString()}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stock: {selectedBattery.quantity || 0} units available</p>
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Trade-in Value (Old Battery)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 2500" 
                      value={tradeInAmount} 
                      onChange={(e) => setTradeInAmount(e.target.value)} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                      min="0" 
                    />
                    <input 
                      type="text" 
                      placeholder="Trade-in note (e.g., Osaka old battery)" 
                      value={tradeInNote} 
                      onChange={(e) => setTradeInNote(e.target.value)} 
                      className={`w-full mt-2 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                    />
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Method</label>
                    <select 
                      value={paymentMethod} 
                      onChange={(e) => { setPaymentMethod(e.target.value); if (e.target.value !== 'bank') { setSelectedBank(''); } }} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} 
                      disabled={isProcessing}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="online">Mobile Wallet</option>
                    </select>
                  </div>

                  {paymentMethod === 'bank' && (
                    <div className="mb-4">
                      <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Select Bank</label>
                      <select 
                        value={selectedBank} 
                        onChange={(e) => setSelectedBank(e.target.value)} 
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} 
                        disabled={isProcessing}
                      >
                        <option value="">-- Select Bank --</option>
                        {BANK_NAMES.map((bank) => (
                          <option key={bank.value} value={bank.value}>{bank.label}</option>
                        ))}
                      </select>
                      {!selectedBank && <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>⚠️ Please select a bank</p>}
                      {selectedBank && <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>✅ Selected: {BANK_NAMES.find(b => b.value === selectedBank)?.label}</p>}
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Amount (Rs.) <span className="text-xs text-gray-400">(Optional - 0 for pending)</span></label>
                    <input 
                      type="number" 
                      placeholder="Enter amount (leave empty for pending)" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                      min="0" 
                    />
                  </div>

                  <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex justify-between py-1">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Battery Price</span>
                      <span className="font-semibold">Rs. {(selectedBattery.selling_price || selectedBattery.price || 0).toLocaleString()}</span>
                    </div>
                    {tradeInAmount && parseFloat(tradeInAmount) > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-red-500">Trade-in</span>
                        <span className="text-red-500 font-semibold">- Rs. {parseFloat(tradeInAmount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t dark:border-gray-600 mt-2">
                      <span className="font-bold text-lg">Total</span>
                      <span className="font-bold text-lg text-red-500">
                        Rs. {((selectedBattery.selling_price || selectedBattery.price || 0) - (parseFloat(tradeInAmount) || 0)).toLocaleString()}
                      </span>
                    </div>
                    {paymentAmount && parseFloat(paymentAmount) > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-green-500">Paid</span>
                        <span className="text-green-500 font-semibold">Rs. {parseFloat(paymentAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {(!paymentAmount || parseFloat(paymentAmount) === 0) && (
                      <div className="flex justify-between py-1">
                        <span className="text-orange-500">Status</span>
                        <span className="text-orange-500 font-semibold">Pending</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Payment Method</span>
                      <span className="font-semibold">{getPaymentMethodDisplay()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={handleSubmit} 
                      disabled={isProcessing || (paymentMethod === 'bank' && !selectedBank)} 
                      className={`py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                        isProcessing || (paymentMethod === 'bank' && !selectedBank) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isProcessing ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave />}
                      {isProcessing ? 'Saving...' : 'Sell Battery'}
                    </button>
                    <button 
                      onClick={printReceipt} 
                      disabled={!selectedBattery} 
                      className={`py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                        !selectedBattery ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-white'
                      }`}
                    >
                      <FiPrinter /> Print
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FiPackage className="text-4xl mx-auto mb-2" />
                  <p>Select a battery from the left panel</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add/Edit Battery Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingBattery ? 'Edit Battery' : 'Add New Battery'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingBattery(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Battery Name *</label>
                <input 
                  type="text" 
                  value={batteryFormData.name} 
                  onChange={(e) => setBatteryFormData({ ...batteryFormData, name: e.target.value })} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
                  placeholder="e.g. Osaka 60Ah Battery" 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Price * (Rs.)</label>
                <input 
                  type="number" 
                  value={batteryFormData.purchase_price} 
                  onChange={(e) => setBatteryFormData({ ...batteryFormData, purchase_price: e.target.value })} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
                  placeholder="e.g. 4500" 
                  min="0" 
                  step="0.01" 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Selling Price * (Rs.)</label>
                <input 
                  type="number" 
                  value={batteryFormData.selling_price} 
                  onChange={(e) => setBatteryFormData({ ...batteryFormData, selling_price: e.target.value })} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
                  placeholder="e.g. 6500" 
                  min="0" 
                  step="0.01" 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Stock Quantity *</label>
                <input 
                  type="number" 
                  value={batteryFormData.quantity} 
                  onChange={(e) => setBatteryFormData({ ...batteryFormData, quantity: e.target.value })} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
                  placeholder="e.g. 10" 
                  min="0" 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Low Stock Alert At <span className="text-xs ml-1 opacity-60">(Default: 3)</span></label>
                <input 
                  type="number" 
                  value={batteryFormData.low_stock_threshold} 
                  onChange={(e) => setBatteryFormData({ ...batteryFormData, low_stock_threshold: e.target.value })} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} 
                  placeholder="3" 
                  min="0" 
                />
              </div>
              
              {/* ✅ Category - LOCKED */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                <input 
                  type="text" 
                  value="Battery" 
                  disabled 
                  className={`w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} 
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                  🔒 Category is automatically set to "Battery"
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingBattery(null); }} 
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={editingBattery ? handleUpdateBattery : handleAddBattery} 
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiSave className="text-sm" /> {editingBattery ? 'Update Battery' : 'Add Battery'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatteryPage;