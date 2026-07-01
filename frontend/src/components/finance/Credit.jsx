// src/components/finance/Credit.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiPlus, FiSearch, FiEye, FiEdit, FiX, 
  FiPackage, FiFileText, FiDollarSign, FiClock,
  FiChevronLeft, FiChevronRight, FiInbox,
  FiList, FiCalendar, FiCheckCircle, FiAlertCircle,
  FiTrash2, FiLoader, FiShoppingCart, FiBox, FiUser,
  FiPlusCircle, FiCreditCard
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './Credit.css';

// ✅ Helper function to format date in Pakistan Time (UTC+5)
const formatPakistanTime = (dateString) => {
  if (!dateString) return { date: 'N/A', time: '' };
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: '' };
    
    const pakistanTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
    
    const formattedDate = pakistanTime.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
    
    const formattedTime = pakistanTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
    
    return { date: formattedDate, time: formattedTime };
  } catch (e) {
    console.error('Date parse error:', e);
    return { date: 'N/A', time: '' };
  }
};

// ✅ Memoized Stats Card Component
const StatsCard = React.memo(({ title, value, subtitle, icon: Icon, color, darkMode }) => (
  <div className={`bg-gradient-to-r ${color} rounded-2xl p-6 text-white shadow-lg`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
      </div>
      <Icon className="text-3xl opacity-50" />
    </div>
  </div>
));

const Credit = ({ darkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalVendors: 0,
    totalBalance: 0,
    totalAmount: 0,
    totalPaid: 0,
    pending: 0,
    partial: 0,
    fullyPaid: 0
  });

  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    purchase_price: '',
    selling_price: '',
    quantity: ''
  });

  const [editPayAmount, setEditPayAmount] = useState('');

  // ✅ Loading states for buttons to prevent double clicks
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  // ✅ Refs for button disable
  const editSubmitRef = useRef(null);
  const paySubmitRef = useRef(null);

  // ✅ FIXED: Group vendors by name with proper payments merging & SORTING (NEWEST FIRST)
  const groupVendorsByName = (vendorsList) => {
    const grouped = {};
    
    vendorsList.forEach(vendor => {
      const key = vendor.vendor_name?.toLowerCase() || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          id: vendor.id,
          name: vendor.vendor_name,
          products: vendor.products,
          invoiceNumber: vendor.invoice_number,
          totalAmount: 0,
          paidAmount: 0,
          balanceAmount: 0,
          stockQuantity: 0,
          createdBy: vendor.created_by,
          createdAt: vendor.created_at,
          records: [],
          payments: [],
          productsList: []
        };
      }
      
      grouped[key].totalAmount += parseFloat(vendor.total_amount) || 0;
      grouped[key].paidAmount += parseFloat(vendor.paid_amount) || 0;
      grouped[key].balanceAmount += parseFloat(vendor.balance_amount) || 0;
      grouped[key].stockQuantity += parseInt(vendor.stock_quantity) || 0;
      
      grouped[key].records.push({
        id: vendor.id,
        invoiceNumber: vendor.invoice_number,
        totalAmount: parseFloat(vendor.total_amount) || 0,
        paidAmount: parseFloat(vendor.paid_amount) || 0,
        balanceAmount: parseFloat(vendor.balance_amount) || 0,
        createdAt: vendor.created_at,
        products: vendor.products
      });
      
      if (vendor.payments && Array.isArray(vendor.payments)) {
        vendor.payments.forEach(payment => {
          const exists = grouped[key].payments.some(p => p.id === payment.id);
          if (!exists) {
            grouped[key].payments.push({
              id: payment.id,
              amount: parseFloat(payment.amount) || 0,
              date: payment.date || payment.payment_date || payment.created_at,
              note: payment.note || '',
              createdBy: payment.created_by || payment.createdBy || 'System'
            });
          }
        });
      }
      
      if (vendor.productsList) {
        grouped[key].productsList = [...grouped[key].productsList, ...vendor.productsList];
      }
    });
    
    // ✅ CRITICAL FIX: Sort vendors by their latest record date (NEWEST FIRST)
    return Object.values(grouped).sort((a, b) => {
      // Get the latest record date from each vendor
      const getLatestDate = (vendor) => {
        if (!vendor.records || vendor.records.length === 0) return new Date(0);
        const latest = vendor.records.reduce((latest, r) => 
          new Date(r.createdAt) > new Date(latest.createdAt) ? r : latest
        );
        return new Date(latest.createdAt);
      };
      
      const dateA = getLatestDate(a);
      const dateB = getLatestDate(b);
      
      // Sort newest first (descending)
      return dateB - dateA;
    });
  };

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/credit/vendors');
      console.log('📦 API Response:', response.data);
      
      if (response.data.success) {
        const rawData = Array.isArray(response.data.data) ? response.data.data : [];
        const groupedVendors = groupVendorsByName(rawData);
        
        const mappedVendors = groupedVendors.map(vendor => ({
          id: vendor.id,
          name: vendor.name,
          products: vendor.products,
          invoiceNumber: vendor.invoiceNumber,
          totalAmount: vendor.totalAmount,
          paidAmount: vendor.paidAmount,
          balanceAmount: vendor.balanceAmount,
          stockQuantity: vendor.stockQuantity,
          createdBy: vendor.createdBy,
          createdAt: vendor.createdAt,
          payments: vendor.payments || [],
          productsList: vendor.productsList || [],
          records: vendor.records || [],
        }));
        
        setVendors(mappedVendors);
        
        const totalBalance = mappedVendors.reduce((sum, v) => sum + v.balanceAmount, 0);
        const totalAmount = mappedVendors.reduce((sum, v) => sum + v.totalAmount, 0);
        const totalPaid = mappedVendors.reduce((sum, v) => sum + v.paidAmount, 0);
        
        setStatistics({
          totalVendors: mappedVendors.length,
          totalBalance: totalBalance,
          totalAmount: totalAmount,
          totalPaid: totalPaid,
          pending: mappedVendors.filter(v => v.balanceAmount > 0 && v.paidAmount === 0).length,
          partial: mappedVendors.filter(v => v.balanceAmount > 0 && v.paidAmount > 0).length,
          fullyPaid: mappedVendors.filter(v => v.balanceAmount === 0).length,
        });
      } else {
        toast.error(response.data.message || 'Failed to load vendors');
      }
    } catch (error) {
      console.error('❌ Error fetching vendors:', error);
      toast.error(error.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await api.get('/products');
      let productsData = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      }
      setAllProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchAllProducts();
  }, [fetchVendors, fetchAllProducts]);

  const filteredVendors = vendors.filter(vendor =>
    vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor?.products?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVendors = filteredVendors.slice(indexOfFirstItem, indexOfLastItem);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddVendor = () => {
    setSelectedProducts([]);
    setProductSearch('');
    setIsAddModalOpen(true);
  };

  const handleViewDetails = (vendor) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
  };

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setEditPayAmount('');
    setIsModalOpen(true);
  };

  const handlePayNow = (vendor) => {
    setSelectedVendor(vendor);
    setIsPayModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setIsAddModalOpen(false);
    setIsPayModalOpen(false);
    setIsNewProductModalOpen(false);
    setSelectedVendor(null);
    setSelectedProducts([]);
    setProductSearch('');
    setNewProductData({ name: '', purchase_price: '', selling_price: '', quantity: '' });
    setEditPayAmount('');
    setIsSubmitting(false);
    setIsPaying(false);
  };

  // ✅ Add product to selection with DUPLICATE CHECK
  const handleAddProductToSelection = (product) => {
    // Check if product already exists in selected list (by id)
    const existingById = selectedProducts.find(p => p.product_id === product.id);
    if (existingById) {
      toast.error('Product already added to this vendor!');
      return;
    }
    
    // Check if product with SAME NAME already exists (case-insensitive)
    const existingByName = selectedProducts.find(p => 
      p.product_name?.toLowerCase().trim() === product.name?.toLowerCase().trim()
    );
    if (existingByName) {
      toast.error(`"${product.name}" is already added to this vendor!`);
      return;
    }
    
    // If no duplicate, add the product
    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        purchase_price: product.purchase_price || 0
      }
    ]);
    setShowProductDropdown(false);
    setProductSearch('');
    toast.success(`${product.name} added`);
  };

  const handleRemoveSelectedProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateSelectedProductQty = (index, quantity) => {
    if (quantity < 1) {
      handleRemoveSelectedProduct(index);
      return;
    }
    const updated = [...selectedProducts];
    updated[index].quantity = quantity;
    setSelectedProducts(updated);
  };

  const updateSelectedProductPrice = (index, price) => {
    const updated = [...selectedProducts];
    updated[index].purchase_price = parseFloat(price) || 0;
    setSelectedProducts(updated);
  };

  const filteredProducts = allProducts.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) &&
    !selectedProducts.find(sp => sp.product_id === p.id)
  );

  // ✅ Add new product with DUPLICATE CHECK
  const handleAddNewProduct = async () => {
    if (!newProductData.name || !newProductData.purchase_price || !newProductData.selling_price || !newProductData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const purchasePrice = parseFloat(newProductData.purchase_price);
    const sellingPrice = parseFloat(newProductData.selling_price);
    const quantity = parseInt(newProductData.quantity);

    if (isNaN(purchasePrice) || isNaN(sellingPrice) || isNaN(quantity)) {
      toast.error('Please enter valid numbers');
      return;
    }

    // CRITICAL: Check if product with same name already exists in system
    const productNameTrimmed = newProductData.name.trim();
    const existingProduct = allProducts.find(p => 
      p.name?.toLowerCase().trim() === productNameTrimmed.toLowerCase()
    );
    
    if (existingProduct) {
      toast.error(`"${productNameTrimmed}" already exists in system! Please select it from the list.`);
      return;
    }

    try {
      const response = await api.post('/products', {
        name: productNameTrimmed,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        quantity: quantity
      });

      if (response.data) {
        toast.success('New product added successfully!');
        await fetchAllProducts();
        setIsNewProductModalOpen(false);
        setNewProductData({ name: '', purchase_price: '', selling_price: '', quantity: '' });
        
        const newProduct = response.data.data || response.data;
        if (newProduct && newProduct.id) {
          handleAddProductToSelection({
            id: newProduct.id,
            name: newProduct.name,
            purchase_price: newProduct.purchase_price || purchasePrice
          });
        }
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.message || 'Failed to add product');
    }
  };

  const handleSubmitVendor = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0);
    const paidAmount = parseFloat(formData.get('paidAmount')) || 0;
    
    const vendorData = {
      vendor_name: formData.get('name'),
      products: selectedProducts.map(p => p.product_name).join(', '),
      invoice_number: formData.get('invoiceNumber'),
      total_amount: totalAmount,
      paid_amount: paidAmount,
      stock_quantity: selectedProducts.reduce((sum, p) => sum + p.quantity, 0),
      product_ids: selectedProducts.map(p => ({
        product_id: p.product_id,
        quantity: p.quantity,
        purchase_price: p.purchase_price
      }))
    };

    try {
      const response = await api.post('/credit/vendors', vendorData);
      if (response.data.success) {
        toast.success('Vendor added successfully! Products stock updated!');
        fetchVendors();
        fetchAllProducts();
        setIsAddModalOpen(false);
        setSelectedProducts([]);
      }
    } catch (error) {
      console.error('Error adding vendor:', error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.values(errors).forEach(err => toast.error(err[0]));
      } else {
        toast.error(error.response?.data?.message || 'Failed to add vendor');
      }
    }
  };

  // ✅ Edit submit with DOUBLE CLICK PROTECTION
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      toast.warning('Please wait, payment is being processed...');
      return;
    }
    
    const formData = new FormData(e.target);
    const newPaymentAmount = parseFloat(formData.get('newPayment')) || 0;
    const currentPaidAmount = selectedVendor?.paidAmount || 0;
    const updatedPaidAmount = currentPaidAmount + newPaymentAmount;
    
    if (newPaymentAmount > selectedVendor?.balanceAmount) {
      toast.error('Payment amount cannot exceed balance amount!');
      return;
    }
    
    const vendorData = {
      vendor_name: formData.get('name'),
      products: formData.get('products'),
      invoice_number: formData.get('invoiceNumber'),
      total_amount: parseFloat(formData.get('totalAmount')),
      paid_amount: updatedPaidAmount,
      stock_quantity: parseInt(formData.get('stockQuantity')) || 0,
      new_payment: newPaymentAmount,
      payment_note: formData.get('paymentNote') || 'Payment via edit'
    };

    setIsSubmitting(true);
    if (editSubmitRef.current) {
      editSubmitRef.current.disabled = true;
    }

    try {
      const response = await api.put(`/credit/vendors/${selectedVendor.id}`, vendorData);
      if (response.data.success) {
        if (newPaymentAmount > 0) {
          toast.success(`✅ Payment of Rs. ${newPaymentAmount} recorded successfully!`);
        } else {
          toast.success('✅ Vendor updated successfully!');
        }
        await fetchVendors();
        setIsModalOpen(false);
        setEditPayAmount('');
      }
    } catch (error) {
      console.error('❌ Error updating vendor:', error);
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    } finally {
      setIsSubmitting(false);
      if (editSubmitRef.current) {
        editSubmitRef.current.disabled = false;
      }
    }
  };

  // ✅ Payment submit with DOUBLE CLICK PROTECTION
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (isPaying) {
      toast.warning('Please wait, payment is being processed...');
      return;
    }
    
    const formData = new FormData(e.target);
    const paymentAmount = parseFloat(formData.get('paymentAmount'));
    const paymentNote = formData.get('paymentNote') || 'Payment made';
    
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (paymentAmount > selectedVendor.balanceAmount) {
      toast.error(`Payment amount cannot exceed balance amount: Rs. ${selectedVendor.balanceAmount}`);
      return;
    }
    
    const paymentData = {
      vendor_id: selectedVendor.id,
      amount: paymentAmount,
      note: paymentNote
    };

    setIsPaying(true);
    if (paySubmitRef.current) {
      paySubmitRef.current.disabled = true;
    }

    try {
      const response = await api.post('/credit/payments', paymentData);
      if (response.data.success) {
        toast.success(`Payment of Rs. ${paymentAmount} recorded successfully!`);
        await fetchVendors();
        setIsPayModalOpen(false);
      } else {
        toast.error(response.data.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsPaying(false);
      if (paySubmitRef.current) {
        paySubmitRef.current.disabled = false;
      }
    }
  };

  const handleDeleteVendor = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor record? This will revert stock and delete all payment history.')) {
      try {
        const response = await api.delete(`/credit/vendors/${id}`);
        if (response.data.success) {
          toast.success('Vendor deleted successfully!');
          fetchVendors();
        }
      } catch (error) {
        console.error('Error deleting vendor:', error);
        toast.error(error.response?.data?.message || 'Failed to delete vendor');
      }
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading vendors...</p>
        </div>
      </div>
    );
  }

  // ✅ Calculate totals for stats cards
  const totalAmount = vendors.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
  const totalPaid = vendors.reduce((sum, v) => sum + (v.paidAmount || 0), 0);
  const totalBalance = vendors.reduce((sum, v) => sum + (v.balanceAmount || 0), 0);

  return (
    <>
      <div className={`credit-container ${darkMode ? 'dark' : ''}`}>
        <div className={`credit-card ${darkMode ? 'dark' : ''}`}>
          {/* Header */}
          <div className="credit-header">
            <div className="credit-header-left">
              <FiList className="credit-header-icon" />
              <div>
                <h3 className="credit-header-title">Credit Management</h3>
                <p className="credit-header-subtitle">
                  Total Vendors: {statistics.totalVendors || vendors.length} | 
                  Total Balance: Rs. {(statistics.totalBalance || vendors.reduce((sum, v) => sum + (v?.balanceAmount || 0), 0)).toLocaleString()}
                  {statistics.pending > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500/30 text-white rounded-full text-xs">
                      {statistics.pending} Pending
                    </span>
                  )}
                  {statistics.partial > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/30 text-white rounded-full text-xs">
                      {statistics.partial} Partial
                    </span>
                  )}
                  {statistics.fullyPaid > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-green-500/30 text-white rounded-full text-xs">
                      {statistics.fullyPaid} Paid
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={handleAddVendor} className="credit-btn-add">
              <FiPlus className="credit-btn-icon" /> Add Vendor
            </button>
          </div>

          {/* ✅ 3 STATS CARDS - Total Amount, Total Paid, Total Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-90">Total Amount</p>
                  <p className="text-2xl font-bold mt-1">Rs. {totalAmount.toLocaleString()}</p>
                  <p className="text-xs opacity-75 mt-1">Total vendor liability</p>
                </div>
                <FiDollarSign className="text-3xl opacity-50" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-90">Total Paid</p>
                  <p className="text-2xl font-bold mt-1">Rs. {totalPaid.toLocaleString()}</p>
                  <p className="text-xs opacity-75 mt-1">Total amount paid</p>
                </div>
                <FiCheckCircle className="text-3xl opacity-50" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm opacity-90">Total Balance</p>
                  <p className="text-2xl font-bold mt-1">Rs. {totalBalance.toLocaleString()}</p>
                  <p className="text-xs opacity-75 mt-1">Remaining balance</p>
                </div>
                <FiCreditCard className="text-3xl opacity-50" />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="credit-search-wrapper">
            <div className="credit-search-container">
              <FiSearch className={`credit-search-icon ${darkMode ? 'dark' : ''}`} />
              <input
                type="text"
                placeholder="Search by Vendor Name, Product or Invoice #..."
                value={searchTerm}
                onChange={handleSearch}
                className={`credit-search-input ${darkMode ? 'dark' : ''}`}
              />
            </div>
          </div>

          {/* Table */}
          <div className="credit-table-wrapper">
            <table className="credit-table">
              <thead className={darkMode ? 'dark' : ''}>
                <tr>
                  <th>Vendor Name</th>
                  <th>Products</th>
                  <th>Total Orders</th>
                  <th>Total Amount</th>
                  <th>Total Paid</th>
                  <th>Total Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentVendors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="credit-empty">
                      <FiInbox className="credit-empty-icon" />
                      <p>No vendors found</p>
                      <p className="credit-empty-sub">Click "Add Vendor" to create your first credit record</p>
                    </td>
                  </tr>
                ) : (
                  currentVendors.map(vendor => {
                    const totalOrders = vendor.records?.length || 0;
                    return (
                      <tr key={vendor?.id || Math.random()} className={darkMode ? 'dark' : ''}>
                        <td className="credit-vendor-name">
                          <div className="flex items-center gap-2">
                            <FiUser className="text-red-500" />
                            {vendor?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="credit-cell-truncate">{vendor?.products || 'N/A'}</td>
                        <td className="text-center">{totalOrders}</td>
                        <td className="credit-amount-total">Rs.{(vendor?.totalAmount || 0).toLocaleString()}</td>
                        <td className="credit-amount-paid">Rs.{(vendor?.paidAmount || 0).toLocaleString()}</td>
                        <td>
                          <span className={`credit-balance ${(vendor?.balanceAmount || 0) > 0 ? 'due' : 'paid'}`}>
                            Rs.{(vendor?.balanceAmount || 0).toLocaleString()}
                            {(vendor?.balanceAmount || 0) > 0 && (
                              <span className="credit-badge-due">Due</span>
                            )}
                            {(vendor?.balanceAmount || 0) === 0 && totalOrders > 0 && (
                              <span className="credit-badge-paid">Paid</span>
                            )}
                          </span>
                        </td>
                        <td>
                          <div className="credit-actions">
                            <button onClick={() => handleViewDetails(vendor)} className="credit-btn-view" title="View History">
                              <FiEye />
                            </button>
                            <button onClick={() => handleEditVendor(vendor)} className="credit-btn-edit" title="Edit">
                              <FiEdit />
                            </button>
                            <button onClick={() => handleDeleteVendor(vendor?.id)} className="credit-btn-delete" title="Delete">
                              <FiTrash2 />
                            </button>
                            {(vendor?.balanceAmount || 0) > 0 && (
                              <button onClick={() => handlePayNow(vendor)} className="credit-btn-pay">
                                Pay Now
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="credit-pagination">
            <div className="credit-pagination-info">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredVendors.length)} of {filteredVendors.length} entries
            </div>
            <div className="credit-pagination-buttons">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="credit-pagination-btn">
                <FiChevronLeft />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                  if (i === 5) return <span key="dots1" className="credit-pagination-dots">...</span>;
                  if (i === 6) return <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="credit-pagination-btn">{totalPages}</button>;
                } else if (currentPage >= totalPages - 3) {
                  if (i === 0) return <button key={1} onClick={() => handlePageChange(1)} className="credit-pagination-btn">1</button>;
                  if (i === 1) return <span key="dots1" className="credit-pagination-dots">...</span>;
                  pageNum = totalPages - 5 + i;
                } else {
                  if (i === 0) return <button key={1} onClick={() => handlePageChange(1)} className="credit-pagination-btn">1</button>;
                  if (i === 1) return <span key="dots1" className="credit-pagination-dots">...</span>;
                  if (i === 5) return <span key="dots2" className="credit-pagination-dots">...</span>;
                  if (i === 6) return <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="credit-pagination-btn">{totalPages}</button>;
                  pageNum = currentPage - 1 + (i - 2);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`credit-pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="credit-pagination-btn">
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View History Modal - ✅ FIXED: Records sorted NEWEST FIRST */}
      {isViewModalOpen && selectedVendor && (
        <div className="credit-modal-overlay">
          <div className={`credit-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`credit-modal-header ${darkMode ? 'dark' : ''}`}>
              <div>
                <h2 className="credit-modal-title">
                  <FiEye className="credit-modal-title-icon" /> Vendor History
                </h2>
                <p className="credit-modal-subtitle">{selectedVendor?.name || 'Vendor'}</p>
              </div>
              <button onClick={handleCloseModal} className="credit-modal-close">
                <FiX />
              </button>
            </div>
            <div className="credit-modal-body">
              {/* Vendor Summary */}
              <div className="credit-summary">
                <div className="credit-summary-item">
                  <p className="credit-summary-label">Total Orders</p>
                  <p className="credit-summary-value total">{selectedVendor?.records?.length || 0}</p>
                </div>
                <div className="credit-summary-item">
                  <p className="credit-summary-label">Total Amount</p>
                  <p className="credit-summary-value total">Rs.{(selectedVendor?.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="credit-summary-item">
                  <p className="credit-summary-label">Total Paid</p>
                  <p className="credit-summary-value paid">Rs.{(selectedVendor?.paidAmount || 0).toLocaleString()}</p>
                </div>
                <div className="credit-summary-item">
                  <p className="credit-summary-label">Balance</p>
                  <p className="credit-summary-value balance">Rs.{(selectedVendor?.balanceAmount || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* All Records - ✅ SORTED NEWEST FIRST */}
              <div className="mb-6">
                <h3 className="credit-history-title">
                  <FiBox className="credit-history-icon" /> All Records
                </h3>
                {!selectedVendor?.records || selectedVendor.records.length === 0 ? (
                  <div className="credit-empty-history">
                    <FiInbox className="credit-empty-history-icon" />
                    <p>No records found</p>
                  </div>
                ) : (
                  <div className="credit-history-table-wrapper">
                    <table className="credit-history-table">
                      <thead className={darkMode ? 'dark' : ''}>
                        <tr>
                          <th>#</th>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th className="credit-text-right">Total</th>
                          <th className="credit-text-right">Paid</th>
                          <th className="credit-text-right">Balance</th>
                          <th>Products</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* ✅ FIXED: Sort records by createdAt - NEWEST FIRST */}
                        {[...selectedVendor.records]
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                          .map((record, idx) => (
                            <tr key={record.id || idx}>
                              <td>{idx + 1}</td>
                              <td>{record.invoiceNumber || 'N/A'}</td>
                              <td>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}</td>
                              <td className="credit-text-right credit-amount-total">Rs.{record.totalAmount.toLocaleString()}</td>
                              <td className="credit-text-right credit-amount-paid">Rs.{record.paidAmount.toLocaleString()}</td>
                              <td className="credit-text-right">
                                <span className={`credit-balance ${record.balanceAmount > 0 ? 'due' : 'paid'}`}>
                                  Rs.{record.balanceAmount.toLocaleString()}
                                </span>
                              </td>
                              <td className="credit-cell-truncate">{record.products || 'N/A'}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot className={darkMode ? 'dark' : ''}>
                        <tr>
                          <td colSpan="3" className="credit-text-right credit-total-label">Total:</td>
                          <td className="credit-text-right credit-total-amount">Rs.{selectedVendor?.totalAmount?.toLocaleString() || 0}</td>
                          <td className="credit-text-right credit-total-amount">Rs.{selectedVendor?.paidAmount?.toLocaleString() || 0}</td>
                          <td className="credit-text-right credit-total-amount">Rs.{selectedVendor?.balanceAmount?.toLocaleString() || 0}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h3 className="credit-history-title">
                  <FiCreditCard className="credit-history-icon text-green-500" /> Payment History
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedVendor?.payments?.length || 0} payments)
                  </span>
                </h3>
                {!selectedVendor?.payments || selectedVendor.payments.length === 0 ? (
                  <div className="credit-empty-history">
                    <FiInbox className="credit-empty-history-icon" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="credit-history-table-wrapper">
                    <table className="credit-history-table">
                      <thead className={darkMode ? 'dark' : ''}>
                        <tr>
                          <th>#</th>
                          <th>Date & Time (Pakistan)</th>
                          <th className="credit-text-right">Amount (Rs.)</th>
                          <th>Note</th>
                          <th>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedVendor.payments]
                          .sort((a, b) => new Date(b.date || b.payment_date) - new Date(a.date || a.payment_date))
                          .map((payment, idx) => {
                            const paymentDate = payment.date || payment.payment_date;
                            const { date, time } = formatPakistanTime(paymentDate);
                            return (
                              <tr key={payment.id || idx}>
                                <td>{idx + 1}</td>
                                <td>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{date}</span>
                                    <span className="text-xs text-gray-500">{time}</span>
                                  </div>
                                </td>
                                <td className="credit-text-right credit-amount-paid">
                                  Rs.{payment.amount?.toLocaleString() || 0}
                                </td>
                                <td>{payment.note || '-'}</td>
                                <td>{payment.createdBy || 'System'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot className={darkMode ? 'dark' : ''}>
                        <tr>
                          <td colSpan="2" className="credit-text-right credit-total-label font-bold">
                            Total Paid:
                          </td>
                          <td className="credit-text-right credit-total-amount font-bold">
                            Rs.{selectedVendor?.paidAmount?.toLocaleString() || 0}
                          </td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className={`credit-modal-footer ${darkMode ? 'dark' : ''}`}>
              <button onClick={handleCloseModal} className="credit-btn-close">
                <FiX /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Now Modal */}
      {isPayModalOpen && selectedVendor && (
        <div className="credit-modal-overlay">
          <div className={`credit-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`credit-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="credit-modal-title">
                <FiDollarSign className="credit-modal-title-icon" /> Make Payment
              </h2>
              <button onClick={handleCloseModal} className="credit-modal-close">
                <FiX />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="credit-modal-body">
              <div className="credit-payment-summary">
                <p className="credit-payment-label">Vendor</p>
                <p className="credit-payment-vendor">{selectedVendor?.name || 'N/A'}</p>
                <p className="credit-payment-label">Total Amount</p>
                <p className="credit-payment-balance" style={{color: '#111827'}}>Rs.{(selectedVendor?.totalAmount || 0).toLocaleString()}</p>
                <p className="credit-payment-label">Already Paid</p>
                <p className="credit-payment-balance" style={{color: '#16a34a'}}>Rs.{(selectedVendor?.paidAmount || 0).toLocaleString()}</p>
                <p className="credit-payment-label">Remaining Balance</p>
                <p className="credit-payment-balance">Rs.{(selectedVendor?.balanceAmount || 0).toLocaleString()}</p>
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Payment Amount (Rs.) *</label>
                <input 
                  type="number" 
                  name="paymentAmount" 
                  required 
                  min="1" 
                  max={selectedVendor?.balanceAmount || 0} 
                  step="0.01" 
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`} 
                  placeholder="Enter amount to pay" 
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Maximum: Rs. {(selectedVendor?.balanceAmount || 0).toLocaleString()}
                </p>
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Note (Optional)</label>
                <input type="text" name="paymentNote" className={`credit-form-input ${darkMode ? 'dark' : ''}`} placeholder="Add a note for this payment" />
              </div>
              <div className="credit-form-actions">
                <button type="button" onClick={handleCloseModal} className="credit-btn-cancel">Cancel</button>
                <button 
                  type="submit" 
                  className="credit-btn-pay-submit"
                  ref={paySubmitRef}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Processing...
                    </>
                  ) : (
                    'Pay Now'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {isModalOpen && selectedVendor && (
        <div className="credit-modal-overlay">
          <div className={`credit-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`credit-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="credit-modal-title">
                <FiEdit className="credit-modal-title-icon" /> Edit Vendor
              </h2>
              <button onClick={handleCloseModal} className="credit-modal-close">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="credit-modal-body">
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Vendor Name *</label>
                <input type="text" name="name" required defaultValue={selectedVendor?.name || ''} className={`credit-form-input ${darkMode ? 'dark' : ''}`} />
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Products</label>
                <input type="text" name="products" required defaultValue={selectedVendor?.products || ''} className={`credit-form-input ${darkMode ? 'dark' : ''}`} />
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Stock Quantity</label>
                <input type="number" name="stockQuantity" min="0" defaultValue={selectedVendor?.stockQuantity || 0} className={`credit-form-input ${darkMode ? 'dark' : ''}`} />
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Invoice Number *</label>
                <input type="text" name="invoiceNumber" required defaultValue={selectedVendor?.invoiceNumber || ''} className={`credit-form-input ${darkMode ? 'dark' : ''}`} />
              </div>
              
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Total Amount (Rs.)</label>
                <input 
                  type="number" 
                  name="totalAmount" 
                  required 
                  min="0" 
                  step="0.01" 
                  defaultValue={selectedVendor?.totalAmount || 0} 
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`} 
                  readOnly 
                  style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', cursor: 'not-allowed' }}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Total amount from all orders (cannot be changed)
                </p>
              </div>

              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Already Paid (Rs.)</label>
                <input 
                  type="number" 
                  value={selectedVendor?.paidAmount || 0} 
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`} 
                  readOnly 
                  style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', cursor: 'not-allowed' }}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Total paid so far: Rs. {(selectedVendor?.paidAmount || 0).toLocaleString()} | 
                  Balance: Rs. {(selectedVendor?.balanceAmount || 0).toLocaleString()}
                </p>
              </div>

              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Pay Now (Rs.)</label>
                <input 
                  type="number" 
                  name="newPayment" 
                  min="0" 
                  step="0.01" 
                  value={editPayAmount}
                  onChange={(e) => setEditPayAmount(e.target.value)}
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`} 
                  placeholder="Enter amount to pay now"
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Maximum: Rs. {(selectedVendor?.balanceAmount || 0).toLocaleString()}
                </p>
              </div>

              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Payment Note (Optional)</label>
                <input 
                  type="text" 
                  name="paymentNote" 
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`} 
                  placeholder="Add note for this payment"
                />
              </div>

              <div className="credit-form-actions">
                <button type="button" onClick={handleCloseModal} className="credit-btn-cancel">Cancel</button>
                <button 
                  type="submit" 
                  className="credit-btn-update"
                  ref={editSubmitRef}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Processing...
                    </>
                  ) : (
                    'Update & Pay'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="credit-modal-overlay">
          <div className={`credit-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`credit-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="credit-modal-title">
                <FiPlus className="credit-modal-title-icon" /> Add Vendor
              </h2>
              <button onClick={handleCloseModal} className="credit-modal-close">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmitVendor} className="credit-modal-body">
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Vendor Name *</label>
                <input type="text" name="name" required className={`credit-form-input ${darkMode ? 'dark' : ''}`} placeholder="Enter vendor name" />
              </div>
              
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Invoice Number *</label>
                <input type="text" name="invoiceNumber" required className={`credit-form-input ${darkMode ? 'dark' : ''}`} placeholder="Enter invoice number" />
              </div>

              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Select Products</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search existing products..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className={`flex-1 credit-form-input ${darkMode ? 'dark' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <FiShoppingCart />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewProductModalOpen(true)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                    >
                      <FiPlusCircle className="text-sm" /> New
                    </button>
                  </div>
                  
                  {showProductDropdown && (
                    <div className={`absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      {filteredProducts.length === 0 ? (
                        <div className="p-3 text-center text-gray-500">
                          No products available. 
                          <button 
                            type="button"
                            onClick={() => setIsNewProductModalOpen(true)}
                            className="ml-1 text-green-500 hover:text-green-600 underline"
                          >
                            Add new product?
                          </button>
                        </div>
                      ) : (
                        filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleAddProductToSelection(product)}
                            className={`w-full text-left px-3 py-2 hover:bg-red-500 hover:text-white transition flex justify-between items-center ${darkMode ? 'text-white hover:bg-red-600' : 'text-gray-900'}`}
                          >
                            <span>{product.name}</span>
                            <span className="text-xs text-gray-400">Stock: {product.quantity}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <div className="credit-form-group">
                  <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Selected Products</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedProducts.map((item, index) => (
                      <div key={index} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <span className="flex-1 font-medium">{item.product_name}</span>
                        <div className="flex items-center gap-1">
                          <label className="text-xs">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateSelectedProductQty(index, parseInt(e.target.value) || 1)}
                            className={`w-16 px-1 py-1 text-sm rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs">Price:</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchase_price}
                            onChange={(e) => updateSelectedProductPrice(index, e.target.value)}
                            className={`w-24 px-1 py-1 text-sm rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedProduct(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Amount: Rs. {selectedProducts.reduce((sum, p) => sum + (p.purchase_price * p.quantity), 0).toLocaleString()}
                  </div>
                </div>
              )}

              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Paid Amount (Rs.)</label>
                <input type="number" name="paidAmount" min="0" step="0.01" className={`credit-form-input ${darkMode ? 'dark' : ''}`} placeholder="Enter paid amount (optional)" />
              </div>

              <div className="credit-form-actions">
                <button type="button" onClick={handleCloseModal} className="credit-btn-cancel">Cancel</button>
                <button type="submit" className="credit-btn-submit">Add Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <div className="credit-modal-overlay">
          <div className={`credit-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`credit-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="credit-modal-title">
                <FiPlusCircle className="credit-modal-title-icon text-green-500" /> Add New Product
              </h2>
              <button onClick={handleCloseModal} className="credit-modal-close">
                <FiX />
              </button>
            </div>
            <div className="credit-modal-body">
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Product Name *</label>
                <input
                  type="text"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter product name"
                />
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Purchase Price (Rs.) *</label>
                <input
                  type="number"
                  value={newProductData.purchase_price}
                  onChange={(e) => setNewProductData({ ...newProductData, purchase_price: e.target.value })}
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter purchase price"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Selling Price (Rs.) *</label>
                <input
                  type="number"
                  value={newProductData.selling_price}
                  onChange={(e) => setNewProductData({ ...newProductData, selling_price: e.target.value })}
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter selling price"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="credit-form-group">
                <label className={`credit-form-label ${darkMode ? 'dark' : ''}`}>Stock Quantity *</label>
                <input
                  type="number"
                  value={newProductData.quantity}
                  onChange={(e) => setNewProductData({ ...newProductData, quantity: e.target.value })}
                  className={`credit-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter stock quantity"
                  min="0"
                />
              </div>
              <div className="credit-form-actions">
                <button type="button" onClick={handleCloseModal} className="credit-btn-cancel">Cancel</button>
                <button type="button" onClick={handleAddNewProduct} className="credit-btn-submit">Add Product</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Credit;