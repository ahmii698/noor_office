// src/components/BatteryPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  FiSave, FiPrinter, FiSearch, FiCreditCard,
  FiPackage, FiDollarSign, FiUser, FiPhone,
  FiPlus, FiEdit2, FiTrash2, FiX, FiRefreshCw,
  FiBattery, FiShoppingCart, FiMinus
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

const getTodayKarachiStr = () => {
  const karachiStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  const karachiDate = new Date(karachiStr);
  return karachiDate.toDateString();
};

let tradeInRowId = 0;
const makeTradeInRow = () => ({ rowId: `tr-${Date.now()}-${tradeInRowId++}`, name: '', price: '' });

const BatteryPage = ({ darkMode }) => {
  const [batteries, setBatteries] = useState([]);
  const [oldBatteries, setOldBatteries] = useState([]);

  // ✅ cart-based multi-battery selection
  const [cartItems, setCartItems] = useState([]); // [{ battery, quantity }]

  // ✅ multi-select old batteries: [{ battery, sellPrice }]
  const [selectedOldBatteries, setSelectedOldBatteries] = useState([]);
  const [oldBatterySaleNote, setOldBatterySaleNote] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tradeInItems, setTradeInItems] = useState([makeTradeInRow()]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankOrWalletName, setBankOrWalletName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTradeInOnly, setIsTradeInOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [isAdmin, setIsAdmin] = useState(false);

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

  const addTradeInRow = () => {
    setTradeInItems(prev => [...prev, makeTradeInRow()]);
  };

  const updateTradeInRow = (rowId, field, value) => {
    setTradeInItems(prev => prev.map(row => 
      row.rowId === rowId ? { ...row, [field]: value } : row
    ));
  };

  const removeTradeInRow = (rowId) => {
    setTradeInItems(prev => {
      const updated = prev.filter(row => row.rowId !== rowId);
      return updated.length === 0 ? [makeTradeInRow()] : updated;
    });
  };

  const resetTradeInRows = () => setTradeInItems([makeTradeInRow()]);

  const validTradeIns = tradeInItems.filter(
    row => row.name.trim() !== '' && parseFloat(row.price) > 0
  );

  const totalTradeIn = validTradeIns.reduce(
    (sum, row) => sum + (parseFloat(row.price) || 0), 0
  );

  const tradeInSummaryText = validTradeIns
    .map(row => `${row.name.trim()} (Rs. ${(parseFloat(row.price) || 0).toLocaleString()})`)
    .join(', ');

  // ✅ Old batteries (multi): purchase total (fixed), selling total (user enters per battery), profit (live)
  const hasOldSelection = selectedOldBatteries.length > 0;

  const oldPurchaseTotal = selectedOldBatteries.reduce(
    (sum, it) => sum + (parseFloat(it.battery.trade_in_amount) || 0), 0
  );
  const oldSellTotal = selectedOldBatteries.reduce(
    (sum, it) => sum + (parseFloat(it.sellPrice) || 0), 0
  );
  const oldProfit = oldSellTotal - oldPurchaseTotal;
  const allOldPricesFilled =
    hasOldSelection && selectedOldBatteries.every(it => parseFloat(it.sellPrice) > 0);

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

  // ✅ Only in-stock (unsold) old batteries
  const fetchOldBatteries = async () => {
    try {
      const response = await api.get('/old-batteries', { params: { status: 'in_stock' } });
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
          toast('New customer');
        }
      }
    } catch (error) {
      console.error('Error searching customer:', error);
    }
  };

  // ✅ Old selection helpers
  const resetOldSelection = () => {
    setSelectedOldBatteries([]);
    setOldBatterySaleNote('');
  };

  // ✅ Cart helpers — add / remove / change quantity, multiple batteries at once
  const addToCart = (battery) => {
    if (isTradeInOnly) return;
    const stock = battery.quantity || 0;
    if (stock <= 0) {
      toast.error('This battery is out of stock!');
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.battery.id === battery.id);
      if (existing) {
        if (existing.quantity >= stock) {
          toast.error(`Only ${stock} units available in stock!`);
          return prev;
        }
        return prev.map(item =>
          item.battery.id === battery.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { battery, quantity: 1 }];
    });

    // Adding a new battery cancels an old-battery sale in progress
    resetOldSelection();
  };

  const removeFromCart = (batteryId) => {
    setCartItems(prev => prev.filter(item => item.battery.id !== batteryId));
  };

  const changeCartQuantity = (batteryId, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.battery.id !== batteryId) return item;
      const stock = item.battery.quantity || 0;
      const nextQty = Math.min(Math.max(1, item.quantity + delta), stock);
      return { ...item, quantity: nextQty };
    }));
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + (item.battery.selling_price || item.battery.price || 0) * item.quantity,
    0
  );

  const totalCartUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ✅ Toggle old battery: click = add, click again = remove. Selling price starts EMPTY per battery.
  const selectOldBattery = (oldBattery) => {
    const alreadySelected = selectedOldBatteries.some(i => i.battery.id === oldBattery.id);

    if (alreadySelected) {
      setSelectedOldBatteries(prev => prev.filter(i => i.battery.id !== oldBattery.id));
      return;
    }

    // First old battery being selected → clear new-battery cart and trade-in rows
    if (selectedOldBatteries.length === 0) {
      clearCart();
      resetTradeInRows();
    }
    setSelectedOldBatteries(prev => [...prev, { battery: oldBattery, sellPrice: '' }]);
  };

  const updateOldSellPrice = (batteryId, value) => {
    setSelectedOldBatteries(prev =>
      prev.map(i => i.battery.id === batteryId ? { ...i, sellPrice: value } : i)
    );
  };

  const removeOldSelected = (batteryId) => {
    setSelectedOldBatteries(prev => prev.filter(i => i.battery.id !== batteryId));
  };

  // ✅ $ button — selects the battery so you can enter the selling price
  const sellOldBattery = (oldBattery) => {
    if (!selectedOldBatteries.some(i => i.battery.id === oldBattery.id)) {
      selectOldBattery(oldBattery);
    }
    toast('Ab Selling Price daalein aur "Sell Battery" dabayein', { icon: '💰' });
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (isTradeInOnly) {
      if (validTradeIns.length === 0) {
        toast.error('Please add at least one old battery with name and price');
        return;
      }
    } else {
      if (cartItems.length === 0 && !hasOldSelection) {
        toast.error('Please select at least one battery (New or Old)');
        return;
      }

      if (hasOldSelection) {
        const missing = selectedOldBatteries.find(i => !(parseFloat(i.sellPrice) > 0));
        if (missing) {
          toast.error(`"${missing.battery.battery_name}" ki selling price daalein`);
          return;
        }

        const lossItems = selectedOldBatteries.filter(
          i => parseFloat(i.sellPrice) < (parseFloat(i.battery.trade_in_amount) || 0)
        );
        if (lossItems.length > 0) {
          const list = lossItems.map(i =>
            `• ${i.battery.battery_name}: Sell Rs. ${parseFloat(i.sellPrice).toLocaleString()} < Purchase Rs. ${(parseFloat(i.battery.trade_in_amount) || 0).toLocaleString()}`
          ).join('\n');
          const ok = window.confirm(
            `In batteries par loss ho raha hai:\n${list}\n\nKya phir bhi sell karna hai?`
          );
          if (!ok) return;
        }
      }

      if (cartItems.length > 0) {
        for (const item of cartItems) {
          const currentStock = item.battery.quantity || 0;
          if (currentStock <= 0) {
            toast.error(`"${item.battery.name}" is out of stock!`);
            return;
          }
          if (item.quantity > currentStock) {
            toast.error(`Only ${currentStock} units of "${item.battery.name}" available in stock!`);
            return;
          }
          if (item.quantity < 1) {
            toast.error('Quantity must be at least 1');
            return;
          }
        }
      }

      const halfFilled = tradeInItems.find(row => 
        (row.name.trim() !== '' && !(parseFloat(row.price) > 0)) ||
        (row.name.trim() === '' && parseFloat(row.price) > 0)
      );
      if (halfFilled && !hasOldSelection) {
        toast.error('Har trade-in battery ka name aur price dono bharein');
        return;
      }

      if (paymentMethod === 'bank' && !bankOrWalletName) {
        toast.error('Please enter bank name');
        return;
      }
      
      if (paymentMethod === 'online' && !bankOrWalletName) {
        toast.error('Please enter wallet name');
        return;
      }
    }

    let batteryPrice = 0;
    let batteryName = '';
    let isOldBattery = false;

    if (cartItems.length > 0) {
      batteryPrice = cartTotal;
      batteryName = cartItems.map(item => `${item.battery.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`).join(', ');
    } else if (hasOldSelection) {
      batteryPrice = oldSellTotal;
      batteryName = selectedOldBatteries.map(i => i.battery.battery_name).join(', ');
      isOldBattery = true;
    }

    const tradeIn = isOldBattery ? 0 : totalTradeIn;
    const totalAmount = isTradeInOnly ? totalTradeIn : (batteryPrice - tradeIn);
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

      // ✅ Update stock for EVERY battery in the cart
      if (!isTradeInOnly && cartItems.length > 0) {
        for (const item of cartItems) {
          const currentStock = item.battery.quantity || 0;
          const newStock = currentStock - item.quantity;
          await api.put(`/products/${item.battery.id}`, { quantity: newStock });
        }
      }

      const shouldSaveOldBatteries = !isOldBattery && validTradeIns.length > 0;

      if (shouldSaveOldBatteries) {
        let savedCount = 0;
        for (const row of validTradeIns) {
          try {
            await api.post('/old-batteries', {
              battery_name: row.name.trim(),
              trade_in_amount: parseFloat(row.price) || 0,
              customer_name: finalCustomerName,
              customer_phone: finalCustomerPhone,
              note: isTradeInOnly
                ? `Trade-in Only: ${row.name.trim()}`
                : `Trade-in with purchase: ${row.name.trim()}`,
              purchase_date: new Date().toISOString()
            });
            savedCount++;
          } catch (err) {
            console.error('Error saving old battery record:', row, err);
            toast.error(`⚠️ "${row.name.trim()}" record save nahi hua!`);
          }
        }
        if (savedCount > 0) {
          console.log(`✅ ${savedCount} old battery record(s) saved`);
        }
      }

      const invoiceDate = new Date().toISOString();

      let items = [];
      if (isTradeInOnly) {
        items = validTradeIns.map(row => ({
          service_name: `Old Battery: ${row.name.trim()}`,
          service_category: 'Trade-in',
          price: parseFloat(row.price) || 0,
          quantity: 1,
          mileage: null
        }));
      } else if (isOldBattery) {
        // ✅ Each old battery gets its own invoice line, with ONLY the selling price
        items = selectedOldBatteries.map(i => ({
          service_name: `Old Battery: ${i.battery.battery_name}`,
          service_category: 'Old Battery Sale',
          price: parseFloat(i.sellPrice),
          quantity: 1,
          mileage: null
        }));
      } else {
        items = cartItems.map(item => ({
          service_name: item.battery.name,
          service_category: 'Battery',
          price: item.battery.selling_price || item.battery.price || 0,
          quantity: item.quantity,
          mileage: null
        }));
      }

      const payload = {
        invoice_no: invoiceNo,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        customer_email: null,
        customer_car_number: null,
        customer_car_model: null,
        subtotal: isTradeInOnly ? totalTradeIn : batteryPrice,
        discount: isTradeInOnly ? 0 : tradeIn,
        discount_note: isTradeInOnly
          ? `Old Battery Purchase: ${tradeInSummaryText}`
          : (tradeIn > 0 ? `Battery Trade-in: ${tradeInSummaryText}` : null),
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

      // ✅ Mark EVERY selected old battery as SOLD — each with its own selling_price (purchase price stays untouched)
      if (isOldBattery) {
        const failed = [];
        for (const i of selectedOldBatteries) {
          try {
            await api.post(`/old-batteries/${i.battery.id}/sell`, {
              selling_price: parseFloat(i.sellPrice),
              customer_name: finalCustomerName,
              customer_phone: customerPhone?.trim() || null,
              note: oldBatterySaleNote || `Old Battery: ${i.battery.battery_name}`,
              invoice_no: invoiceNo
            });
          } catch (sellErr) {
            console.error('Error marking old battery as sold:', i.battery, sellErr);
            failed.push(i.battery.battery_name);
          }
        }
        if (failed.length > 0) {
          toast.error(`Invoice ban gayi lekin sold mark nahi hui: ${failed.join(', ')}`);
        }
      }

      await fetchBatteries();
      await fetchOldBatteries();
      
      toast.success(isTradeInOnly ? 
        `✅ ${validTradeIns.length} old battery record(s) saved!` : 
        isOldBattery ?
        `✅ ${selectedOldBatteries.length} old battery sold for Rs. ${batteryPrice.toLocaleString()} (Profit: Rs. ${oldProfit.toLocaleString()})` :
        `✅ Battery sale completed! ${totalCartUnits} unit(s) sold, stock updated.`
      );
      
      clearCart();
      resetOldSelection();
      setCustomerPhone('');
      setCustomerName('');
      resetTradeInRows();
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

  const printReceipt = () => {
    if (!isTradeInOnly && cartItems.length === 0 && !hasOldSelection) {
      toast.error('No battery selected');
      return;
    }

    let batteryPrice = 0;
    let isOldBattery = false;

    if (cartItems.length > 0) {
      batteryPrice = cartTotal;
    } else if (hasOldSelection) {
      batteryPrice = oldSellTotal;
      isOldBattery = true;
    }

    const tradeIn = isOldBattery ? 0 : totalTradeIn;
    const totalAmount = isTradeInOnly ? totalTradeIn : (batteryPrice - tradeIn);
    const paid = (paymentAmount && paymentAmount !== '' && !isTradeInOnly) ? parseFloat(paymentAmount) : 0;
    const finalCustomerName = customerName?.trim() || 'Walk-in';
    const finalCustomerPhone = customerPhone?.trim() || 'N/A';

    const cartRowsHtml = cartItems.map((item, idx) => {
      const unit = item.battery.selling_price || item.battery.price || 0;
      return `
        <div class="row">
          <span>${idx + 1}. ${item.battery.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
          <span>Rs. ${(unit * item.quantity).toLocaleString()}</span>
        </div>
      `;
    }).join('');

    const oldRowsHtml = selectedOldBatteries.map((i, idx) => `
      <div class="row">
        <span>${idx + 1}. ${i.battery.battery_name}</span>
        <span>Rs. ${(parseFloat(i.sellPrice) || 0).toLocaleString()}</span>
      </div>
    `).join('');

    const tradeInRowsHtml = validTradeIns.map((row, idx) => `
      <div class="row">
        <span>${idx + 1}. ${row.name.trim()}</span>
        <span style="color:${isTradeInOnly ? '#16a34a' : '#dc2626'};">
          ${isTradeInOnly ? '+' : '-'} Rs. ${(parseFloat(row.price) || 0).toLocaleString()}
        </span>
      </div>
    `).join('');

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
            .section-title { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-weight: bold; }
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

            ${!isTradeInOnly && cartItems.length > 0 ? `
              <div class="section-title">Batteries (${cartItems.length})</div>
              ${cartRowsHtml}
              <div class="row" style="border-top:1px dashed #e5e7eb;margin-top:4px;padding-top:6px;">
                <strong>Subtotal:</strong>
                <strong>Rs. ${batteryPrice.toLocaleString()}</strong>
              </div>
            ` : ''}

            ${!isTradeInOnly && isOldBattery ? `
              <div class="section-title">Old Batteries Sold (${selectedOldBatteries.length})</div>
              ${oldRowsHtml}
              <div class="row" style="border-top:1px dashed #e5e7eb;margin-top:4px;padding-top:6px;">
                <strong>Total:</strong>
                <strong>Rs. ${batteryPrice.toLocaleString()}</strong>
              </div>
            ` : ''}

            ${validTradeIns.length > 0 && !isOldBattery ? `
              <div class="section-title">${isTradeInOnly ? 'Old Batteries Purchased' : 'Trade-in Batteries'}</div>
              ${tradeInRowsHtml}
              <div class="row" style="border-top:1px dashed #e5e7eb;margin-top:4px;padding-top:6px;">
                <strong>Total ${isTradeInOnly ? 'Trade-in Value' : 'Trade-in'}:</strong>
                <strong style="color:${isTradeInOnly ? '#16a34a' : '#dc2626'};">
                  ${isTradeInOnly ? '+' : '-'} Rs. ${totalTradeIn.toLocaleString()}
                </strong>
              </div>
            ` : ''}

            ${isOldBattery && oldBatterySaleNote ? `<div class="row"><strong>Note:</strong> ${oldBatterySaleNote}</div>` : ''}
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

  const previewTotal = isTradeInOnly
    ? totalTradeIn
    : hasOldSelection
      ? oldSellTotal
      : cartTotal - totalTradeIn;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-500'}`}>Loading batteries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-lg" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Battery Sale</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sell multiple batteries with trade-in option</p>
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
                  clearCart();
                  resetOldSelection();
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
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
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
                filteredBatteries.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <FiPackage className="text-4xl mx-auto mb-2" />
                    {searchTerm ? 'No matching batteries' : 'No batteries available'}
                  </div>
                ) : (
                  filteredBatteries.map(battery => {
                    const stock = battery.quantity || 0;
                    const isOutOfStock = stock <= 0;
                    const inCart = cartItems.find(item => item.battery.id === battery.id);
                    const cartQty = inCart?.quantity || 0;
                    const remainingStock = stock - cartQty;

                    return (
                      <div
                        key={battery.id}
                        onClick={() => !isOutOfStock && !isTradeInOnly && remainingStock > 0 && addToCart(battery)}
                        className={`relative group p-4 rounded-xl border-2 cursor-pointer transition ${
                          isTradeInOnly ? 'opacity-50 cursor-not-allowed' :
                          inCart 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                            : isOutOfStock 
                              ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed' 
                              : remainingStock <= 0
                                ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
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
                            <p className={`font-bold text-lg mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                              Rs. {(battery.selling_price || battery.price || 0).toLocaleString()}
                            </p>
                            {isOutOfStock && <span className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Out of stock!</span>}
                            {inCart && <span className={`text-xs font-semibold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>✓ In cart: {cartQty} {remainingStock <= 0 ? '(max reached)' : '(tap to add more)'}</span>}
                            {isTradeInOnly && <span className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>⏳ Trade-in mode active</span>}
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
                filteredOldBatteries.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <FiBattery className="text-4xl mx-auto mb-2" />
                    {searchTerm ? 'No matching old batteries' : 'No old batteries available'}
                  </div>
                ) : (
                  filteredOldBatteries.map(oldBattery => {
                    const selectedIndex = selectedOldBatteries.findIndex(i => i.battery.id === oldBattery.id);
                    const isSelected = selectedIndex !== -1;

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
                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purchase Price</p>
                            <p className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}>
                              Rs. {(parseFloat(oldBattery.trade_in_amount) || 0).toLocaleString()}
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Date: {formatDateKarachi(oldBattery.purchase_date || oldBattery.created_at)}
                            </p>
                            {isSelected && <span className={`text-xs font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}>✓ Selected (#{selectedIndex + 1}) — click again to remove</span>}
                            {isTradeInOnly && <span className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>⏳ Trade-in mode active</span>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); sellOldBattery(oldBattery); }} 
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
              <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <p>💡 Click on a battery to add it to cart — click again to add more of the same one</p>
              </div>
            )}
            {oldBatteries.length > 0 && !isTradeInOnly && activeTab === 'old' && (
              <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <p>💡 Ek ya zyada old batteries select karein → Har ki selling price daalein → Sell!</p>
              </div>
            )}
            {isTradeInOnly && (
              <div className={`mt-4 p-3 rounded-lg text-xs border ${darkMode ? 'bg-yellow-900/30 text-yellow-200 border-yellow-700' : 'bg-yellow-50 text-yellow-700 border-yellow-300'}`}>
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
                    className={`flex-1 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
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
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
                />
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                  Leave blank for Walk-in customer
                </p>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Sale Details</h3>

              {/* Trade-in Only Toggle */}
              {!hasOldSelection && (
                <div className={`mb-4 p-3 rounded-xl border ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-300'}`}>
                  <label className={`flex items-center gap-3 cursor-pointer ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                    <input
                      type="checkbox"
                      checked={isTradeInOnly}
                      onChange={(e) => {
                        setIsTradeInOnly(e.target.checked);
                        if (e.target.checked) {
                          clearCart();
                          resetOldSelection();
                          setPaymentMethod('cash');
                          setPaymentAmount('');
                          setBankOrWalletName('');
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="font-medium flex items-center gap-2">
                      <FiRefreshCw className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                       Sirf Old Battery Bechna Hai  (Trade-in Only)
                    </span>
                  </label>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    Check this if customer only wants to sell old battery without buying new
                  </p>
                </div>
              )}

              {/* ✅ CART — multiple batteries, each with its own qty controls */}
              {!isTradeInOnly && cartItems.length > 0 && (
                <div className={`p-4 rounded-xl mb-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <p className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FiShoppingCart /> Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}, {totalCartUnits} unit{totalCartUnits > 1 ? 's' : ''})
                    </p>
                    <button
                      type="button"
                      onClick={clearCart}
                      className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-2">
                    {cartItems.map(item => {
                      const unit = item.battery.selling_price || item.battery.price || 0;
                      const stock = item.battery.quantity || 0;
                      return (
                        <div key={item.battery.id} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.battery.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Rs. {unit.toLocaleString()} × {item.quantity} = Rs. {(unit * item.quantity).toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => changeCartQuantity(item.battery.id, -1)}
                            disabled={item.quantity <= 1}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                          >
                            <FiMinus size={12} />
                          </button>
                          <span className={`text-sm font-semibold w-6 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeCartQuantity(item.battery.id, 1)}
                            disabled={item.quantity >= stock}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                          >
                            <FiPlus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.battery.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition flex-shrink-0"
                            title="Remove"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ✅ Selected OLD batteries — each with its own selling price + live profit */}
              {!isTradeInOnly && cartItems.length === 0 && hasOldSelection ? (
                <div className={`p-4 rounded-xl mb-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <p className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FiBattery /> Old Batteries ({selectedOldBatteries.length})
                    </p>
                    <button
                      type="button"
                      onClick={resetOldSelection}
                      className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedOldBatteries.map(({ battery, sellPrice }) => {
                      const purchase = parseFloat(battery.trade_in_amount) || 0;
                      const sell = parseFloat(sellPrice) || 0;
                      const profit = sell - purchase;
                      return (
                        <div key={battery.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {battery.battery_name}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeOldSelected(battery.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition flex-shrink-0"
                              title="Remove"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Purchase (khareedi): <span className="font-semibold">Rs. {purchase.toLocaleString()}</span> 🔒
                          </p>
                          <input
                            type="number"
                            placeholder="Selling price (Rs.) — kitnay ki bech rahe hain? *"
                            value={sellPrice}
                            onChange={(e) => updateOldSellPrice(battery.id, e.target.value)}
                            min="0"
                            step="0.01"
                            className={`w-full mt-2 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          />
                          {sell > 0 && (
                            <p className={`text-xs mt-1 font-semibold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {profit >= 0 ? 'Profit' : 'Loss'} ({sell.toLocaleString()} − {purchase.toLocaleString()}): {profit >= 0 ? '+' : '-'} Rs. {Math.abs(profit).toLocaleString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Note (e.g., Customer bought old batteries)" 
                    value={oldBatterySaleNote} 
                    onChange={(e) => setOldBatterySaleNote(e.target.value)} 
                    className={`w-full mt-3 px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
                  />
                </div>
              ) : !isTradeInOnly && cartItems.length === 0 ? (
                <div className={`p-4 rounded-xl mb-4 text-center ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  Select battery/batteries from the left panel
                </div>
              ) : null}

              {/* MULTIPLE TRADE-IN BATTERIES */}
              {!hasOldSelection && (
                <div className={`mb-4 p-4 rounded-xl border ${darkMode ? 'border-gray-600 bg-gray-700/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <label className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {isTradeInOnly ? 'Old Batteries Kharidi (Name + Price) *' : 'Trade-in Batteries (Old Battery)'}
                    </label>
                    <button
                      type="button"
                      onClick={addTradeInRow}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition flex items-center gap-1 shadow-md"
                    >
                      <FiPlus size={14} /> Add Battery
                    </button>
                  </div>

                  <div className="space-y-2">
                    {tradeInItems.map((row, idx) => (
                      <div key={row.rowId} className="flex gap-2 items-center">
                        <span className={`text-xs w-5 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder="Battery name (e.g. Osaka)"
                          value={row.name}
                          onChange={(e) => updateTradeInRow(row.rowId, 'name', e.target.value)}
                          className={`flex-1 min-w-0 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={row.price}
                          onChange={(e) => updateTradeInRow(row.rowId, 'price', e.target.value)}
                          className={`w-28 flex-shrink-0 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                          min="0"
                          step="0.01"
                        />
                        <button
                          type="button"
                          onClick={() => removeTradeInRow(row.rowId)}
                          disabled={tradeInItems.length === 1 && !row.name && !row.price}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                          title="Remove"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {validTradeIns.length > 0 && (
                    <div className={`mt-3 pt-3 border-t flex justify-between items-center ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Total ({validTradeIns.length} battery)
                      </span>
                      <span className={`font-bold ${isTradeInOnly ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-red-400' : 'text-red-500')}`}>
                        {isTradeInOnly ? '+' : '-'} Rs. {totalTradeIn.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    💡 Har battery ka name aur price bharein. Add Battery se aur rows add karein.
                  </p>
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
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
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
                      <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Bank Name</label>
                      <input
                        type="text"
                        value={bankOrWalletName}
                        onChange={(e) => setBankOrWalletName(e.target.value)}
                        placeholder="e.g., Allied Bank, HBL, Meezan Bank"
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
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

                  {paymentMethod === 'online' && (
                    <div className="mb-4">
                      <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Wallet Name</label>
                      <input
                        type="text"
                        value={bankOrWalletName}
                        onChange={(e) => setBankOrWalletName(e.target.value)}
                        placeholder="e.g., Sadapay, Easypaisa, JazzCash, Nayapay"
                        className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
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
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Payment Amount (Rs.) <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>(Optional - 0 for pending)</span></label>
                    <input 
                      type="number" 
                      placeholder="Enter amount (leave empty for pending)" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
                      min="0" 
                    />
                  </div>
                </>
              )}

              {/* Summary */}
              <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {!isTradeInOnly && cartItems.length > 0 && (
                  <div className="flex justify-between py-1">
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Batteries Subtotal ({totalCartUnits} unit{totalCartUnits > 1 ? 's' : ''})
                    </span>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                )}
                {!isTradeInOnly && hasOldSelection && (
                  <>
                    {selectedOldBatteries.map(({ battery, sellPrice }, idx) => (
                      <div key={battery.id} className="flex justify-between py-1 text-sm">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{idx + 1}. {battery.battery_name}</span>
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Rs. {(parseFloat(sellPrice) || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Total Purchase Price</span>
                      <span className={`font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Rs. {oldPurchaseTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Total Selling Price</span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Rs. {oldSellTotal.toLocaleString()}</span>
                    </div>
                    {oldSellTotal > 0 && (
                      <div className="flex justify-between py-1">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{oldProfit >= 0 ? 'Total Profit' : 'Total Loss'}</span>
                        <span className={`font-semibold ${oldProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {oldProfit >= 0 ? '+' : '-'} Rs. {Math.abs(oldProfit).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {!hasOldSelection && validTradeIns.map((row, idx) => (
                  <div key={row.rowId} className="flex justify-between py-1 text-sm">
                    <span className={isTradeInOnly ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-red-400' : 'text-red-500')}>
                      {idx + 1}. {row.name.trim()}
                    </span>
                    <span className={`font-semibold ${isTradeInOnly ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-red-400' : 'text-red-500')}`}>
                      {isTradeInOnly ? '+' : '-'} Rs. {(parseFloat(row.price) || 0).toLocaleString()}
                    </span>
                  </div>
                ))}

                <div className={`flex justify-between py-2 border-t mt-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {isTradeInOnly ? 'Total Trade-in Value' : 'Total'}
                  </span>
                  <span className={`font-bold text-lg ${isTradeInOnly ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-red-400' : 'text-red-500')}`}>
                    Rs. {previewTotal.toLocaleString()}
                  </span>
                </div>

                {!isTradeInOnly && paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className="flex justify-between py-1">
                    <span className={darkMode ? 'text-green-400' : 'text-green-500'}>Paid</span>
                    <span className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>Rs. {parseFloat(paymentAmount).toLocaleString()}</span>
                  </div>
                )}
                {!isTradeInOnly && (!paymentAmount || parseFloat(paymentAmount) === 0) && (cartItems.length > 0 || hasOldSelection) && (
                  <div className="flex justify-between py-1">
                    <span className={darkMode ? 'text-orange-400' : 'text-orange-500'}>Status</span>
                    <span className={`font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>Pending</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Type</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {isTradeInOnly ? '🔄 Trade-in Only' : hasOldSelection ? '🔋 Old Battery Sale' : 'Battery Sale'}
                  </span>
                </div>
                {!isTradeInOnly && (
                  <div className="flex justify-between py-1">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Payment Method</span>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{getPaymentMethodDisplay()}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={handleSubmit} 
                  disabled={
                    isProcessing || (
                      isTradeInOnly 
                        ? validTradeIns.length === 0 
                        : (paymentMethod === 'bank' && !bankOrWalletName) || 
                          (paymentMethod === 'online' && !bankOrWalletName) || 
                          (cartItems.length === 0 && !hasOldSelection) || 
                          (cartItems.length === 0 && hasOldSelection && !allOldPricesFilled)
                    )
                  } 
                  className={`py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                    isProcessing || (
                      isTradeInOnly 
                        ? validTradeIns.length === 0 
                        : (paymentMethod === 'bank' && !bankOrWalletName) || 
                          (paymentMethod === 'online' && !bankOrWalletName) || 
                          (cartItems.length === 0 && !hasOldSelection) || 
                          (cartItems.length === 0 && hasOldSelection && !allOldPricesFilled)
                    )
                      ? 'bg-gray-400 cursor-not-allowed text-white' 
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
                  disabled={!isTradeInOnly && cartItems.length === 0 && !hasOldSelection} 
                  className={`py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                    !isTradeInOnly && cartItems.length === 0 && !hasOldSelection ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
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
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingBattery ? 'Edit Battery' : 'Add New Battery'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingBattery(null); }} className={`text-2xl ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`} 
                  placeholder="e.g. Osaka 60Ah Battery" 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Price * (Rs.)</label>
                <input 
                  type="number" 
                  value={batteryFormData.purchase_price} 
                  onChange={(e) => setBatteryFormData({ ...batteryFormData, purchase_price: e.target.value })} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`} 
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`} 
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`} 
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`} 
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
                  className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'}`} 
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                  🔒 Category is automatically set to "Battery"
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingBattery(null); }} 
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
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