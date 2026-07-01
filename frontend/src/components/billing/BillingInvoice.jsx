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
  FiFacebook, FiInstagram, FiGift
} from 'react-icons/fi';
import api from '../../services/api';

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

const BillingInvoice = ({ customerDetails, darkMode }) => {
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  
  // DISCOUNT STATES
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  
  const [customerBirthday, setCustomerBirthday] = useState('');
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
  
  const isProcessingRef = useRef(false);
  const paymentExecutedRef = useRef(false);
  
  // Get user role
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // Calculate subtotal with rounding
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

  useEffect(() => {
    if (customerDetails?.birthday) {
      setCustomerBirthday(customerDetails.birthday);
    } else {
      setCustomerBirthday('');
    }
  }, [customerDetails]);

  // ✅ Fetch previous visits - ONLY if admin
  useEffect(() => {
    const fetchPreviousVisits = async () => {
      // ✅ ONLY ADMIN - if not admin, don't fetch
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
          return !isHidden;
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
        purchasePrice: parseFloat(productFormData.purchase_price),
        sellingPrice: parseFloat(productFormData.selling_price),
        quantity: parseInt(productFormData.quantity),
        is_hidden: 0
      };
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
        purchasePrice: parseFloat(productFormData.purchase_price),
        sellingPrice: parseFloat(productFormData.selling_price),
        quantity: parseInt(productFormData.quantity)
      };
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

  // Filter services by search term
  const filteredServices = searchTerm ? 
    services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())) : services;

  // Filter products by search term (only visible products are already loaded)
  const filteredProducts = searchTerm ? 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : products;

  const getProductStock = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.quantity : 0;
  };

  const addToBill = (item, type) => {
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
      price: type === 'service' ? item.price : item.selling_price
    }]);
    toast.success(`${item.name} added`);
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
    
    const cartItemsHtml = cart.map((item, idx) => `
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${item.type === 'service' ? 'Service' : 'Part'}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${roundToTwo(item.price).toLocaleString()}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${roundToTwo(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const displayDiscount = roundToTwo(discountAmount);
    const discountRowHtml = discountAmount > 0 ? `
      <tr>
        <td colspan="5" style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">Discount ${discountNote ? `(${discountNote})` : ''}</td>
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
            .invoice-details { display: flex; justify-content: space-between; margin: 20px; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; }
            table { width: calc(100% - 40px); margin: 20px; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
            th { background: #1f2937; color: white; font-weight: 600; }
            .payment-details { margin: 20px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .payment-details h4 { margin-bottom: 10px; color: #1f2937; font-size: 14px; }
            .payment-details p { margin: 4px 0; font-size: 13px; }
            .total-row { font-size: 20px; font-weight: bold; text-align: right; margin: 20px; padding-top: 12px; border-top: 2px solid #e5e7eb; color: #dc2626; }
            .signature { margin: 20px; display: flex; justify-content: space-between; padding-top: 30px; font-size: 12px; }
            .footer { padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #e5e7eb; font-size: 12px; color: #4b5563; }
            .footer .address { margin-bottom: 4px; }
            .footer .social { margin-top: 6px; }
            .footer .social span { display: block; margin: 2px 0; }
            .footer svg { display: inline; vertical-align: middle; margin-right: 6px; }
            .print-actions { text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 12px; max-width: 800px; margin-left: auto; margin-right: auto; }
            .print-btn, .close-btn { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; margin: 0 8px; }
            .print-btn { background: #dc2626; color: white; }
            .close-btn { background: #6b7280; color: white; }
            .discount-row { color: #dc2626; font-weight: bold; }
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
              <p><strong>Name:</strong> ${customerDetails.name}</p>
              <p><strong>Phone:</strong> ${customerDetails.phone}</p>
              <p><strong>Email:</strong> ${customerDetails.email || 'N/A'}</p>
              <p><strong>Car Number:</strong> ${customerDetails.carNumber}</p>
              <p><strong>Car Model:</strong> ${customerDetails.carModel || 'N/A'}</p>
              <p><strong>Birthday:</strong> ${customerBirthday ? new Date(customerBirthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not Provided'}</p>
            </div>
            <div class="invoice-details">
              <p><strong>Invoice #:</strong> INV-${Date.now()}</p>
              <p><strong>Date:</strong> ${customerDetails.date}</p>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Item</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${cartItemsHtml}
                ${discountRowHtml}
              </tbody>
            </table>
            <div class="payment-details">
              <h4>PAYMENT DETAILS</h4>
              <p><strong>Subtotal:</strong> Rs. ${roundToTwo(subtotal).toLocaleString()}</p>
              ${discountAmount > 0 ? `<p><strong>Discount:</strong> - Rs. ${displayDiscount.toLocaleString()} ${discountNote ? `(${discountNote})` : ''}</p>` : ''}
              <p><strong>Total Amount:</strong> Rs. ${roundToTwo(billTotal).toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${displayPaidAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${displayRemainingAmount.toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${isFullyPaid ? 'FULLY PAID' : 'PENDING'}</p>
            </div>
            <div class="total-row">Total: Rs. ${roundToTwo(billTotal).toLocaleString()}</div>
            <div class="signature">
              <p>Customer Signature: _________________</p>
              <p>Authorized Signature: _________________</p>
            </div>
            <div class="footer">
              <div class="address">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi
              </div>
              <div>
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                0337 3267363
              </div>
              <div class="social">
                <span>
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook: https://www.facebook.com/Noorani.Car.AC/
                </span>
                <span>
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Instagram: https://www.instagram.com/nooranicarac/
                </span>
              </div>
            </div>
          </div>
          <div class="print-actions">
            <button class="print-btn" onclick="window.print()">Print Bill</button>
            <button class="close-btn" onclick="window.close()">Close</button>
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

  const exportToExcel = () => {
    const displayPaidAmount = roundToTwo(paidAmount);
    const displayRemainingAmount = roundToTwo(remainingAmount);
    const displayDiscount = roundToTwo(discountAmount);
    
    const exportData = [
      {
        'Invoice #': `INV-${Date.now()}`,
        'Date': customerDetails.date,
        'Customer Name': customerDetails.name,
        'Phone': customerDetails.phone,
        'Email': customerDetails.email || 'N/A',
        'Car Number': customerDetails.carNumber,
        'Car Model': customerDetails.carModel || 'N/A',
        'Birthday': customerBirthday || 'N/A',
        'Subtotal': `Rs. ${roundToTwo(subtotal).toLocaleString()}`,
        'Discount': discountAmount > 0 ? `- Rs. ${displayDiscount.toLocaleString()}` : 'Rs. 0',
        'Total Amount': `Rs. ${roundToTwo(billTotal).toLocaleString()}`,
        'Paid Amount': `Rs. ${displayPaidAmount.toLocaleString()}`,
        'Remaining': `Rs. ${displayRemainingAmount.toLocaleString()}`,
        'Payment Method': paymentMethod.toUpperCase(),
        'Status': isFullyPaid ? 'FULLY PAID' : 'PENDING'
      },
      ...cart.map((item, idx) => ({
        'S.No': idx + 1,
        'Item': item.name,
        'Type': item.type === 'service' ? 'Service' : 'Part',
        'Quantity': item.quantity,
        'Price': `Rs. ${roundToTwo(item.price).toLocaleString()}`,
        'Total': `Rs. ${roundToTwo(item.price * item.quantity).toLocaleString()}`
      }))
    ];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bill');
    XLSX.writeFile(wb, `Bill_${customerDetails.name}_${Date.now()}.xlsx`);
    toast.success('Exported to Excel');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 10;
    
    const logoImg = logo;
    doc.addImage(logoImg, 'JPEG', 14, yPos, 25, 25);
    
    doc.setFontSize(20);
    doc.setTextColor(26, 26, 46);
    doc.text('NOORANI CAR AC & AUTOS', 45, yPos + 8);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Professional Auto Care Service', 45, yPos + 8);
    yPos += 18;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Shop # 02, Hospital, Gulshan Luxury Apartments', 14, yPos);
    yPos += 5;
    doc.text('Near Al Mustafa St, Gulshan 13-B Block 13 B', 14, yPos);
    yPos += 5;
    doc.text('Gulshan-e-Iqbal, Karachi', 14, yPos);
    yPos += 5;
    doc.text('0337 3267363', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Customer: ${customerDetails.name}`, 14, yPos);
    yPos += 7;
    doc.text(`Phone: ${customerDetails.phone}`, 14, yPos);
    yPos += 7;
    doc.text(`Email: ${customerDetails.email || 'N/A'}`, 14, yPos);
    yPos += 7;
    doc.text(`Car Number: ${customerDetails.carNumber}`, 14, yPos);
    yPos += 7;
    doc.text(`Car Model: ${customerDetails.carModel || 'N/A'}`, 14, yPos);
    yPos += 7;
    doc.text(`Date: ${customerDetails.date}`, 14, yPos);
    yPos += 7;
    doc.text(`Birthday: ${customerBirthday || 'N/A'}`, 14, yPos);
    yPos += 15;
    
    const tableBody = cart.map((item, idx) => [
      idx + 1,
      item.name,
      item.type === 'service' ? 'Service' : 'Part',
      item.quantity,
      `Rs. ${roundToTwo(item.price).toLocaleString()}`,
      `Rs. ${roundToTwo(item.price * item.quantity).toLocaleString()}`
    ]);
    
    const displayDiscount = roundToTwo(discountAmount);
    if (discountAmount > 0) {
      tableBody.push([
        '', '', '', '', 
        { content: `Discount ${discountNote ? `(${discountNote})` : ''}`, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } },
        { content: `- Rs. ${displayDiscount.toLocaleString()}`, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } }
      ]);
    }
    
    doc.autoTable({
      startY: yPos,
      head: [['#', 'Item', 'Type', 'Qty', 'Price', 'Total']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 46] }
    });
    
    const displayPaidAmount = roundToTwo(paidAmount);
    const displayRemainingAmount = roundToTwo(remainingAmount);
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: Rs. ${roundToTwo(subtotal).toLocaleString()}`, 14, finalY);
    if (discountAmount > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Discount: - Rs. ${displayDiscount.toLocaleString()} ${discountNote ? `(${discountNote})` : ''}`, 14, finalY + 7);
      doc.setTextColor(0, 0, 0);
    }
    doc.text(`Total Amount: Rs. ${roundToTwo(billTotal).toLocaleString()}`, 14, finalY + (discountAmount > 0 ? 14 : 7));
    doc.text(`Paid Amount: Rs. ${displayPaidAmount.toLocaleString()}`, 14, finalY + (discountAmount > 0 ? 21 : 14));
    doc.text(`Remaining: Rs. ${displayRemainingAmount.toLocaleString()}`, 14, finalY + (discountAmount > 0 ? 28 : 21));
    doc.text(`Status: ${isFullyPaid ? 'FULLY PAID' : 'PENDING'}`, 14, finalY + (discountAmount > 0 ? 35 : 28));
    
    doc.save(`Bill_${customerDetails.name}_${Date.now()}.pdf`);
    toast.success('Exported to PDF');
  };

  // ✅ handlePayment with fix: payment cannot exceed bill total
  const handlePayment = async () => {
    if (isProcessingRef.current || paymentExecutedRef.current) return;
    if (cart.length === 0) {
      toast.error('No items in bill');
      return;
    }
    if (!paymentAmount || paidAmount <= 0) {
      toast.error('Please enter payment amount');
      return;
    }
    
    // ✅ FIX: Payment amount cannot exceed bill total
    if (paidAmount > billTotal) {
      toast.error(`Payment amount (Rs. ${paidAmount.toLocaleString()}) cannot exceed total amount (Rs. ${billTotal.toLocaleString()})`);
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
    const exactPaidAmount = paidAmount;
    const exactRemainingAmount = billTotal - paidAmount;
    const finalStatus = exactRemainingAmount <= 0.01 ? 'Paid' : 'Partial';
    
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
      
      await api.post('/invoices', {
        invoice_no: invoiceNo,
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        customer_email: customerDetails.email,
        customer_car_number: customerDetails.carNumber,
        customer_car_model: customerDetails.carModel,
        customer_birthday: customerBirthday || null,
        subtotal: roundedSubtotal,
        discount: roundedDiscount,
        discount_note: discountNote || null,
        total_amount: roundedBillTotal,
        paid_amount: roundToTwo(exactPaidAmount),
        remaining_amount: roundToTwo(exactRemainingAmount),
        payment_method: paymentMethod,
        status: finalStatus,
        items: cartSnapshot.map(item => ({
          service_name: item.name,
          service_category: item.type === 'service' ? (item.category || 'Service') : 'Product',
          price: roundToTwo(item.price),
          quantity: item.quantity
        }))
      });
      
      const reminderAdded = await addServiceReminder(invoiceNo, cartSnapshot);
      if (reminderAdded) {
        toast.success(customerDetails.email ? 'Payment successful! 6-month reminder scheduled!' : 'Payment successful! Reminder saved');
      } else {
        toast.success('Payment successful!');
      }
      
      setCart([]);
      setPaymentAmount('');
      setDiscountValue('');
      setDiscountNote('');
      setShowDiscount(false);
      await fetchProducts();
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(`Payment failed: ${err.response?.data?.message || err.response?.data?.error || 'Unknown error'}`);
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

      {/* Customer Info */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-5 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Step 1: Customer Details
        </h3>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Enter customer information - Phone number auto-searches history
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone Number <span className="text-red-500">*</span>
              <span className="text-xs text-gray-400 block">Type to search history</span>
            </label>
            <input
              type="text"
              value={customerDetails.phone || ''}
              readOnly
              className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerDetails.name || ''}
              readOnly
              className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email Address <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <input
              type="email"
              value={customerDetails.email || ''}
              readOnly
              className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Car Number Plate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerDetails.carNumber || ''}
              readOnly
              className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Car Model <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={customerDetails.carModel || ''}
              readOnly
              className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Birthday <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={customerBirthday || ''}
                onChange={(e) => setCustomerBirthday(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                } ${customerBirthday ? 'border-green-500' : ''}`}
              />
              {customerBirthday && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✅ Auto</span>
                </div>
              )}
            </div>
            {customerBirthday && (
              <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                ✅ Auto-filled from customer records: {new Date(customerBirthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* ✅ Previous Visits - ONLY Admin */}
        {isAdmin && previousVisits.length > 0 && (
          <div className="mt-6">
            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <FiClock className="text-red-500" /> Previous Visits ({previousVisits.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Services</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {previousVisits.map((visit, index) => (
                    <tr key={index} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">{visit.date}</td>
                      <td className="px-4 py-2">{visit.services}</td>
                      <td className="px-4 py-2 text-right font-semibold">Rs. {visit.total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          {visit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing last {previousVisits.length} visits
            </p>
          </div>
        )}
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${activeTab === 'services' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <FiTool className="text-lg" /> Services
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${activeTab === 'products' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <FiPackage className="text-lg" /> Parts & Accessories
        </button>
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
                <button 
                  onClick={activeTab === 'services' ? openAddServiceModal : openAddProductModal}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center gap-1 text-white text-sm"
                >
                  <FiPlus className="text-sm" /> Add
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                  <FiGrid className="text-white" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                  <FiListIcon className="text-white" />
                </button>
              </div>
            </div>
            <div className="relative mt-3">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'services' ? 'services' : 'parts'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
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
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={(e) => { e.stopPropagation(); openEditServiceModal(service); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                      </div>
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
                      <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={(e) => { e.stopPropagation(); openEditServiceModal(service); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                      </div>
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
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); openEditProductModal(product); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                        </div>
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
                        <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); openEditProductModal(product); }} className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"><FiEdit2 size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name); }} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"><FiTrash2 size={12} /></button>
                        </div>
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
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.type === 'service' ? 'Service' : 'Part'} • Rs. {roundToTwo(item.price).toLocaleString()} each</p>
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
                      {showDiscount ? 'Hide Discount' : 'Add Discount (Premium Customer)'}
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
                          <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Note (Optional)</label>
                          <input type="text" value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} placeholder="e.g. Premium Customer Discount" className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} />
                        </div>
                        {discountAmount > 0 && (
                          <div className="mt-3 pt-3 border-t dark:border-gray-600">
                            <div className="flex justify-between items-center">
                              <span className="text-red-500 font-semibold">Discount Applied:</span>
                              <span className="text-red-500 font-bold text-lg">- Rs. {roundToTwo(discountAmount).toLocaleString()}</span>
                            </div>
                            {discountNote && <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Note: {discountNote}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t dark:border-gray-600">
                    <span className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Amount:</span>
                    <span className="text-3xl font-bold text-red-500">Rs. {roundToTwo(billTotal).toLocaleString()}</span>
                  </div>

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
                          placeholder="Enter amount" 
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} 
                          disabled={isProcessing} 
                        />
                        {/* ✅ Show bill total for reference */}
                        <p className="text-xs text-gray-400 mt-1">Bill Total: Rs. {billTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`} disabled={isProcessing}>
                          <option value="cash">Cash</option>
                          <option value="card">Credit/Debit Card</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="online">Mobile Wallet</option>
                        </select>
                      </div>
                    </div>
                    
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
                            {isFullyPaid ? 'FULLY PAID' : 'PARTIAL PAYMENT'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={handlePayment} 
                      disabled={isProcessing || paidAmount > billTotal} 
                      className={`px-4 py-3 rounded-xl font-semibold transition shadow-lg flex items-center justify-center gap-2 ${(isProcessing || paidAmount > billTotal) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'}`}
                    >
                      {isProcessing ? <FiLoader className="animate-spin" /> : <FiDollarSign />} 
                      {isProcessing ? 'PROCESSING...' : paidAmount > billTotal ? 'EXCEEDS TOTAL' : 'PAY NOW'}
                    </button>
                    <button onClick={printBill} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FiPrinter /> PRINT
                    </button>
                    <button onClick={exportToExcel} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FiFileText /> EXCEL
                    </button>
                    <button onClick={exportToPDF} className="px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2">
                      <FiDownload /> PDF
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
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Service Name *</label>
                <input type="text" value={serviceFormData.name} onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter service name" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Price * (Rs.)</label>
                <input type="number" value={serviceFormData.price} onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter price" min="0" step="0.01" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category *</label>
                <input type="text" value={serviceFormData.category} onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter category" />
              </div>
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
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Product Name *</label>
                <input type="text" value={productFormData.name} onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter product name" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Price * (Rs.)</label>
                <input type="number" value={productFormData.purchase_price} onChange={(e) => setProductFormData({ ...productFormData, purchase_price: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter purchase price" min="0" step="0.01" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Selling Price * (Rs.)</label>
                <input type="number" value={productFormData.selling_price} onChange={(e) => setProductFormData({ ...productFormData, selling_price: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter selling price" min="0" step="0.01" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Quantity *</label>
                <input type="number" value={productFormData.quantity} onChange={(e) => setProductFormData({ ...productFormData, quantity: e.target.value })} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} placeholder="Enter quantity" min="0" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Cancel</button>
                <button type="button" onClick={editingProduct ? handleUpdateProduct : handleAddProduct} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"><FiCheckCircle className="text-sm" /> {editingProduct ? 'Update Product' : 'Add Product'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingInvoice;