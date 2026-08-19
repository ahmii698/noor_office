// src/components/billing/BillingInvoice.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiUser, FiCalendar, FiClock, FiDollarSign, 
  FiPlus, FiX, FiPrinter, FiFileText, FiDownload, FiCheckCircle, 
  FiAlertCircle, FiTool, FiPackage, FiShoppingCart, FiCreditCard,
  FiChevronDown, FiChevronUp, FiTrash2, FiEdit2, FiSave,
  FiSearch, FiGrid, FiList as FiListIcon, FiTag, FiPercent, FiLoader,
  FiBox, FiZap, FiDroplet, FiWind, FiThermometer,
  FiStar, FiHeart, FiShield, FiTruck, FiMapPin, FiPhone, FiMail,
  FiGlobe, FiLock, FiUnlock, FiSettings, FiHome, FiBriefcase, FiCoffee,
  FiMusic, FiFilm, FiBook, FiCamera, FiCode, FiDatabase, FiServer,
  FiCpu, FiHardDrive, FiMonitor,
  FiFacebook, FiInstagram, FiGift, FiArchive
} from 'react-icons/fi';
import api, { saveCart } from '../../services/api';
import logo from '/logo.jpg';

// Icon list for dropdown
const iconOptions = [
  { name: 'Tool', icon: <FiTool size={24} />, value: 'tool' },
  { name: 'Zap', icon: <FiZap size={24} />, value: 'zap' },
  { name: 'Droplet', icon: <FiDroplet size={24} />, value: 'droplet' },
  { name: 'Wind', icon: <FiWind size={24} />, value: 'wind' },
  { name: 'Thermometer', icon: <FiThermometer size={24} />, value: 'thermometer' },
  { name: 'Star', icon: <FiStar size={24} />, value: 'star' },
  { name: 'Heart', icon: <FiHeart size={24} />, value: 'heart' },
  { name: 'Shield', icon: <FiShield size={24} />, value: 'shield' },
  { name: 'Truck', icon: <FiTruck size={24} />, value: 'truck' },
  { name: 'Map Pin', icon: <FiMapPin size={24} />, value: 'map-pin' },
  { name: 'Phone', icon: <FiPhone size={24} />, value: 'phone' },
  { name: 'Mail', icon: <FiMail size={24} />, value: 'mail' },
  { name: 'Globe', icon: <FiGlobe size={24} />, value: 'globe' },
  { name: 'Lock', icon: <FiLock size={24} />, value: 'lock' },
  { name: 'Unlock', icon: <FiUnlock size={24} />, value: 'unlock' },
  { name: 'Settings', icon: <FiSettings size={24} />, value: 'settings' },
  { name: 'Home', icon: <FiHome size={24} />, value: 'home' },
  { name: 'Briefcase', icon: <FiBriefcase size={24} />, value: 'briefcase' },
  { name: 'Coffee', icon: <FiCoffee size={24} />, value: 'coffee' },
  { name: 'Package', icon: <FiPackage size={24} />, value: 'package' },
  { name: 'Box', icon: <FiBox size={24} />, value: 'box' },
  { name: 'Tag', icon: <FiTag size={24} />, value: 'tag' },
  { name: 'Percent', icon: <FiPercent size={24} />, value: 'percent' },
  { name: 'Clock', icon: <FiClock size={24} />, value: 'clock' },
  { name: 'Calendar', icon: <FiCalendar size={24} />, value: 'calendar' },
  { name: 'Dollar', icon: <FiDollarSign size={24} />, value: 'dollar' },
  { name: 'Credit Card', icon: <FiCreditCard size={24} />, value: 'credit-card' }
];

const getIconComponent = (iconValue) => {
  const found = iconOptions.find(opt => opt.value === iconValue);
  return found ? found.icon : <FiTool size={24} />;
};

// Helper: Round to 2 decimals - ONLY FOR DISPLAY
const roundToTwo = (num) => {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};

// Get user role from localStorage
const getUserRole = () => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      return userData?.role || 'employee';
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  return 'employee';
};

// Helper function to format date as mm/dd/yyyy
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch (e) {
    return dateString;
  }
};

const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

const formatDateForAPI = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const loadImageAsBase64 = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

// ✅ Bank Names List
const BANK_NAMES = [
  { value: 'allied', label: 'Allied Bank' },
  { value: 'alfalah', label: 'Bank Alfalah' },
  { value: 'hbl', label: 'HBL (Habib Bank Limited)' },
  { value: 'meezan', label: 'Meezan Bank' },
  { value: 'ubl', label: 'UBL (United Bank Limited)' },
];

const BillingInvoice = ({ customerDetails, darkMode, onPaymentSuccess, restoredData }) => {
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  
  const [customerBirthday, setCustomerBirthday] = useState('');
  const [birthdayError, setBirthdayError] = useState('');
  const [previousVisits, setPreviousVisits] = useState([]);
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    price: '',
    category: '',
    icon: 'tool'
  });
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    purchase_price: '',
    selling_price: '',
    quantity: ''
  });
  
  // Oil Change Modal states
  const [isOilChangeModalOpen, setIsOilChangeModalOpen] = useState(false);
  const [oilChangeMileage, setOilChangeMileage] = useState('');
  const [oilChangeService, setOilChangeService] = useState(null);
  
  // Draft Bill states
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
  const isProcessingRef = useRef(false);
  const paymentExecutedRef = useRef(false);
  
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // Get current date
  const currentDate = new Date().toISOString().split('T')[0];

  // Check for restored data and set cart
  useEffect(() => {
    if (restoredData && restoredData.cart_items && restoredData.cart_items.length > 0) {
      const restoredItems = restoredData.cart_items.map(item => ({
        ...item,
        type: item.type || 'service',
        price: item.price || 0,
        quantity: item.quantity || 1
      }));
      setCart(restoredItems);
      toast.success(`✅ ${restoredItems.length} items restored!`);
    }
  }, [restoredData]);

  const subtotal = useMemo(() => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return roundToTwo(total);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!discountValue || parseFloat(discountValue) <= 0) return 0;
    const val = parseFloat(discountValue);
    if (discountType === 'percentage') {
      return (subtotal * val) / 100;
    } else {
      return val;
    }
  }, [subtotal, discountValue, discountType]);

  const billTotal = useMemo(() => {
    return roundToTwo(subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const paidAmount = useMemo(() => {
    if (!paymentAmount || paymentAmount === '') return 0;
    const val = parseFloat(paymentAmount);
    if (isNaN(val)) return 0;
    return val;
  }, [paymentAmount]);

  const remainingAmount = useMemo(() => {
    return billTotal - paidAmount;
  }, [billTotal, paidAmount]);

  const isFullyPaid = useMemo(() => {
    return remainingAmount <= 0.01;
  }, [remainingAmount]);

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
    
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      setBirthdayError('Invalid date');
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
    
    setCustomerBirthday(value);
    
    if (value.length === 10) {
      validateBirthday(value);
    } else {
      setBirthdayError('');
    }
  };

  const getFormattedBirthday = (birthdayStr) => {
    if (!birthdayStr) return 'Not Provided';
    const date = parseDateString(birthdayStr);
    if (date) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return birthdayStr;
  };

  useEffect(() => {
    if (customerDetails?.birthday) {
      const formatted = formatDate(customerDetails.birthday);
      setCustomerBirthday(formatted);
    } else {
      setCustomerBirthday('');
    }
  }, [customerDetails]);

  useEffect(() => {
    const fetchPreviousVisits = async () => {
      if (!isAdmin || !customerDetails?.phone) {
        setPreviousVisits([]);
        return;
      }
      
      try {
        const response = await api.get(`/invoices/customer/${customerDetails.phone}`);
        if (response.data && Array.isArray(response.data)) {
          const visits = response.data.slice(0, 10).map(inv => ({
            id: inv.id,
            date: inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : 'N/A',
            services: inv.items?.map(item => item.service_name).join(', ') || 'N/A',
            total: inv.total_amount || 0,
            status: inv.status || 'Paid'
          }));
          setPreviousVisits(visits);
        } else {
          setPreviousVisits([]);
        }
      } catch (error) {
        console.error('Error fetching previous visits:', error);
        setPreviousVisits([]);
      }
    };

    fetchPreviousVisits();
  }, [customerDetails, isAdmin]);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setServices(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        setServices(response.data);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      toast.error('Failed to load services');
    }
  };

  // ✅ UPDATED: fetchProducts with Battery filter
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      
      let productsArray = [];
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        productsArray = response.data;
      }
      
      if (productsArray.length > 0) {
        const visibleProducts = productsArray.filter(product => {
          const isHidden = product.is_hidden === 1 || 
                          product.is_hidden === true || 
                          product.is_hidden === '1';
          // ✅ Battery wale products ko hide karo (Billing page se)
          const isBattery = product.category === 'Battery' || 
                            product.name?.toLowerCase().includes('battery');
          return !isHidden && !isBattery;
        });
        setProducts(visibleProducts);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Failed to load products');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchServices(), fetchProducts()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // ==================== SAVE AS DRAFT FUNCTION ====================
  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      toast.error('No items to save as draft');
      return;
    }

    setIsSavingDraft(true);
    try {
      const cartData = {
        cart_items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: roundToTwo(item.price),
          quantity: item.quantity,
          type: item.type || 'service',
          mileage: item.mileage || null,
          category: item.category || null
        })),
        cart_summary: {
          total_items: cart.reduce((sum, i) => sum + i.quantity, 0),
          total_amount: billTotal,
          subtotal: subtotal,
          discount: discountAmount
        },
        customer_phone: customerDetails.phone || '',
        customer_name: customerDetails.name || '',
        customer_email: customerDetails.email || '',
        customer_car_number: customerDetails.carNumber || '',
        customer_car_model: customerDetails.carModel || '',
        customer_birthday: customerBirthday || ''
      };

      const response = await saveCart(cartData);
      if (response.success) {
        toast.success('💾 Bill saved as draft successfully!');
        setCart([]);
        setPaymentAmount('');
        setDiscountValue('');
        setDiscountNote('');
        setShowDiscount(false);
        setCustomerBirthday('');
        setSelectedBank('');
        window.dispatchEvent(new Event('discarded-update'));
        if (onPaymentSuccess) onPaymentSuccess();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ==================== SERVICE FUNCTIONS ====================
  const handleAddService = async () => {
    if (!serviceFormData.name || !serviceFormData.price || !serviceFormData.category) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const response = await api.post('/services', {
        name: serviceFormData.name,
        price: parseFloat(serviceFormData.price),
        category: serviceFormData.category,
        icon: serviceFormData.icon
      });
      if (response.data) {
        toast.success('Service added successfully!');
        await fetchServices();
        setIsServiceModalOpen(false);
        setServiceFormData({ name: '', price: '', category: '', icon: 'tool' });
        setEditingService(null);
      }
    } catch (err) {
      console.error('Error adding service:', err);
      toast.error(err.response?.data?.message || 'Failed to add service');
    }
  };

  const handleUpdateService = async () => {
    if (!serviceFormData.name || !serviceFormData.price || !serviceFormData.category) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const response = await api.put(`/services/${editingService.id}`, {
        name: serviceFormData.name,
        price: parseFloat(serviceFormData.price),
        category: serviceFormData.category,
        icon: serviceFormData.icon
      });
      if (response.data) {
        toast.success('Service updated successfully!');
        await fetchServices();
        setIsServiceModalOpen(false);
        setServiceFormData({ name: '', price: '', category: '', icon: 'tool' });
        setEditingService(null);
      }
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error(err.response?.data?.message || 'Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId, serviceName) => {
    if (window.confirm(`Are you sure you want to delete "${serviceName}"?`)) {
      try {
        await api.delete(`/services/${serviceId}`);
        toast.success('Service deleted successfully!');
        await fetchServices();
      } catch (err) {
        console.error('Error deleting service:', err);
        toast.error(err.response?.data?.message || 'Failed to delete service');
      }
    }
  };

  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceFormData({ name: '', price: '', category: '', icon: 'tool' });
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      price: service.price,
      category: service.category,
      icon: service.icon || 'tool'
    });
    setIsServiceModalOpen(true);
  };

  // ==================== PRODUCT FUNCTIONS ====================
  const handleAddProduct = async () => {
    if (!productFormData.name || !productFormData.purchase_price || !productFormData.selling_price || !productFormData.quantity) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const payload = {
        name: productFormData.name,
        purchase_price: parseFloat(productFormData.purchase_price),
        selling_price: parseFloat(productFormData.selling_price),
        quantity: parseInt(productFormData.quantity),
        is_hidden: 0
      };
      console.log('📤 Adding product payload:', payload);
      const response = await api.post('/products', payload);
      if (response.data) {
        toast.success('Product added successfully!');
        await fetchProducts();
        setIsProductModalOpen(false);
        setProductFormData({ name: '', purchase_price: '', selling_price: '', quantity: '' });
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('Error adding product:', err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(key => {
          toast.error(`${key}: ${errors[key].join(', ')}`);
        });
      } else {
        toast.error(err.response?.data?.message || 'Failed to add product');
      }
    }
  };

  const handleUpdateProduct = async () => {
    if (!productFormData.name || !productFormData.purchase_price || !productFormData.selling_price || !productFormData.quantity) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const payload = {
        name: productFormData.name,
        purchase_price: parseFloat(productFormData.purchase_price),
        selling_price: parseFloat(productFormData.selling_price),
        quantity: parseInt(productFormData.quantity)
      };
      console.log('📤 Updating product payload:', payload);
      const response = await api.put(`/products/${editingProduct.id}`, payload);
      if (response.data) {
        toast.success('Product updated successfully!');
        await fetchProducts();
        setIsProductModalOpen(false);
        setProductFormData({ name: '', purchase_price: '', selling_price: '', quantity: '' });
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('Error updating product:', err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(key => {
          toast.error(`${key}: ${errors[key].join(', ')}`);
        });
      } else {
        toast.error(err.response?.data?.message || 'Failed to update product');
      }
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      try {
        await api.delete(`/products/${productId}`);
        toast.success('Product deleted successfully!');
        await fetchProducts();
      } catch (err) {
        console.error('Error deleting product:', err);
        toast.error(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductFormData({ name: '', purchase_price: '', selling_price: '', quantity: '' });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity: product.quantity
    });
    setIsProductModalOpen(true);
  };

  const selectIcon = (iconValue) => {
    setServiceFormData({ ...serviceFormData, icon: iconValue });
    setShowIconDropdown(false);
  };

  const filteredServices = searchTerm ? 
    services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())) : services;

  const filteredProducts = searchTerm ? 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : products;

  const getProductStock = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.quantity : 0;
  };

  // Add to bill - WITH OIL CHANGE MODAL
  const addToBill = (item, type) => {
    const isOilChange = item.name?.toLowerCase().includes('oil') || 
                        item.name?.toLowerCase().includes('engine oil') ||
                        item.name?.toLowerCase().includes('oil change');

    if (isOilChange && type === 'service') {
      setOilChangeService(item);
      setIsOilChangeModalOpen(true);
      return;
    }

    addItemToBill(item, type);
  };

  const addItemToBill = (item, type, mileage = null) => {
    const currentStock = type === 'product' ? getProductStock(item.id) : null;
    if (currentStock !== null && currentStock <= 0) {
      toast.error(`${item.name} is out of stock!`);
      return;
    }
    const alreadyInCart = cart.find(cartItem => cartItem.id === item.id && cartItem.type === type);
    if (alreadyInCart) {
      toast.error(`${item.name} already added to bill`);
      return;
    }
    setCart([...cart, { 
      ...item, 
      quantity: 1, 
      type: type,
      price: type === 'service' ? item.price : item.selling_price,
      mileage: mileage
    }]);
    toast.success(`${item.name} added`);
  };

  const handleOilChangeSubmit = () => {
    const mileage = parseInt(oilChangeMileage);
    if (!oilChangeMileage || isNaN(mileage) || mileage < 0) {
      toast.error('Please enter a valid mileage');
      return;
    }
    addItemToBill(oilChangeService, 'service', mileage);
    setIsOilChangeModalOpen(false);
    setOilChangeMileage('');
    setOilChangeService(null);
  };

  const updateQuantity = (id, newQuantity, type) => {
    if (newQuantity < 1) {
      removeFromBill(id, type);
      return;
    }
    if (type === 'product') {
      const stock = getProductStock(id);
      if (newQuantity > stock + (cart.find(i => i.id === id)?.quantity || 0)) {
        toast.error(`Only ${stock} items available in stock`);
        return;
      }
    }
    setCart(cart.map(item => 
      item.id === id && item.type === type ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromBill = (id, type) => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)));
    toast.success('Removed from bill');
  };

  const addServiceReminder = async (invoiceNo, serviceItems) => {
    try {
      const reminderServices = [
        'oil', 'tuning', 'engine', 'performance', 
        'ac service', 'compressor', 'filter', 'gas refill',
        'ac repair', 'cooling', 'service'
      ];
      const needsReminder = serviceItems.some(item => 
        reminderServices.some(service => item.name?.toLowerCase().includes(service))
      );
      if (needsReminder) {
        const customerEmail = customerDetails.email || null;
        const response = await api.post('/reminders/add', {
          invoice_no: invoiceNo,
          customer_name: customerDetails.name,
          customer_phone: customerDetails.phone,
          customer_email: customerEmail,
          car_number: customerDetails.carNumber,
          service_type: 'service'
        });
        if (response.data.success) return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding reminder:', error);
      return false;
    }
  };

  // ==================== PRINT BILL ====================
  const printBill = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
      toast.error('Please allow popups to print bill');
      return;
    }
    
    const invoiceDate = customerDetails.date ? new Date(customerDetails.date) : new Date();
    const formattedDate = invoiceDate.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    
    const cartItemsHtml = cart.map((item, idx) => `
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">
          ${item.name}
          ${item.mileage ? `<br/><span style="font-size:10px;color:#666;">Mileage: ${item.mileage} km</span>` : ''}
        </td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${item.type === 'service' ? 'Service' : 'Part'}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${roundToTwo(item.price).toLocaleString()}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${roundToTwo(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const displayDiscount = roundToTwo(discountAmount);
    const discountRowHtml = discountAmount > 0 ? `
      <tr>
        <td colspan="5" style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">Discount</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">- Rs. ${displayDiscount.toLocaleString()}</td>
      </tr>
    ` : '';

    const displayPaidAmount = roundToTwo(paidAmount);
    const displayRemainingAmount = roundToTwo(remainingAmount);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Noorani Car AC - Invoice</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: white; padding: 20px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 20px; }
            .header-logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #dc2626; flex-shrink: 0; }
            .header-text { flex: 1; text-align: center; }
            .header-text .shop-name { font-size: 28px; font-weight: bold; color: #1f2937; letter-spacing: 1px; }
            .header-text .subtitle { font-size: 14px; color: #6b7280; margin-top: 2px; }
            .customer-info { margin: 20px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .customer-info h4 { margin-bottom: 10px; color: #1f2937; font-size: 14px; }
            .customer-info p { margin: 4px 0; font-size: 13px; color: #333; }
            .customer-info .info-row { display: flex; padding: 3px 0; }
            .customer-info .info-label { font-weight: 600; min-width: 120px; color: #4b5563; }
            .customer-info .info-value { color: #1f2937; }
            .invoice-details { display: flex; justify-content: space-between; margin: 20px; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; }
            table { width: calc(100% - 40px); margin: 20px; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
            th { background: #1f2937; color: white; font-weight: 600; }
            th:nth-child(1) { text-align: center; }
            th:nth-child(3) { text-align: center; }
            th:nth-child(4) { text-align: center; }
            th:nth-child(5) { text-align: right; }
            th:nth-child(6) { text-align: right; }
            .payment-details { margin: 20px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .payment-details h4 { margin-bottom: 10px; color: #1f2937; font-size: 14px; }
            .payment-details p { margin: 4px 0; font-size: 13px; }
            .payment-status-paid { color: #16a34a; font-weight: bold; }
            .payment-status-pending { color: #ea580c; font-weight: bold; }
            .total-row { font-size: 20px; font-weight: bold; text-align: right; margin: 20px; padding-top: 12px; border-top: 2px solid #e5e7eb; color: #dc2626; }
            .signature { margin: 20px; display: flex; justify-content: space-between; padding-top: 30px; font-size: 12px; }
            .footer { padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #e5e7eb; font-size: 12px; color: #4b5563; }
            .footer .address { margin-bottom: 4px; }
            .footer .social { margin-top: 6px; }
            .footer .social span { display: block; margin: 2px 0; }
            .print-actions { text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 12px; max-width: 800px; margin-left: auto; margin-right: auto; }
            .print-btn, .close-btn { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; margin: 0 8px; }
            .print-btn { background: #dc2626; color: white; }
            .close-btn { background: #6b7280; color: white; }
            @media print { body { background: white; padding: 0; } .print-actions { display: none; } .invoice-container { box-shadow: none; border-radius: 0; } }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="${logo}" alt="Noorani Car AC Logo" class="header-logo" />
              <div class="header-text">
                <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
                <div class="subtitle">Professional Auto Care Service</div>
              </div>
            </div>
            <div class="customer-info">
              <h4>CUSTOMER INFORMATION</h4>
              <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${customerDetails.name || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${customerDetails.phone || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${customerDetails.email || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Car Number:</span><span class="info-value">${customerDetails.carNumber || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Car Model:</span><span class="info-value">${customerDetails.carModel || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Birthday:</span><span class="info-value">${customerBirthday ? getFormattedBirthday(customerBirthday) : 'Not Provided'}</span></div>
            </div>
            <div class="invoice-details">
              <p><strong>Invoice #:</strong> INV-${Date.now()}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align:center;">#</th>
                  <th>Item</th>
                  <th style="text-align:center;">Type</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${cartItemsHtml}
                ${discountRowHtml}
              </tbody>
            </table>
            <div class="payment-details">
              <h4>PAYMENT DETAILS</h4>
              <p><strong>Subtotal:</strong> Rs. ${roundToTwo(subtotal).toLocaleString()}</p>
              ${discountAmount > 0 ? `<p><strong>Discount:</strong> - Rs. ${displayDiscount.toLocaleString()}</p>` : ''}
              <p><strong>Total Amount:</strong> Rs. ${roundToTwo(billTotal).toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${displayPaidAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${getPaymentMethodDisplay()}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${displayRemainingAmount.toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${isFullyPaid ? '<span class="payment-status-paid">FULLY PAID</span>' : '<span class="payment-status-pending">PENDING</span>'}</p>
            </div>
            <div class="total-row">Total: Rs. ${roundToTwo(billTotal).toLocaleString()}</div>
            <div class="signature">
              <p>Customer Signature: _________________</p>
              <p>Authorized Signature: _________________</p>
            </div>
            <div class="footer">
              <div class="address">
                Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi
              </div>
              <div>
                📞 0337 3267363
              </div>
              <div class="social">
                <span>📘 Facebook: Noorani.Car.AC</span>
                <span>📷 Instagram: nooranicarac</span>
              </div>
            </div>
          </div>
          <div class="print-actions">
            <button class="print-btn" onclick="window.print()">🖨️ Print Bill</button>
            <button class="close-btn" onclick="window.close()">✖ Close</button>
          </div>
          <script>setTimeout(function() { window.print(); }, 300);</script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    toast.success('Print preview opened');
  };

  // ==================== PDF EXPORT - REMOVED ====================
  // exportToPDF function completely removed

  // ==================== EXCEL EXPORT - REMOVED ====================
  // exportToExcel function completely removed

  // handlePayment — Payment amount is OPTIONAL, 0 allowed
  const handlePayment = async () => {
    if (isProcessingRef.current || paymentExecutedRef.current) return;
    if (cart.length === 0) {
      toast.error('No items in bill');
      return;
    }
    
    if (paymentMethod === 'bank' && !selectedBank) {
      toast.error('Please select a bank for bank transfer');
      return;
    }
    
    const exactPaidAmount = paymentAmount && paymentAmount !== '' ? parseFloat(paymentAmount) : 0;
    
    if (exactPaidAmount > billTotal) {
      toast.error(`Payment amount (Rs. ${exactPaidAmount.toLocaleString()}) cannot exceed total amount (Rs. ${billTotal.toLocaleString()})`);
      return;
    }
    
    isProcessingRef.current = true;
    paymentExecutedRef.current = true;
    setIsProcessing(true);
    
    const cartSnapshot = [...cart];
    const invoiceNo = `INV-${Date.now()}`;
    
    const roundedSubtotal = roundToTwo(subtotal);
    const roundedDiscount = roundToTwo(discountAmount);
    const roundedBillTotal = roundToTwo(billTotal);
    const exactRemainingAmount = roundedBillTotal - exactPaidAmount;
    const finalStatus = exactRemainingAmount <= 0.01 ? 'Paid' : (exactPaidAmount > 0 ? 'Partial' : 'Pending');
    
    const paymentMethodDisplay = getPaymentMethodDisplay();
    
    try {
      for (const item of cartSnapshot) {
        if (item.type === 'product') {
          const currentProduct = products.find(p => p.id === item.id);
          if (currentProduct) {
            const newQuantity = currentProduct.quantity - item.quantity;
            const finalQuantity = Math.max(0, newQuantity);
            await api.put(`/products/${item.id}`, { quantity: finalQuantity });
          }
        }
      }
      
      const customerName = customerDetails.name?.trim() || 'Guest';
      const customerPhone = customerDetails.phone?.trim() || 'N/A';
      const customerEmail = customerDetails.email?.trim() || null;
      const customerCarNumber = customerDetails.carNumber?.trim() || 'N/A';
      const customerCarModel = customerDetails.carModel?.trim() || null;
      
      const payload = {
        invoice_no: invoiceNo,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_car_number: customerCarNumber,
        customer_car_model: customerCarModel,
        subtotal: roundedSubtotal,
        discount: roundedDiscount,
        discount_note: discountNote?.trim() || null,
        total_amount: roundedBillTotal,
        paid_amount: roundToTwo(exactPaidAmount),
        remaining_amount: roundToTwo(exactRemainingAmount),
        payment_method: paymentMethodDisplay,
        status: finalStatus,
        invoice_date: customerDetails?.date || currentDate,
        items: cartSnapshot.map(item => ({
          service_name: item.name,
          service_category: item.type === 'service' ? (item.category || 'Service') : 'Product',
          price: roundToTwo(item.price),
          quantity: item.quantity,
          mileage: item.mileage || null
        }))
      };
      
      console.log('📤 Sending invoice payload:', JSON.stringify(payload, null, 2));
      
      await api.post('/invoices', payload);
      
      const reminderAdded = await addServiceReminder(invoiceNo, cartSnapshot);
      if (reminderAdded) {
        toast.success(customerDetails.email ? 'Invoice created! 6-month reminder scheduled!' : 'Invoice created! Reminder saved');
      } else {
        toast.success('Invoice created successfully!');
      }
      
      setCart([]);
      setPaymentAmount('');
      setDiscountValue('');
      setDiscountNote('');
      setShowDiscount(false);
      setCustomerBirthday('');
      setSelectedBank('');
      await fetchProducts();

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err) {
      console.error('❌ Payment error:', err);
      
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages = Object.keys(errors).map(key => {
          const messages = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
          return `${key}: ${messages}`;
        });
        toast.error(`Validation failed: ${errorMessages.join('; ')}`);
      } else if (err.response?.data?.message) {
        toast.error(`Failed: ${err.response.data.message}`);
      } else if (err.response?.data?.error) {
        toast.error(`Failed: ${err.response.data.error}`);
      } else {
        toast.error('Failed to create invoice. Please try again.');
      }
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
        paymentExecutedRef.current = false;
        setIsProcessing(false);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-5 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <img 
            src={logo} 
            alt="Noorani Car AC Logo" 
            className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-lg flex-shrink-0"
          />
          <div className="flex-1 text-center">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>NOORANI CAR A/C & AUTOS</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Professional Auto Care Service</p>
          </div>
        </div>
      </div>

      {/* Customer Info - All fields optional */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-5 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Step 1: Customer Details</h3>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enter customer information - Phone number auto-searches history</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number <span className="text-xs text-gray-400 block">Type to search history</span></label>
            <input type="text" value={customerDetails.phone || ''} readOnly className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Customer Name</label>
            <input type="text" value={customerDetails.name || ''} readOnly className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email Address <span className="text-xs text-gray-400">(Optional)</span></label>
            <input type="email" value={customerDetails.email || ''} readOnly className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Car Number Plate <span className="text-xs text-gray-400">(Optional)</span></label>
            <input type="text" value={customerDetails.carNumber || ''} readOnly className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Car Model <span className="text-xs text-gray-400">(Optional)</span></label>
            <input type="text" value={customerDetails.carModel || ''} readOnly className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Birthday <span className="text-xs text-gray-400">(Optional - mm/dd/yyyy)</span></label>
            <div className="relative">
              <input type="text" value={customerBirthday} onChange={handleBirthdayChange} placeholder="e.g. 01/15/1990" className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} ${customerBirthday && !birthdayError ? 'border-green-500' : ''} ${birthdayError ? 'border-red-500' : ''}`} maxLength={10} inputMode="numeric" />
              {customerBirthday && !birthdayError && <div className="absolute right-3 top-1/2 -translate-y-1/2"><span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✅ Valid</span></div>}
              {birthdayError && <div className="absolute right-3 top-1/2 -translate-y-1/2"><span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">⚠️</span></div>}
            </div>
            {birthdayError && <p className="text-xs text-red-500 mt-1">{birthdayError}</p>}
            {customerBirthday && !birthdayError && <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>✅ Birthday: {getFormattedBirthday(customerBirthday)}</p>}
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Format: mm/dd/yyyy (e.g., 01/15/1990)</p>
          </div>
        </div>

        {isAdmin && previousVisits.length > 0 && (
          <div className="mt-6">
            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}><FiClock className="text-red-500" /> Previous Visits ({previousVisits.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Services</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-center">Status</th></tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {previousVisits.map((visit, index) => (
                    <tr key={index} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">{visit.date}</td>
                      <td className="px-4 py-2">{visit.services}</td>
                      <td className="px-4 py-2 text-right font-semibold">Rs. {visit.total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">{visit.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Showing last {previousVisits.length} visits</p>
          </div>
        )}
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('services')} className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${activeTab === 'services' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><FiTool className="text-lg" /> Services</button>
        <button onClick={() => setActiveTab('products')} className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${activeTab === 'products' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><FiPackage className="text-lg" /> Parts & Accessories</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {activeTab === 'services' ? <FiTool className="text-white text-xl" /> : <FiPackage className="text-white text-xl" />}
                <h3 className="text-lg font-semibold text-white">{activeTab === 'services' ? 'Available Services' : 'Parts & Accessories'}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={activeTab === 'services' ? openAddServiceModal : openAddProductModal} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center gap-1 text-white text-sm"><FiPlus className="text-sm" /> Add</button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white/20' : 'hover:bg-white/10'}`}><FiGrid className="text-white" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white/20' : 'hover:bg-white/10'}`}><FiListIcon className="text-white" /></button>
              </div>
            </div>
            <div className="relative mt-3">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
              <input type="text" placeholder={`Search ${activeTab === 'services' ? 'services' : 'parts'}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50" />
            </div>
          </div>
          
          <div className={`p-4 max-h-[500px] overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {activeTab === 'services' ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredServices.map(service => (
                    <div key={service.id} className={`relative group p-4 rounded-xl transition-all duration-200 cursor-pointer ${darkMode ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-red-500' : 'bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300'}`}>
                      <div onClick={() => addToBill(service, 'service')}>
                        <div className="text-red-500 mb-2">{getIconComponent(service.icon || 'tool')}</div>
                        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{service.category}</p>
                        <p className="text-red-500 font-bold text-lg mt-2">Rs. {service.price.toLocaleString()}</p>
                      </div>
                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); openEditServiceModal(service); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map(service => (
                    <div key={service.id} className={`relative group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-red-50'}`}>
                      <div onClick={() => addToBill(service, 'service')} className="flex-1 flex items-center gap-3">
                        <div className="text-red-500">{getIconComponent(service.icon || 'tool')}</div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{service.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">Rs. {service.price.toLocaleString()}</p>
                      </div>
                      {isAdmin && (
                        <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); openEditServiceModal(service); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiPackage className="text-4xl mx-auto mb-3 text-gray-300" />
                  <p>No visible products found.</p>
                  <p className="text-sm mt-1">Add a new product or show hidden ones.</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map(product => {
                    const stock = product.quantity;
                    const isOutOfStock = stock <= 0;
                    return (
                      <div key={product.id} className={`relative group p-4 rounded-xl transition-all duration-200 cursor-pointer ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : darkMode ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-red-500' : 'bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300'}`}>
                        <div onClick={() => !isOutOfStock && addToBill(product, 'product')}>
                          <FiPackage className="text-3xl mb-2 text-gray-500" />
                          <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Stock: {stock} units</p>
                          <p className="text-red-500 font-bold text-lg mt-2">Rs. {product.selling_price.toLocaleString()}</p>
                          {stock < 5 && stock > 0 && <p className="text-xs text-yellow-500 mt-1">Only {stock} left!</p>}
                          {isOutOfStock && <p className="text-xs text-red-500 mt-1">Out of stock!</p>}
                        </div>
                        {isAdmin && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={(e) => { e.stopPropagation(); openEditProductModal(product); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      No matching products found.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => {
                    const stock = product.quantity;
                    const isOutOfStock = stock <= 0;
                    return (
                      <div key={product.id} className={`relative group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-red-50'}`}>
                        <div onClick={() => !isOutOfStock && addToBill(product, 'product')} className="flex-1 flex items-center gap-3">
                          <FiPackage className="text-xl text-gray-500" />
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stock: {stock} units</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-red-500 font-bold">Rs. {product.selling_price.toLocaleString()}</p>
                          {stock < 5 && stock > 0 && <p className="text-xs text-yellow-500">Only {stock} left!</p>}
                        </div>
                        {isAdmin && (
                          <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={(e) => { e.stopPropagation(); openEditProductModal(product); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No matching products found.
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bill Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex items-center gap-2">
              <FiShoppingCart className="text-white text-xl" />
              <h3 className="text-lg font-semibold text-white">Current Bill</h3>
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm text-white">{cart.length} items</span>
            </div>
          </div>
          
          <div className="p-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <FiShoppingCart className="text-4xl text-red-500" />
                </div>
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cart is empty</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Click on services or parts to add</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[350px] overflow-y-auto mb-4 pr-2">
                  {cart.map((item, idx) => (
                    <div key={`${item.id}-${item.type}`} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-500 font-bold text-sm">{idx + 1}</span>
                        </div>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.type === 'service' ? 'Service' : 'Part'} • Rs. {roundToTwo(item.price).toLocaleString()} each
                            {item.mileage && <span className="ml-2 text-blue-500">Mileage: {item.mileage} km</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-600 rounded-lg px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.type)} className="w-6 h-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center" disabled={isProcessing}>-</button>
                          <span className={`w-8 text-center font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.type)} className="w-6 h-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center" disabled={isProcessing}>+</button>
                        </div>
                        <p className={`font-bold text-red-500 min-w-[80px] text-right`}>Rs. {roundToTwo(item.price * item.quantity).toLocaleString()}</p>
                        <button onClick={() => removeFromBill(item.id, item.type)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition flex items-center justify-center" disabled={isProcessing}>
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t-2 dark:border-gray-600 space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Items:</span>
                    <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal:</span>
                    <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-700'}`}>Rs. {roundToTwo(subtotal).toLocaleString()}</span>
                  </div>

                  <div className="py-2">
                    <button onClick={() => setShowDiscount(!showDiscount)} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition font-medium">
                      <FiGift className="text-lg" />
                      {showDiscount ? 'Hide Discount' : 'Add Discount'}
                    </button>
                    
                    {showDiscount && (
                      <div className={`mt-3 p-4 rounded-xl border ${darkMode ? 'border-red-500/30 bg-gray-700' : 'border-red-200 bg-red-50'}`}>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Discount Type</label>
                            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}>
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed Amount (Rs.)</option>
                            </select>
                          </div>
                          <div>
                            <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{discountType === 'percentage' ? 'Discount %' : 'Discount Amount (Rs.)'}</label>
                            <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} min="0" step={discountType === 'percentage' ? '1' : '0.01'} />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Note <span className="text-xs text-gray-400">(Internal use only - not shown on bill)</span></label>
                          <input type="text" value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} placeholder="Internal note (not shown on bill)" className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} />
                        </div>
                        {discountAmount > 0 && (
                          <div className="mt-3 pt-3 border-t dark:border-gray-600">
                            <div className="flex justify-between items-center">
                              <span className="text-red-500 font-semibold">Discount Applied:</span>
                              <span className="text-red-500 font-bold text-lg">- Rs. {roundToTwo(discountAmount).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t dark:border-gray-600">
                    <span className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Amount:</span>
                    <span className="text-3xl font-bold text-red-500">Rs. {roundToTwo(billTotal).toLocaleString()}</span>
                  </div>

                  {/* Payment Details with Bank Dropdown */}
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mt-4`}>
                    <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FiCreditCard className="text-red-500" /> Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount (Rs.)</label>
                        <input 
                          type="text" 
                          value={paymentAmount} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setPaymentAmount(val);
                          }} 
                          placeholder="Enter amount (optional)" 
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} 
                          disabled={isProcessing} 
                        />
                        <p className="text-xs text-gray-400 mt-1">Bill Total: Rs. {billTotal.toLocaleString()} • Leave empty for pending</p>
                      </div>
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                        <select 
                          value={paymentMethod} 
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            if (e.target.value !== 'bank') {
                              setSelectedBank('');
                            }
                          }} 
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} 
                          disabled={isProcessing}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Credit/Debit Card</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="online">Mobile Wallet</option>
                        </select>
                      </div>
                    </div>

                    {paymentMethod === 'bank' && (
                      <div className="mt-3">
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Select Bank</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                          disabled={isProcessing}
                        >
                          <option value="">-- Select Bank --</option>
                          {BANK_NAMES.map((bank) => (
                            <option key={bank.value} value={bank.value}>
                              {bank.label}
                            </option>
                          ))}
                        </select>
                        {!selectedBank && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                            ⚠️ Please select a bank
                          </p>
                        )}
                        {selectedBank && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            ✅ Selected: {BANK_NAMES.find(b => b.value === selectedBank)?.label}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {paidAmount > 0 && (
                      <div className="mt-4 pt-4 border-t dark:border-gray-600">
                        <div className="flex justify-between py-2">
                          <span>Paid Amount:</span>
                          <span className={`font-semibold text-lg ${paidAmount > billTotal ? 'text-red-500' : 'text-green-600'}`}>
                            Rs. {paidAmount.toLocaleString()}
                            {paidAmount > billTotal && <span className="text-xs ml-2 text-red-500">(Exceeds total!)</span>}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span>Remaining:</span>
                          <span className={`font-semibold text-lg ${remainingAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            Rs. {remainingAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span>Status:</span>
                          <span className={`font-semibold flex items-center gap-2 ${isFullyPaid ? 'text-green-600' : 'text-orange-500'}`}>
                            {isFullyPaid ? <FiCheckCircle /> : <FiAlertCircle />}
                            {isFullyPaid ? 'FULLY PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ✅ UPDATED: PAY NOW + SAVE AS DRAFT - UPPAR */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={handlePayment} 
                      disabled={isProcessing || cart.length === 0 || (paymentMethod === 'bank' && !selectedBank)} 
                      className={`px-3 py-3 rounded-xl font-semibold transition shadow-lg flex items-center justify-center gap-2 text-sm ${
                        isProcessing || cart.length === 0 || (paymentMethod === 'bank' && !selectedBank)
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                      }`}
                    >
                      {isProcessing ? <FiLoader className="animate-spin" size={18} /> : <FiDollarSign size={18} />} 
                      <span className="truncate">{isProcessing ? 'PROCESSING...' : '💳 PAY NOW'}</span>
                    </button>
                    
                    <button 
                      onClick={handleSaveDraft} 
                      disabled={isSavingDraft || cart.length === 0} 
                      className={`px-3 py-3 rounded-xl font-semibold transition shadow-lg flex items-center justify-center gap-2 text-sm ${
                        isSavingDraft || cart.length === 0 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                    >
                      {isSavingDraft ? <FiLoader className="animate-spin" size={18} /> : <FiArchive size={18} />} 
                      {isSavingDraft ? 'SAVING...' : '💾 SAVE AS DRAFT'}
                    </button>
                  </div>

                  {/* ✅ PRINT BUTTON - NEEECHE */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button 
                      onClick={printBill} 
                      disabled={cart.length === 0}
                      className={`px-3 py-2.5 rounded-xl font-semibold transition shadow-lg flex items-center justify-center gap-2 text-sm ${
                        cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-white'
                      }`}
                    >
                      <FiPrinter size={18} /> 🖨️ PRINT BILL
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }} className="text-gray-500 hover:text-gray-700 text-2xl"><FiX /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Service Name *</label><input type="text" value={serviceFormData.name} onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter service name" /></div>
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Price * (Rs.)</label><input type="number" value={serviceFormData.price} onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter price" min="0" step="0.01" /></div>
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category *</label><input type="text" value={serviceFormData.category} onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter category" /></div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Icon</label>
                <div className="relative">
                  <button type="button" onClick={() => setShowIconDropdown(!showIconDropdown)} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-between ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}>
                    <div className="flex items-center gap-2">{getIconComponent(serviceFormData.icon)}<span className="text-sm">Select Icon</span></div>
                    <FiChevronDown className={`transition-transform ${showIconDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showIconDropdown && (
                    <div className={`absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border shadow-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {iconOptions.map((icon, index) => (
                          <button key={index} type="button" onClick={() => selectIcon(icon.value)} className={`p-2 rounded-lg text-center transition-colors flex items-center justify-center ${serviceFormData.icon === icon.value ? 'bg-red-500 text-white' : darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`} title={icon.name}>
                            {icon.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }} className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Cancel</button>
                <button type="button" onClick={editingService ? handleUpdateService : handleAddService} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"><FiCheckCircle className="text-sm" /> {editingService ? 'Update Service' : 'Add Service'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} className="text-gray-500 hover:text-gray-700 text-2xl"><FiX /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Product Name *</label><input type="text" value={productFormData.name} onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter product name" /></div>
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Price * (Rs.)</label><input type="number" value={productFormData.purchase_price} onChange={(e) => setProductFormData({ ...productFormData, purchase_price: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter purchase price" min="0" step="0.01" /></div>
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Selling Price * (Rs.)</label><input type="number" value={productFormData.selling_price} onChange={(e) => setProductFormData({ ...productFormData, selling_price: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter selling price" min="0" step="0.01" /></div>
              <div><label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Quantity *</label><input type="number" value={productFormData.quantity} onChange={(e) => setProductFormData({ ...productFormData, quantity: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter quantity" min="0" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Cancel</button>
                <button type="button" onClick={editingProduct ? handleUpdateProduct : handleAddProduct} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"><FiCheckCircle className="text-sm" /> {editingProduct ? 'Update Product' : 'Add Product'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Oil Change Modal */}
      {isOilChangeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl max-w-md w-full p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FiAlertCircle className="text-yellow-500" /> Oil Change
              </h3>
              <button
                onClick={() => {
                  setIsOilChangeModalOpen(false);
                  setOilChangeMileage('');
                  setOilChangeService(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                <FiX />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Please enter the current mileage for <strong>{oilChangeService?.name}</strong>
              </p>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Current Mileage (km) *
                </label>
                <input
                  type="number"
                  value={oilChangeMileage}
                  onChange={(e) => setOilChangeMileage(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="Enter current mileage"
                  min="0"
                  autoFocus
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  This will help track when next oil change is due
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOilChangeModalOpen(false);
                    setOilChangeMileage('');
                    setOilChangeService(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleOilChangeSubmit}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiCheckCircle /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingInvoice;