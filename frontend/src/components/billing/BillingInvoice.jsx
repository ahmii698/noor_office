// src/components/billing/BillingInvoice.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  FiCpu, FiHardDrive, FiMonitor
} from 'react-icons/fi';
import api from '../../services/api';

// Icon list for dropdown - USING ONLY EXISTING REACT ICONS
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
  { name: 'Music', icon: <FiMusic size={24} />, value: 'music' },
  { name: 'Film', icon: <FiFilm size={24} />, value: 'film' },
  { name: 'Book', icon: <FiBook size={24} />, value: 'book' },
  { name: 'Camera', icon: <FiCamera size={24} />, value: 'camera' },
  { name: 'Code', icon: <FiCode size={24} />, value: 'code' },
  { name: 'Database', icon: <FiDatabase size={24} />, value: 'database' },
  { name: 'Server', icon: <FiServer size={24} />, value: 'server' },
  { name: 'CPU', icon: <FiCpu size={24} />, value: 'cpu' },
  { name: 'Hard Drive', icon: <FiHardDrive size={24} />, value: 'hard-drive' },
  { name: 'Monitor', icon: <FiMonitor size={24} />, value: 'monitor' },
  { name: 'Package', icon: <FiPackage size={24} />, value: 'package' },
  { name: 'Box', icon: <FiBox size={24} />, value: 'box' },
  { name: 'Tag', icon: <FiTag size={24} />, value: 'tag' },
  { name: 'Percent', icon: <FiPercent size={24} />, value: 'percent' },
  { name: 'Clock', icon: <FiClock size={24} />, value: 'clock' },
  { name: 'Calendar', icon: <FiCalendar size={24} />, value: 'calendar' },
  { name: 'Dollar', icon: <FiDollarSign size={24} />, value: 'dollar' },
  { name: 'Credit Card', icon: <FiCreditCard size={24} />, value: 'credit-card' },
  { name: 'Shopping Cart', icon: <FiShoppingCart size={24} />, value: 'shopping-cart' },
  { name: 'User', icon: <FiUser size={24} />, value: 'user' },
  { name: 'Search', icon: <FiSearch size={24} />, value: 'search' },
  { name: 'Grid', icon: <FiGrid size={24} />, value: 'grid' },
  { name: 'List', icon: <FiListIcon size={24} />, value: 'list' },
  { name: 'Trash', icon: <FiTrash2 size={24} />, value: 'trash' },
  { name: 'Edit', icon: <FiEdit2 size={24} />, value: 'edit' },
  { name: 'Save', icon: <FiSave size={24} />, value: 'save' }
];

// Function to get icon component by value
const getIconComponent = (iconValue) => {
  const found = iconOptions.find(opt => opt.value === iconValue);
  return found ? found.icon : <FiTool size={24} />;
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
  
  // Service Management States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    price: '',
    category: '',
    icon: 'tool'
  });
  
  // CRITICAL: Prevent double execution
  const isProcessingRef = useRef(false);
  const paymentExecutedRef = useRef(false);

  // Fetch services from API
  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      if (response.data && Array.isArray(response.data)) {
        setServices(response.data);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      toast.error('Failed to load services');
    }
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Failed to load products');
    }
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchServices(),
        fetchProducts()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Service Management Functions
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

  const selectIcon = (iconValue) => {
    setServiceFormData({ ...serviceFormData, icon: iconValue });
    setShowIconDropdown(false);
  };

  const filteredServices = searchTerm ? 
    services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())) :
    services;

  const filteredProducts = searchTerm ? 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) :
    products;

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

  const billTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const paidAmount = parseFloat(paymentAmount) || 0;
  const remainingAmount = billTotal - paidAmount;
  const isFullyPaid = remainingAmount <= 0;

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
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${item.price.toLocaleString()}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Noorani Car AC - Invoice</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #eef2f5; }
            .invoice-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #111827 0%, #1f2937 100%); color: white; padding: 25px; text-align: center; }
            .logo-img { width: 70px; height: 70px; border-radius: 50%; margin-bottom: 12px; border: 3px solid #ef4444; object-fit: cover; }
            .shop-name { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
            .subtitle { opacity: 0.8; margin-top: 5px; font-size: 12px; }
            .contact-info { font-size: 11px; margin-top: 8px; opacity: 0.7; }
            .customer-info { margin: 20px; padding: 18px; background: #fff5f5; border-radius: 12px; border-left: 4px solid #ef4444; }
            .customer-info h4 { margin-bottom: 12px; color: #991b1b; font-size: 14px; }
            .customer-info p { margin: 6px 0; font-size: 13px; color: #333; }
            .invoice-details { display: flex; justify-content: space-between; margin: 20px; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; }
            table { width: calc(100% - 40px); margin: 20px; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
            th { background: #111827; color: white; font-weight: 600; }
            .payment-details { margin: 20px; padding: 18px; background: #f0fdf4; border-radius: 12px; border-left: 4px solid #22c55e; }
            .payment-details h4 { margin-bottom: 12px; color: #166534; font-size: 14px; }
            .payment-details p { margin: 6px 0; font-size: 13px; }
            .total-row { font-size: 20px; font-weight: bold; text-align: right; margin: 20px; padding-top: 12px; border-top: 2px solid #e5e7eb; color: #dc2626; }
            .footer { text-align: center; padding: 18px; background: #111827; color: white; font-size: 12px; }
            .signature { margin: 20px; display: flex; justify-content: space-between; padding-top: 30px; font-size: 12px; }
            .print-actions { text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 12px; max-width: 800px; margin-left: auto; margin-right: auto; }
            .print-btn, .close-btn { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; margin: 0 8px; }
            .print-btn { background: #ef4444; color: white; }
            .close-btn { background: #6b7280; color: white; }
            @media print { body { background: white; padding: 0; } .print-actions { display: none; } .invoice-container { box-shadow: none; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="/logo.jpg" alt="Noorani Logo" class="logo-img" onerror="this.style.display='none'" />
              <div class="shop-name">❄️ NOORANI CAR A/C & AUTOS</div>
              <p class="subtitle">Professional Auto Care Service</p>
              <p class="contact-info">123 Main Street, City | Phone: +92 300 1234567</p>
            </div>
            <div class="customer-info">
              <h4>📋 CUSTOMER INFORMATION</h4>
              <p><strong>Name:</strong> ${customerDetails.name}</p>
              <p><strong>Phone:</strong> ${customerDetails.phone}</p>
              <p><strong>Car Number:</strong> ${customerDetails.carNumber}</p>
              <p><strong>Car Model:</strong> ${customerDetails.carModel || 'N/A'}</p>
            </div>
            <div class="invoice-details">
              <p><strong>Invoice #:</strong> INV-${Date.now()}</p>
              <p><strong>Date:</strong> ${customerDetails.date}</p>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Item</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>${cartItemsHtml}</tbody>
            </table>
            <div class="payment-details">
              <h4>💰 PAYMENT DETAILS</h4>
              <p><strong>Subtotal:</strong> Rs. ${billTotal.toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${paidAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${remainingAmount.toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${isFullyPaid ? '✅ FULLY PAID' : '⚠️ PENDING'}</p>
            </div>
            <div class="total-row">Total: Rs. ${billTotal.toLocaleString()}</div>
            <div class="signature">
              <p>Customer Signature: _________________</p>
              <p>Authorized Signature: _________________</p>
            </div>
            <div class="footer">Thank you for choosing Noorani Car AC & Autos! Drive Safe 🚗</div>
          </div>
          <div class="print-actions">
            <button class="print-btn" onclick="window.print()">🖨️ Print Bill</button>
            <button class="close-btn" onclick="window.close()">❌ Close</button>
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
    const exportData = [
      {
        'Invoice #': `INV-${Date.now()}`,
        'Date': customerDetails.date,
        'Customer Name': customerDetails.name,
        'Phone': customerDetails.phone,
        'Car Number': customerDetails.carNumber,
        'Car Model': customerDetails.carModel || 'N/A',
        'Total Amount': `Rs. ${billTotal.toLocaleString()}`,
        'Paid Amount': `Rs. ${paidAmount.toLocaleString()}`,
        'Remaining': `Rs. ${remainingAmount.toLocaleString()}`,
        'Payment Method': paymentMethod.toUpperCase(),
        'Status': isFullyPaid ? 'FULLY PAID' : 'PENDING'
      },
      ...cart.map((item, idx) => ({
        'S.No': idx + 1,
        'Item': item.name,
        'Type': item.type === 'service' ? 'Service' : 'Part',
        'Quantity': item.quantity,
        'Price': `Rs. ${item.price.toLocaleString()}`,
        'Total': `Rs. ${(item.price * item.quantity).toLocaleString()}`
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
    
    doc.setFontSize(20);
    doc.setTextColor(26, 26, 46);
    doc.text('NOORANI CAR AC & AUTOS', 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Professional Auto Care Service', 14, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Customer: ${customerDetails.name}`, 14, yPos);
    yPos += 7;
    doc.text(`Phone: ${customerDetails.phone}`, 14, yPos);
    yPos += 7;
    doc.text(`Car Number: ${customerDetails.carNumber}`, 14, yPos);
    yPos += 7;
    doc.text(`Date: ${customerDetails.date}`, 14, yPos);
    yPos += 15;
    
    doc.autoTable({
      startY: yPos,
      head: [['#', 'Item', 'Type', 'Qty', 'Price', 'Total']],
      body: cart.map((item, idx) => [
        idx + 1,
        item.name,
        item.type === 'service' ? 'Service' : 'Part',
        item.quantity,
        `Rs. ${item.price.toLocaleString()}`,
        `Rs. ${(item.price * item.quantity).toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 46] }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total Amount: Rs. ${billTotal.toLocaleString()}`, 14, finalY);
    doc.text(`Paid Amount: Rs. ${paidAmount.toLocaleString()}`, 14, finalY + 7);
    doc.text(`Remaining: Rs. ${remainingAmount.toLocaleString()}`, 14, finalY + 14);
    doc.text(`Status: ${isFullyPaid ? 'FULLY PAID' : 'PENDING'}`, 14, finalY + 21);
    
    doc.save(`Bill_${customerDetails.name}_${Date.now()}.pdf`);
    toast.success('Exported to PDF');
  };

  const handlePayment = async () => {
    if (isProcessingRef.current || paymentExecutedRef.current) {
      console.log('Payment already processing or executed');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('No items in bill');
      return;
    }
    
    if (!paymentAmount || paidAmount <= 0) {
      toast.error('Please enter payment amount');
      return;
    }
    
    if (paidAmount > billTotal) {
      toast.error('Payment amount cannot exceed total amount');
      return;
    }
    
    isProcessingRef.current = true;
    paymentExecutedRef.current = true;
    setIsProcessing(true);
    
    const cartSnapshot = [...cart];
    
    console.log('Processing payment for:', cartSnapshot.map(i => `${i.name} x${i.quantity}`));
    
    try {
      for (const item of cartSnapshot) {
        if (item.type === 'product') {
          const currentProduct = products.find(p => p.id === item.id);
          
          if (currentProduct) {
            const newQuantity = currentProduct.quantity - item.quantity;
            const finalQuantity = Math.max(0, newQuantity);
            
            console.log(`Updating ${item.name}: ${currentProduct.quantity} -> ${finalQuantity} (${item.quantity} sold)`);
            
            await api.put(`/products/${item.id}`, {
              quantity: finalQuantity
            });
          }
        }
      }
      
      await api.post('/invoices', {
        customer: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          carNumber: customerDetails.carNumber,
          carModel: customerDetails.carModel,
          date: customerDetails.date
        },
        items: cartSnapshot.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          type: item.type
        })),
        total: billTotal,
        paidAmount: paidAmount,
        paymentMethod: paymentMethod
      });
      
      toast.success('Payment successful!');
      setCart([]);
      setPaymentAmount('');
      await fetchProducts();
      
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Payment failed: ' + (err.response?.data?.message || 'Unknown error'));
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
      {/* Customer Summary Card */}
      <div className={`${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-white to-gray-50'} rounded-2xl shadow-xl p-5 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <FiUser className="text-white text-2xl" />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Billing For</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{customerDetails.name}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customerDetails.carNumber} • {customerDetails.carModel || 'No Model'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Invoice Date</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{customerDetails.date}</p>
            </div>
            <div className="w-px h-10 bg-gray-300 dark:bg-gray-700"></div>
            <div className="text-right">
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{customerDetails.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${
            activeTab === 'services'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FiTool className="text-lg" /> Services
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold transition flex items-center gap-2 ${
            activeTab === 'products'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FiPackage className="text-lg" /> Parts & Accessories
        </button>
      </div>

      {/* Services and Bill Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items Section */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {activeTab === 'services' ? <FiTool className="text-white text-xl" /> : <FiPackage className="text-white text-xl" />}
                <h3 className="text-lg font-semibold text-white">
                  {activeTab === 'services' ? 'Available Services' : 'Parts & Accessories'}
                </h3>
              </div>
              <div className="flex gap-2">
                {activeTab === 'services' && (
                  <button 
                    onClick={openAddServiceModal}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center gap-1 text-white text-sm"
                    title="Add New Service"
                  >
                    <FiPlus className="text-sm" /> Add
                  </button>
                )}
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
          
          <div className={`p-4 max-h-[500px] overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {activeTab === 'services' ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredServices.map(service => (
                    <div
                      key={service.id}
                      className={`relative group p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-500' 
                          : 'bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <div onClick={() => addToBill(service, 'service')}>
                        <div className="text-red-500 mb-2">
                          {getIconComponent(service.icon || 'tool')}
                        </div>
                        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{service.category}</p>
                        <p className="text-red-500 font-bold text-lg mt-2">Rs. {service.price.toLocaleString()}</p>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditServiceModal(service); }}
                          className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"
                          title="Edit Service"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }}
                          className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"
                          title="Delete Service"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map(service => (
                    <div
                      key={service.id}
                      className={`relative group flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-gray-700' 
                          : 'bg-gray-50 hover:bg-red-50'
                      }`}
                    >
                      <div onClick={() => addToBill(service, 'service')} className="flex-1 flex items-center gap-3">
                        <div className="text-red-500">
                          {getIconComponent(service.icon || 'tool')}
                        </div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{service.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">Rs. {service.price.toLocaleString()}</p>
                      </div>
                      <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditServiceModal(service); }}
                          className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }}
                          className="p-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map(product => {
                    const stock = product.quantity;
                    const isOutOfStock = stock <= 0;
                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOutOfStock && addToBill(product, 'product')}
                        className={`p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                          isOutOfStock 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                            : darkMode 
                              ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-500' 
                              : 'bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <FiPackage className="text-3xl mb-2 text-gray-500" />
                        <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Stock: {stock} units</p>
                        <p className="text-red-500 font-bold text-lg mt-2">Rs. {product.selling_price.toLocaleString()}</p>
                        {stock < 5 && stock > 0 && (
                          <p className="text-xs text-yellow-500 mt-1">⚠️ Only {stock} left!</p>
                        )}
                        {isOutOfStock && (
                          <p className="text-xs text-red-500 mt-1">❌ Out of stock!</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => {
                    const stock = product.quantity;
                    const isOutOfStock = stock <= 0;
                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOutOfStock && addToBill(product, 'product')}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                          isOutOfStock 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                            : darkMode 
                              ? 'bg-gray-800 hover:bg-gray-700' 
                              : 'bg-gray-50 hover:bg-red-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FiPackage className="text-xl text-gray-500" />
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stock: {stock} units</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-red-500 font-bold">Rs. {product.selling_price.toLocaleString()}</p>
                          {stock < 5 && stock > 0 && (
                            <p className="text-xs text-yellow-500">⚠️ Only {stock} left!</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bill Section - Same as before - keeping it short */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Bill content remains same as your existing code */}
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
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center mb-4">
                  <FiShoppingCart className="text-4xl text-red-500" />
                </div>
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cart is empty</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Click on services or parts to add</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[350px] overflow-y-auto mb-4 pr-2">
                  {cart.map((item, idx) => (
                    <div key={`${item.id}-${item.type}`} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-500 font-bold text-sm">{idx + 1}</span>
                        </div>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.type === 'service' ? 'Service' : 'Part'} • Rs. {item.price.toLocaleString()} each
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-lg px-2 py-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.type)}
                            className="w-6 h-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                            disabled={isProcessing}
                          >
                            -
                          </button>
                          <span className={`w-8 text-center font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.type)}
                            className="w-6 h-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                            disabled={isProcessing}
                          >
                            +
                          </button>
                        </div>
                        <p className={`font-bold text-red-500 min-w-[80px] text-right`}>
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => removeFromBill(item.id, item.type)} 
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition flex items-center justify-center"
                          disabled={isProcessing}
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t-2 dark:border-gray-700 space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Items:</span>
                    <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t dark:border-gray-700">
                    <span className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Amount:</span>
                    <span className="text-3xl font-bold text-red-500">Rs. {billTotal.toLocaleString()}</span>
                  </div>

                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} mt-4`}>
                    <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FiCreditCard className="text-red-500" /> Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount (Rs.)</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                          disabled={isProcessing}
                        >
                          <option value="cash">💵 Cash</option>
                          <option value="card">💳 Credit/Debit Card</option>
                          <option value="bank">🏦 Bank Transfer</option>
                          <option value="online">📱 Mobile Wallet</option>
                        </select>
                      </div>
                    </div>
                    
                    {paidAmount > 0 && (
                      <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        <div className="flex justify-between py-2">
                          <span>Paid Amount:</span>
                          <span className="text-green-600 font-semibold text-lg">Rs. {paidAmount.toLocaleString()}</span>
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
                      disabled={isProcessing}
                      className={`px-4 py-3 rounded-xl font-semibold transition shadow-lg flex items-center justify-center gap-2 ${
                        isProcessing 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                      }`}
                    >
                      {isProcessing ? <FiLoader className="animate-spin" /> : <FiDollarSign />} 
                      {isProcessing ? 'PROCESSING...' : 'PAY NOW'}
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

      {/* Service Add/Edit Modal with React Icons Dropdown */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Service Name *</label>
                <input
                  type="text"
                  value={serviceFormData.name}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="Enter service name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Price * (Rs.)</label>
                <input
                  type="number"
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category *</label>
                <input
                  type="text"
                  value={serviceFormData.category}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="Enter category"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Icon</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconDropdown(!showIconDropdown)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2">
                      {getIconComponent(serviceFormData.icon)}
                      <span className="text-sm">Select Icon</span>
                    </div>
                    <FiChevronDown className={`transition-transform ${showIconDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showIconDropdown && (
                    <div className={`absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {iconOptions.map((icon, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectIcon(icon.value)}
                            className={`p-2 rounded-lg text-center transition-colors flex items-center justify-center ${serviceFormData.icon === icon.value ? 'bg-red-500 text-white' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            title={icon.name}
                          >
                            {icon.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingService ? handleUpdateService : handleAddService}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiCheckCircle className="text-sm" /> {editingService ? 'Update Service' : 'Add Service'}
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