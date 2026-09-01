// src/components/BatteryPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  FiSave, FiPrinter, FiSearch, FiCreditCard,
  FiPackage, FiDollarSign, FiUser, FiPhone,
  FiPlus, FiEdit2, FiTrash2, FiX, FiRefreshCw,
  FiBattery
} from 'react-icons/fi';
import api from '../services/api';
import logo from '/logo.jpg';

// ✅ CORRECT Karachi Timezone Helper Functions - NO MANUAL OFFSET
const getKarachiDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const karachiStr = date.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(karachiStr);
};

const getTodayKarachi = () => {
  const karachiStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(karachiStr);
};

const formatDateKarachi = (date) => {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi'
  });
};

const formatDateTimeKarachi = (date) => {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi'
  });
};

// ✅ Get today's date in Karachi timezone for comparison
const getTodayKarachiStr = () => {
  const karachiStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  const karachiDate = new Date(karachiStr);
  return karachiDate.toDateString();
};

const BatteryPage = ({ darkMode }) => {
  const [batteries, setBatteries] = useState([]);
  const [oldBatteries, setOldBatteries] = useState([]);
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [selectedOldBattery, setSelectedOldBattery] = useState(null);

  // ✅ NEW: Quantity for new battery sale (+/- support)
  const [quantity, setQuantity] = useState(1);

  // ✅ NEW: Old Battery Selling Price
  const [oldBatterySellPrice, setOldBatterySellPrice] = useState('');
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tradeInAmount, setTradeInAmount] = useState('');
  const [tradeInNote, setTradeInNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // ✅ NEW: For Bank and Wallet manual input
  const [bankOrWalletName, setBankOrWalletName] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isTradeInOnly, setIsTradeInOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  const [isAdmin, setIsAdmin] = useState(false);

  // Add/Edit Modal states
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

  const isSubmittingRef = useRef(false);

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

  // ✅ Get payment method display name - UPDATED with manual input
  const getPaymentMethodDisplay = () => {
    if (isTradeInOnly) return 'Trade-in Only';
    if (paymentMethod === 'cash') return 'Cash';
    if (paymentMethod === 'card') return 'Credit/Debit Card';
    if (paymentMethod === 'bank') {
      return bankOrWalletName ? `Bank Transfer (${bankOrWalletName})` : 'Bank Transfer';
    }
    if (paymentMethod === 'online') {
      return bankOrWalletName ? `Mobile Wallet (${bankOrWalletName})` : 'Mobile Wallet';
    }
    return paymentMethod;
  };

  useEffect(() => {
    fetchBatteries();
    fetchOldBatteries();
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

  const fetchOldBatteries = async () => {
    try {
      const response = await api.get('/old-batteries');
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      setOldBatteries(data);
    } catch (error) {
      console.error('Error fetching old batteries:', error);
    }
  };

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

  const selectBattery = (battery) => {
    if (selectedBattery?.id === battery.id) {
      setSelectedBattery(null);
      setQuantity(1);
    } else {
      setSelectedBattery(battery);
      setSelectedOldBattery(null);
      setOldBatterySellPrice('');
      setQuantity(1); // ✅ reset quantity on new selection
    }
  };

  // ✅ NEW: Handle old battery selection
  const selectOldBattery = (oldBattery) => {
    if (selectedOldBattery?.id === oldBattery.id) {
      setSelectedOldBattery(null);
      setOldBatterySellPrice('');
    } else {
      setSelectedOldBattery(oldBattery);
      setSelectedBattery(null);
      setQuantity(1); // old battery sale is always qty 1
      // ✅ Auto-fill sell price with trade_in_amount
      setOldBatterySellPrice(oldBattery.trade_in_amount || '');
      setTradeInNote(`Old Battery: ${oldBattery.battery_name}`);
      // ✅ Clear trade-in amount (no trade-in for old battery sale)
      setTradeInAmount('');
    }
  };

  // ✅ Sell old battery directly (Green $ button)
  const sellOldBattery = async (id) => {
    if (!window.confirm('Are you sure you want to sell this old battery?')) return;
    try {
      await api.delete(`/old-batteries/${id}`);
      toast.success('Old battery sold successfully!');
      fetchOldBatteries();
      setSelectedOldBattery(null);
    } catch (error) {
      console.error('Error selling old battery:', error);
      toast.error('Failed to sell old battery');
    }
  };

  // ✅ Submit battery sale - UPDATED for Bank/Wallet manual input + Quantity
  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    // ✅ Trade-in only mode validation
    if (isTradeInOnly) {
      const tradeIn = parseFloat(tradeInAmount) || 0;
      if (tradeIn <= 0) {
        toast.error('Please enter trade-in value for old battery');
        return;
      }
    } else {
      // ✅ Normal mode validation
      if (!selectedBattery && !selectedOldBattery) {
        toast.error('Please select a battery (New or Old)');
        return;
      }

      // ✅ If old battery selected, validate sell price
      if (selectedOldBattery) {
        const sellPrice = parseFloat(oldBatterySellPrice);
        if (!sellPrice || sellPrice <= 0) {
          toast.error('Please enter a valid selling price for old battery');
          return;
        }
      }

      if (selectedBattery) {
        const currentStock = selectedBattery.quantity || 0;
        if (currentStock <= 0) {
          toast.error('Selected battery is out of stock!');
          return;
        }
        // ✅ NEW: Quantity validation against stock
        if (quantity > currentStock) {
          toast.error(`Only ${currentStock} units available in stock!`);
          return;
        }
        if (quantity < 1) {
          toast.error('Quantity must be at least 1');
          return;
        }
      }

      // ✅ Bank and Wallet validation - manual input
      if (paymentMethod === 'bank' && !bankOrWalletName) {
        toast.error('Please enter bank name');
        return;
      }
      
      if (paymentMethod === 'online' && !bankOrWalletName) {
        toast.error('Please enter wallet name');
        return;
      }
    }

    // ✅ Get price from selected battery
    let batteryPrice = 0;       // total price (unit price × quantity for new battery)
    let unitPrice = 0;          // unit price only (used for invoice items)
    let batteryName = '';
    let isOldBattery = false;
    let oldBatteryId = null;

    if (selectedBattery) {
      unitPrice = selectedBattery.selling_price || selectedBattery.price || 0;
      batteryPrice = unitPrice * quantity; // ✅ multiply by quantity
      batteryName = quantity > 1 ? `${selectedBattery.name} x${quantity}` : selectedBattery.name;
    } else if (selectedOldBattery) {
      // ✅ Use custom sell price OR default
      unitPrice = parseFloat(oldBatterySellPrice) || selectedOldBattery.trade_in_amount || 0;
      batteryPrice = unitPrice; // old battery always qty 1
      batteryName = selectedOldBattery.battery_name;
      isOldBattery = true;
      oldBatteryId = selectedOldBattery.id;
    }

    // ✅ Trade-in only applies when buying new battery (NOT for old battery sale)
    const tradeIn = (isOldBattery || isTradeInOnly) ? 0 : (parseFloat(tradeInAmount) || 0);

    // ✅ Total = batteryPrice - tradeIn (tradeIn is 0 for old battery sale)
    const totalAmount = isTradeInOnly ? tradeIn : (batteryPrice - tradeIn);
    
    const paid = (paymentAmount && paymentAmount !== '' && !isTradeInOnly) ? parseFloat(paymentAmount) : 0;

    if (!isTradeInOnly && paid > totalAmount) {
      toast.error(`Payment cannot exceed total amount (Rs. ${totalAmount.toLocaleString()})`);
      return;
    }

    const finalCustomerName = customerName?.trim() || 'Walk-in';
    const finalCustomerPhone = customerPhone?.trim() || 'N/A';

    isSubmittingRef.current = true;
    setIsProcessing(true);
    try {
      const invoiceNo = `INV-${Date.now()}`;
      
      const remaining = isTradeInOnly ? 0 : (totalAmount - paid);
      const status = isTradeInOnly ? 'Trade-in' : (remaining <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

      // ✅ Update stock only for new battery - deduct by quantity
      if (!isTradeInOnly && selectedBattery) {
        const currentStock = selectedBattery.quantity || 0;
        const newStock = currentStock - quantity; // ✅ deduct full quantity
        await api.put(`/products/${selectedBattery.id}`, { quantity: newStock });
      }

      // ✅ If selling old battery, delete it from old_batteries
      if (isOldBattery && oldBatteryId) {
        await api.delete(`/old-batteries/${oldBatteryId}`);
        toast.success('✅ Old battery removed from inventory!');
      }

      // ✅ FIX: Save trade-in record for BOTH cases:
      //   (1) buying a new battery WITH a trade-in, OR
      //   (2) "Trade-in Only" mode (sirf old battery khareedna, nayi nahi bechni)
      // Purani condition mein "!isTradeInOnly" tha jo Trade-in Only mode ko
      // hamesha skip kar deta tha - isi wajah se record save nahi ho raha tha.
      const tradeInOnlyValue = parseFloat(tradeInAmount) || 0;
      const shouldSaveOldBattery = isTradeInOnly
        ? tradeInOnlyValue > 0
        : (tradeIn > 0 && !isOldBattery);

      if (shouldSaveOldBattery) {
        try {
          await api.post('/old-batteries', {
            battery_name: tradeInNote || selectedBattery?.name || 'Trade-in',
            trade_in_amount: isTradeInOnly ? tradeInOnlyValue : tradeIn,
            customer_name: finalCustomerName,
            customer_phone: finalCustomerPhone,
            note: isTradeInOnly
              ? `Trade-in Only: ${tradeInNote || 'Old battery'}`
              : `Trade-in with purchase: ${tradeInNote || 'Old battery'}`,
            purchase_date: new Date().toISOString()
          });
          console.log('✅ Old battery record saved successfully');
        } catch (err) {
          console.error('Error saving old battery record:', err);
          toast.error('⚠️ Battery record failed to save in Old Batteries list!');
        }
      }

      const invoiceDate = new Date().toISOString();

      // ✅ Items array - price is UNIT price, quantity is separate (backend multiplies)
      let items = [];
      if (isTradeInOnly) {
        items = [{
          service_name: 'Old Battery Trade-in',
          service_category: 'Trade-in',
          price: tradeIn,
          quantity: 1,
          mileage: null
        }];
      } else if (isOldBattery) {
        items = [{
          service_name: `Old Battery: ${batteryName}`,
          service_category: 'Old Battery Sale',
          price: unitPrice,
          quantity: 1,
          mileage: null
        }];
      } else {
        items = [{
          service_name: selectedBattery.name,
          service_category: 'Battery',
          price: unitPrice,      // ✅ unit price only
          quantity: quantity,    // ✅ actual quantity selected
          mileage: null
        }];
      }

      const payload = {
        invoice_no: invoiceNo,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        customer_email: null,
        customer_car_number: null,
        customer_car_model: null,
        subtotal: isTradeInOnly ? tradeIn : batteryPrice,
        discount: isTradeInOnly ? 0 : tradeIn,
        discount_note: isTradeInOnly ? `Old Battery Purchase: ${tradeInNote || 'Trade-in only'}` : (tradeIn > 0 ? `Battery Trade-in: ${tradeInNote || 'Old battery'}` : null),
        total_amount: totalAmount,
        paid_amount: isTradeInOnly ? 0 : paid,
        remaining_amount: remaining,
        payment_method: getPaymentMethodDisplay(),
        status: status,
        invoice_date: invoiceDate,
        items: items
      };

      console.log('📤 Battery sale payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/invoices', payload);
      console.log('✅ Battery sale response:', response.data);

      await fetchBatteries();
      await fetchOldBatteries();
      
      toast.success(isTradeInOnly ? 
        `✅ Old battery trade-in completed! Record saved.` : 
        isOldBattery ?
        `✅ Old battery sold for Rs. ${batteryPrice.toLocaleString()}!` :
        `✅ Battery sale completed! Stock updated.`
      );
      
      // Reset form
      setSelectedBattery(null);
      setSelectedOldBattery(null);
      setOldBatterySellPrice('');
      setQuantity(1); // ✅ reset quantity
      setCustomerPhone('');
      setCustomerName('');
      setTradeInAmount('');
      setTradeInNote('');
      setPaymentAmount('');
      setPaymentMethod('cash');
      setBankOrWalletName('');
      setIsTradeInOnly(false);
      setActiveTab('new');

      window.dispatchEvent(new Event('cart-updated'));

    } catch (error) {
      console.error('❌ Error saving:', error);
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      isSubmittingRef.current = false;
      setIsProcessing(false);
    }
  };

  // ✅ Print receipt - UPDATED with quantity
  const printReceipt = () => {
    if (!isTradeInOnly && !selectedBattery && !selectedOldBattery) {
      toast.error('No battery selected');
      return;
    }

    let batteryPrice = 0;
    let unitPrice = 0;
    let batteryName = '';
    let isOldBattery = false;

    if (selectedBattery) {
      unitPrice = selectedBattery.selling_price || selectedBattery.price || 0;
      batteryPrice = unitPrice * quantity; // ✅ multiply by quantity
      batteryName = quantity > 1 ? `${selectedBattery.name} x${quantity}` : selectedBattery.name;
    } else if (selectedOldBattery) {
      unitPrice = parseFloat(oldBatterySellPrice) || selectedOldBattery.trade_in_amount || 0;
      batteryPrice = unitPrice;
      batteryName = selectedOldBattery.battery_name;
      isOldBattery = true;
    }

    const tradeIn = isOldBattery ? 0 : (parseFloat(tradeInAmount) || 0);
    const totalAmount = isTradeInOnly ? tradeIn : (batteryPrice - tradeIn);
    const paid = (paymentAmount && paymentAmount !== '' && !isTradeInOnly) ? parseFloat(paymentAmount) : 0;
    const finalCustomerName = customerName?.trim() || 'Walk-in';
    const finalCustomerPhone = customerPhone?.trim() || 'N/A';

    const now = new Date();
    const karachiDateStr = now.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
    const invoiceNo = `INV-${Date.now()}`;

    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      toast.error('Please allow popups');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isTradeInOnly ? 'Trade-in Receipt' : isOldBattery ? 'Old Battery Sale Receipt' : 'Battery Receipt'}</title>
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
            .footer .address { margin-bottom: 4px; font-weight: 600; }
            .footer .phone { margin-bottom: 4px; font-weight: 600; }
            .footer .social { margin-top: 4px; }
            .footer .social span { display: block; margin: 2px 0; font-weight: 500; }
            .battery-name { font-size: 18px; font-weight: bold; color: #1f2937; }
            .trade-in-badge { 
              background: #dc2626; 
              color: white; 
              padding: 4px 12px; 
              border-radius: 20px; 
              font-size: 14px;
              display: inline-block;
              margin-top: 5px;
            }
            .old-battery-badge {
              background: #8b5cf6;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 14px;
              display: inline-block;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo" />
            <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
            <div class="subtitle">Professional Auto Care Service</div>
          </div>
          
          <div class="details">
            <div class="row"><strong>Invoice #:</strong> ${invoiceNo}</div>
            <div class="row"><strong>Date:</strong> ${karachiDateStr} (Karachi Time)</div>
            ${isTradeInOnly ? `<div class="row" style="justify-content:center;margin-top:5px;"><span class="trade-in-badge">🔄 TRADE-IN ONLY</span></div>` : ''}
            ${isOldBattery ? `<div class="row" style="justify-content:center;margin-top:5px;"><span class="old-battery-badge">🔋 OLD BATTERY SALE</span></div>` : ''}
            <div class="row"><strong>Customer:</strong> ${finalCustomerName}</div>
            <div class="row"><strong>Phone:</strong> ${finalCustomerPhone}</div>
            <div class="row" style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">
              <strong>${isTradeInOnly ? 'Old Battery:' : isOldBattery ? 'Old Battery Sold:' : 'Battery:'}</strong> 
              <span class="battery-name">${isTradeInOnly ? (tradeInNote || 'Unknown Old Battery') : batteryName}</span>
            </div>
            ${!isTradeInOnly && !isOldBattery && quantity > 1 ? `<div class="row"><strong>Unit Price:</strong> Rs. ${unitPrice.toLocaleString()} × ${quantity}</div>` : ''}
            ${isTradeInOnly ? 
              `<div class="row"><strong>Trade-in Value:</strong> <span style="color:#16a34a;">+ Rs. ${tradeIn.toLocaleString()}</span></div>` :
              `<div class="row"><strong>Selling Price:</strong> Rs. ${batteryPrice.toLocaleString()}</div>`
            }
            ${!isTradeInOnly && !isOldBattery && tradeIn > 0 ? `<div class="row"><strong>Trade-in:</strong> <span style="color:#dc2626;">- Rs. ${tradeIn.toLocaleString()}</span></div>` : ''}
            ${tradeInNote ? `<div class="row"><strong>Note:</strong> ${tradeInNote}</div>` : ''}
            <div class="row"><strong>Payment Method:</strong> ${getPaymentMethodDisplay()}</div>
          </div>
          
          <div class="total">
            ${isTradeInOnly ? 
              `Trade-in Value: Rs. ${totalAmount.toLocaleString()}` :
              `Total: Rs. ${totalAmount.toLocaleString()}`
            }
            ${!isTradeInOnly && paid > 0 ? `<div style="font-size:14px;font-weight:normal;color:#16a34a;">Paid: Rs. ${paid.toLocaleString()}</div>` : ''}
            ${!isTradeInOnly && (totalAmount - paid) > 0 ? `<div style="font-size:14px;font-weight:normal;color:#ea580c;">Remaining: Rs. ${(totalAmount - paid).toLocaleString()}</div>` : ''}
          </div>
          
          <div class="footer">
            <div class="address">
              Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi
            </div>
            <div class="phone">📞 0337 3267363</div>
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

  const filteredOldBatteries = oldBatteries.filter(b => 
    b.battery_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <button
                onClick={() => {
                  setActiveTab(activeTab === 'new' ? 'old' : 'new');
                  setSelectedBattery(null);
                  setSelectedOldBattery(null);
                  setOldBatterySellPrice('');
                  setQuantity(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FiBattery className="text-sm" />
                {activeTab === 'new' ? 'Show Old Batteries' : 'Show New Batteries'}
              </button>
            </div>

            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'new' ? 'batteries' : 'old batteries'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
              />
            </div>

            {/* Tab Indicator */}
            <div className="flex gap-2 mb-4">
              <span className={`text-xs px-2 py-1 rounded ${activeTab === 'new' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                New Batteries ({batteries.length})
              </span>
              <span className={`text-xs px-2 py-1 rounded ${activeTab === 'old' ? 'bg-purple-500 text-white' : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                Old Batteries ({oldBatteries.length})
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {activeTab === 'new' ? (
                // New Batteries List
                filteredBatteries.length === 0 ? (
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
                        onClick={() => !isOutOfStock && !isTradeInOnly && selectBattery(battery)}
                        className={`relative group p-4 rounded-xl border-2 cursor-pointer transition ${
                          isTradeInOnly ? 'opacity-50 cursor-not-allowed' :
                          isSelected 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                            : isOutOfStock 
                              ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                        }`}
                      >
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
                            {isTradeInOnly && <span className="text-xs text-yellow-500">⏳ Trade-in mode active</span>}
                          </div>
                          
                          {isAdmin && !isTradeInOnly && (
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
                )
              ) : (
                // Old Batteries List
                filteredOldBatteries.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FiBattery className="text-4xl mx-auto mb-2" />
                    {searchTerm ? 'No matching old batteries' : 'No old batteries available'}
                  </div>
                ) : (
                  filteredOldBatteries.map(oldBattery => {
                    const isSelected = selectedOldBattery?.id === oldBattery.id;

                    return (
                      <div
                        key={oldBattery.id}
                        onClick={() => !isTradeInOnly && selectOldBattery(oldBattery)}
                        className={`relative group p-4 rounded-xl border-2 cursor-pointer transition ${
                          isTradeInOnly ? 'opacity-50 cursor-not-allowed' :
                          isSelected 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {oldBattery.battery_name || 'Unknown Battery'}
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Customer: {oldBattery.customer_name || 'Walk-in'}
                            </p>
                            <p className="text-purple-500 font-bold text-lg mt-1">
                              Rs. {(oldBattery.trade_in_amount || 0).toLocaleString()}
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Date: {formatDateKarachi(oldBattery.purchase_date || oldBattery.created_at)}
                            </p>
                            {isSelected && <span className="text-xs text-purple-500">✓ Selected</span>}
                            {isTradeInOnly && <span className="text-xs text-yellow-500">⏳ Trade-in mode active</span>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); sellOldBattery(oldBattery.id); }} 
                              className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 transition text-xs shadow-md"
                              title="Sell Old Battery"
                            >
                              <FiDollarSign size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {batteries.length > 0 && !isTradeInOnly && activeTab === 'new' && (
              <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <p>💡 Click on a battery to select it</p>
              </div>
            )}
            {oldBatteries.length > 0 && !isTradeInOnly && activeTab === 'old' && (
              <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                <p>💡 Select old battery → Enter sell price → Sell!</p>
              </div>
            )}
            {isTradeInOnly && (
              <div className={`mt-4 p-3 rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700`}>
                <p>🔄 Trade-in Only mode is active. No battery selection needed.</p>
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

              {/* ✅ Trade-in Only Toggle - Hide when Old Battery selected */}
              {!selectedOldBattery && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700">
                  <label className={`flex items-center gap-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'} cursor-pointer`}>
                    <input
                      type="checkbox"
                      checked={isTradeInOnly}
                      onChange={(e) => {
                        setIsTradeInOnly(e.target.checked);
                        if (e.target.checked) {
                          setSelectedBattery(null);
                          setSelectedOldBattery(null);
                          setQuantity(1);
                          setPaymentMethod('cash');
                          setPaymentAmount('');
                          setBankOrWalletName('');
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="font-medium flex items-center gap-2">
                      <FiRefreshCw className="text-yellow-600" />
                       Sirf Old Battery Bechna Hai  (Trade-in Only)
                    </span>
                  </label>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    Check this if customer only wants to sell old battery without buying new
                  </p>
                </div>
              )}

              {!isTradeInOnly && (selectedBattery || selectedOldBattery) ? (
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-4`}>
                  <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedBattery ? selectedBattery.name : selectedOldBattery?.battery_name || 'Old Battery'}
                  </p>
                  {selectedBattery && (
                    <>
                      <p className="text-red-500 font-bold text-lg">
                        Rs. {(selectedBattery.selling_price || selectedBattery.price || 0).toLocaleString()}
                        {quantity > 1 && (
                          <span className="text-sm font-normal ml-2">× {quantity} = Rs. {((selectedBattery.selling_price || selectedBattery.price || 0) * quantity).toLocaleString()}</span>
                        )}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stock: {selectedBattery.quantity || 0} units available</p>
                    </>
                  )}
                  {selectedOldBattery && (
                    <>
                      <p className="text-red-500 font-bold text-lg">
                        Rs. {(parseFloat(oldBatterySellPrice) || selectedOldBattery.trade_in_amount || 0).toLocaleString()}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Old Battery: {selectedOldBattery.battery_name}</p>
                    </>
                  )}
                </div>
              ) : !isTradeInOnly ? (
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-4 text-center text-gray-400`}>
                  Select a battery from the left panel
                </div>
              ) : null}

              {/* ✅ NEW: Quantity +/- Selector - Only for New Battery */}
              {selectedBattery && !isTradeInOnly && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold transition"
                    >
                      −
                    </button>
                    <span className={`text-lg font-semibold w-10 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(selectedBattery.quantity || 1, q + 1))}
                      disabled={quantity >= (selectedBattery.quantity || 0)}
                      className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold transition"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-400 ml-1">Max: {selectedBattery.quantity || 0} in stock</span>
                  </div>
                </div>
              )}

              {/* ✅ Old Battery Sell Price - Only show when Old Battery selected */}
              {selectedOldBattery && !isTradeInOnly && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Selling Price (Rs.) *
                  </label>
                  <input 
                    type="number" 
                    placeholder="Enter selling price" 
                    value={oldBatterySellPrice} 
                    onChange={(e) => setOldBatterySellPrice(e.target.value)} 
                    className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                    min="0" 
                    step="0.01"
                    required
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    💰 Enter the price at which you are selling this old battery
                  </p>
                  <input 
                    type="text" 
                    placeholder="Note (e.g., Customer sold old battery)" 
                    value={tradeInNote} 
                    onChange={(e) => setTradeInNote(e.target.value)} 
                    className={`w-full mt-2 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                  />
                </div>
              )}

              {/* ✅ Trade-in field - Only show when New Battery selected OR Trade-in Only */}
              {!selectedOldBattery && (
                <div className="mb-4">
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {isTradeInOnly ? 'Old Battery Trade-in Value *' : 'Trade-in Value (Old Battery)'}
                  </label>
                  <input 
                    type="number" 
                    placeholder={isTradeInOnly ? "Enter old battery value" : "e.g. 2500"} 
                    value={tradeInAmount} 
                    onChange={(e) => setTradeInAmount(e.target.value)} 
                    className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                    min="0" 
                  />
                  <input 
                    type="text" 
                    placeholder={isTradeInOnly ? "Battery name / details" : "Trade-in note (e.g., Osaka old battery)"} 
                    value={tradeInNote} 
                    onChange={(e) => setTradeInNote(e.target.value)} 
                    className={`w-full mt-2 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`} 
                  />
                </div>
              )}

              {!isTradeInOnly && (
                <>
                  <div className="mb-4">
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Method</label>
                    <select 
                      value={paymentMethod} 
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        if (e.target.value !== 'bank' && e.target.value !== 'online') {
                          setBankOrWalletName('');
                        }
                      }} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} 
                      disabled={isProcessing}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="online">Mobile Wallet</option>
                    </select>
                  </div>

                  {/* ✅ Bank Transfer - Manual Input */}
                  {paymentMethod === 'bank' && (
                    <div className="mb-4">
                      <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Bank Name</label>
                      <input
                        type="text"
                        value={bankOrWalletName}
                        onChange={(e) => setBankOrWalletName(e.target.value)}
                        placeholder="e.g., Allied Bank, HBL, Meezan Bank"
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                        disabled={isProcessing}
                      />
                      {!bankOrWalletName && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                          ⚠️ Please enter bank name
                        </p>
                      )}
                      {bankOrWalletName && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          ✅ Bank: {bankOrWalletName}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ✅ Mobile Wallet - Manual Input */}
                  {paymentMethod === 'online' && (
                    <div className="mb-4">
                      <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Wallet Name</label>
                      <input
                        type="text"
                        value={bankOrWalletName}
                        onChange={(e) => setBankOrWalletName(e.target.value)}
                        placeholder="e.g., Sadapay, Easypaisa, JazzCash, Nayapay"
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                        disabled={isProcessing}
                      />
                      {!bankOrWalletName && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                          ⚠️ Please enter wallet name
                        </p>
                      )}
                      {bankOrWalletName && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          ✅ Wallet: {bankOrWalletName}
                        </p>
                      )}
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
                </>
              )}

              <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {!isTradeInOnly && (selectedBattery || selectedOldBattery) && (
                  <div className="flex justify-between py-1">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {selectedBattery ? `Battery Price${quantity > 1 ? ` (× ${quantity})` : ''}` : 'Selling Price'}
                    </span>
                    <span className="font-semibold">
                      Rs. {selectedBattery
                        ? ((selectedBattery.selling_price || selectedBattery.price || 0) * quantity).toLocaleString()
                        : (parseFloat(oldBatterySellPrice) || selectedOldBattery?.trade_in_amount || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                {!isTradeInOnly && tradeInAmount && parseFloat(tradeInAmount) > 0 && !selectedOldBattery && (
                  <div className="flex justify-between py-1">
                    <span className="text-red-500">Trade-in</span>
                    <span className="text-red-500 font-semibold">- Rs. {parseFloat(tradeInAmount).toLocaleString()}</span>
                  </div>
                )}
                {isTradeInOnly && tradeInAmount && parseFloat(tradeInAmount) > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-green-500">Trade-in Value (Customer gets)</span>
                    <span className="text-green-500 font-semibold">+ Rs. {parseFloat(tradeInAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t dark:border-gray-600 mt-2">
                  <span className="font-bold text-lg">
                    {isTradeInOnly ? 'Trade-in Value' : 'Total'}
                  </span>
                  <span className={`font-bold text-lg ${isTradeInOnly ? 'text-green-500' : 'text-red-500'}`}>
                    Rs. {isTradeInOnly ? (parseFloat(tradeInAmount) || 0).toLocaleString() : 
                      ((selectedBattery ? (selectedBattery.selling_price || selectedBattery.price || 0) * quantity : 
                        (parseFloat(oldBatterySellPrice) || selectedOldBattery?.trade_in_amount || 0)) - 
                        (selectedOldBattery ? 0 : (parseFloat(tradeInAmount) || 0))
                      ).toLocaleString()}
                  </span>
                </div>
                {!isTradeInOnly && paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-green-500">Paid</span>
                    <span className="text-green-500 font-semibold">Rs. {parseFloat(paymentAmount).toLocaleString()}</span>
                  </div>
                )}
                {!isTradeInOnly && (!paymentAmount || parseFloat(paymentAmount) === 0) && (selectedBattery || selectedOldBattery) && (
                  <div className="flex justify-between py-1">
                    <span className="text-orange-500">Status</span>
                    <span className="text-orange-500 font-semibold">Pending</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Type</span>
                  <span className="font-semibold">
                    {isTradeInOnly ? '🔄 Trade-in Only' : selectedOldBattery ? '🔋 Old Battery Sale' : 'Battery Sale'}
                  </span>
                </div>
                {!isTradeInOnly && (
                  <div className="flex justify-between py-1">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Payment Method</span>
                    <span className="font-semibold">{getPaymentMethodDisplay()}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={handleSubmit} 
                  disabled={isProcessing || (isTradeInOnly ? false : (paymentMethod === 'bank' && !bankOrWalletName) || (paymentMethod === 'online' && !bankOrWalletName) || (!selectedBattery && !selectedOldBattery) || (selectedOldBattery && !oldBatterySellPrice))} 
                  className={`py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                    isProcessing || (isTradeInOnly ? false : (paymentMethod === 'bank' && !bankOrWalletName) || (paymentMethod === 'online' && !bankOrWalletName) || (!selectedBattery && !selectedOldBattery) || (selectedOldBattery && !oldBatterySellPrice))
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : isTradeInOnly
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isProcessing ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave />}
                  {isProcessing ? 'Saving...' : isTradeInOnly ? 'Save Trade-in' : 'Sell Battery'}
                </button>
                <button 
                  onClick={printReceipt} 
                  disabled={!isTradeInOnly && !selectedBattery && !selectedOldBattery} 
                  className={`py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                    !isTradeInOnly && !selectedBattery && !selectedOldBattery ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  <FiPrinter /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Battery Modal */}
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