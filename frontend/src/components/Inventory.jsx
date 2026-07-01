// src/components/Inventory.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiSearch, FiX, FiPlus, FiFileText, FiDownload, 
  FiEdit2, FiPackage, FiDollarSign, FiTrendingUp,
  FiShoppingCart, FiBarChart2, FiCheckCircle, FiAlertCircle,
  FiLoader, FiUser, FiTrash2, FiEye, FiEyeOff, FiGrid, FiList,
  FiCalendar
} from 'react-icons/fi';
import api from '../services/api';

// ✅ Helper: Get date range for filter
const getDateRange = (filter) => {
  const now = new Date();
  const start = new Date();
  
  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = now.getDay();
      const diff = (day === 0 ? 6 : day - 1);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return { start, end: now };
};

// ✅ Helper: Filter products by date added
const filterProductsByDate = (products, filter) => {
  if (filter === 'all' || !products || products.length === 0) return products;
  const range = getDateRange(filter);
  if (!range) return products;
  
  return products.filter(product => {
    if (!product.date_added) return false;
    const prodDate = new Date(product.date_added);
    return prodDate >= range.start && prodDate <= range.end;
  });
};

// Debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// ✅ Product Row Component
const ProductRow = React.memo(({ product, darkMode, editingCell, onStartEdit, onSaveEdit, onKeyPress, onEditProduct, onDeleteProduct, onToggleHide, formatPrice, isAdmin }) => {
  const isEditingName = editingCell.productId === product.id && editingCell.field === 'name';
  const isEditingPurchase = editingCell.productId === product.id && editingCell.field === 'purchasePrice';
  const isEditingSelling = editingCell.productId === product.id && editingCell.field === 'sellingPrice';
  const isEditingQuantity = editingCell.productId === product.id && editingCell.field === 'quantity';
  const isHidden = product.is_hidden === 1 || product.is_hidden === true;

  return (
    <tr className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} ${isHidden ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''}`}>
      <td className="px-6 py-4">
        {isEditingName ? (
          <input
            type="text"
            value={editingCell.value}
            onChange={(e) => onStartEdit({ ...editingCell, value: e.target.value })}
            onBlur={() => onSaveEdit(product.id, 'name')}
            onKeyDown={(e) => onKeyPress(e, product.id, 'name')}
            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
            autoFocus
          />
        ) : (
          <div 
            onDoubleClick={() => isAdmin && onStartEdit({ productId: product.id, field: 'name', value: product.name })} 
            className={`${isAdmin ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : 'cursor-default'} font-medium ${darkMode ? 'text-white' : 'text-gray-900'} px-2 py-1 rounded transition`} 
            title={isAdmin ? "Double-click to edit product name" : ""}
          >
            {product.name}
            {isHidden && <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">Hidden</span>}
          </div>
        )}
      </td>
      
      {isAdmin && (
        <td className="px-6 py-4">
          {isEditingPurchase ? (
            <input
              type="number"
              value={editingCell.value}
              onChange={(e) => onStartEdit({ ...editingCell, value: e.target.value })}
              onBlur={() => onSaveEdit(product.id, 'purchasePrice')}
              onKeyDown={(e) => onKeyPress(e, product.id, 'purchasePrice')}
              className={`w-32 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
              autoFocus
              step="0.01"
              min="0"
            />
          ) : (
            <div 
              onDoubleClick={() => isAdmin && onStartEdit({ productId: product.id, field: 'purchasePrice', value: product.purchase_price })} 
              className={`${isAdmin ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : 'cursor-default'} ${darkMode ? 'text-gray-300' : 'text-gray-600'} px-2 py-1 rounded transition`} 
              title={isAdmin ? "Double-click to edit purchase price" : ""}
            >
              {formatPrice(product.purchase_price)}
            </div>
          )}
        </td>
      )}
      
      {isAdmin && (
        <td className="px-6 py-4">
          {isEditingSelling ? (
            <input
              type="number"
              value={editingCell.value}
              onChange={(e) => onStartEdit({ ...editingCell, value: e.target.value })}
              onBlur={() => onSaveEdit(product.id, 'sellingPrice')}
              onKeyDown={(e) => onKeyPress(e, product.id, 'sellingPrice')}
              className={`w-32 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
              autoFocus
              step="0.01"
              min="0"
            />
          ) : (
            <div 
              onDoubleClick={() => isAdmin && onStartEdit({ productId: product.id, field: 'sellingPrice', value: product.selling_price })} 
              className={`${isAdmin ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : 'cursor-default'} ${darkMode ? 'text-gray-300' : 'text-gray-600'} px-2 py-1 rounded transition`} 
              title={isAdmin ? "Double-click to edit selling price" : ""}
            >
              {formatPrice(product.selling_price)}
            </div>
          )}
        </td>
      )}

      <td className="px-6 py-4">
        {isEditingQuantity ? (
          <input
            type="number"
            value={editingCell.value}
            onChange={(e) => onStartEdit({ ...editingCell, value: e.target.value })}
            onBlur={() => onSaveEdit(product.id, 'quantity')}
            onKeyDown={(e) => onKeyPress(e, product.id, 'quantity')}
            className={`w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
            autoFocus
            min="0"
          />
        ) : (
          <div 
            onDoubleClick={() => onStartEdit({ productId: product.id, field: 'quantity', value: product.quantity })} 
            className={`cursor-pointer font-semibold flex items-center gap-1 ${
              product.quantity < 5 && product.quantity > 0 ? 'text-yellow-500' : 
              product.quantity === 0 ? 'text-red-500' : 
              darkMode ? 'text-white' : 'text-gray-900'
            } hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition`} 
            title="Double-click to edit stock"
          >
            {product.quantity}
            {product.quantity < 5 && product.quantity > 0 && <FiAlertCircle className="text-xs" />}
            {product.quantity === 0 && <FiX className="text-xs" />}
          </div>
        )}
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 flex-wrap">
          {isAdmin && (
            <>
              <button 
                onClick={() => onEditProduct(product)} 
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-1 shadow-md"
              >
                <FiEdit2 className="text-xs" /> Edit
              </button>
              <button 
                onClick={() => onToggleHide(product)} 
                className={`px-3 py-1 rounded-lg text-sm transition flex items-center gap-1 shadow-md ${
                  product.is_hidden === 1 || product.is_hidden === true
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
                title={product.is_hidden === 1 || product.is_hidden === true ? "Unhide Product" : "Hide Product"}
              >
                {product.is_hidden === 1 || product.is_hidden === true ? <FiEye className="text-xs" /> : <FiEyeOff className="text-xs" />}
                {product.is_hidden === 1 || product.is_hidden === true ? 'Unhide' : 'Hide'}
              </button>
              <button 
                onClick={() => onDeleteProduct(product.id, product.name)} 
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-1 shadow-md"
              >
                <FiTrash2 className="text-xs" /> Delete
              </button>
            </>
          )}
          {!isAdmin && (
            <span className="text-xs text-gray-400">View Only</span>
          )}
        </div>
      </td>
    </tr>
  );
});

const Inventory = ({ darkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // ✅ Time filter state
  const [timeFilter, setTimeFilter] = useState('all');
  
  // ✅ Dynamic stats based on filter
  const [filteredStats, setFilteredStats] = useState({
    totalPurchase: 0,
    totalSelling: 0,
    totalProfit: 0
  });
  
  const [formData, setFormData] = useState({
    name: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: ''
  });
  const [viewMode, setViewMode] = useState('active');
  const [editingCell, setEditingCell] = useState({ productId: null, field: null, value: '' });

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);
      setIsAdmin(userData.role === 'admin');
    }
  }, []);

  // ✅ Filtered products based on viewMode and timeFilter
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply view mode filter
    if (viewMode === 'active') {
      filtered = filtered.filter(product => product.is_hidden !== true);
    } else if (viewMode === 'hidden') {
      filtered = filtered.filter(product => product.is_hidden === true);
    }
    
    // Apply time filter
    filtered = filterProductsByDate(filtered, timeFilter);
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [products, searchTerm, viewMode, timeFilter]);

  // ✅ Calculate summary totals for table
  const summaryTotals = useMemo(() => {
    let data = filteredProducts;
    
    const totalStock = data.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalPurchaseValue = data.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0);
    const totalSellingValue = data.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.quantity || 0)), 0);
    const totalProfit = data.reduce((sum, p) => sum + (((p.selling_price || 0) - (p.purchase_price || 0)) * (p.quantity || 0)), 0);
    
    return {
      totalStock,
      totalPurchaseValue,
      totalSellingValue,
      totalProfit
    };
  }, [filteredProducts]);

  // ✅ Calculate stats based on filter
  const calculateFilteredStats = useCallback((productsList, filter) => {
    const range = getDateRange(filter);
    if (!range || filter === 'all') {
      // For 'all', show total of all products
      const stats = productsList.reduce((acc, product) => {
        if (product.is_hidden === true) return acc;
        acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
        acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
        acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
        return acc;
      }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
      return stats;
    }
    
    // Filter by date range
    const filtered = productsList.filter(product => {
      if (product.is_hidden === true) return false;
      if (!product.date_added) return false;
      const prodDate = new Date(product.date_added);
      return prodDate >= range.start && prodDate <= range.end;
    });
    
    const stats = filtered.reduce((acc, product) => {
      acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
      acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
      acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
    
    return stats;
  }, []);

  // ✅ Update stats when filter changes
  useEffect(() => {
    const stats = calculateFilteredStats(products, timeFilter);
    setFilteredStats(stats);
  }, [products, timeFilter, calculateFilteredStats]);

  // ✅ Get filter label for stats cards
  const getStatsLabel = () => {
    const labels = {
      all: 'Total',
      today: "Today's",
      week: "This Week's",
      month: "This Month's",
      year: "This Year's"
    };
    return labels[timeFilter] || 'Total';
  };

  const fetchProducts = useCallback(async () => {
    const abortController = new AbortController();
    setLoading(true);
    try {
      const response = await api.get('/products', {
        signal: abortController.signal,
        params: {
          show_hidden: 'true'
        }
      });
      
      console.log('📦 API Response:', response.data);
      
      let productsData = [];
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else {
        console.warn('Unexpected API response:', response.data);
        productsData = [];
      }
      
      setProducts(productsData);
      
      // ✅ Calculate initial stats
      const stats = calculateFilteredStats(productsData, timeFilter);
      setFilteredStats(stats);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
    return () => abortController.abort();
  }, [calculateFilteredStats, timeFilter]);

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handleAddProduct = useCallback(async (productData) => {
    if (!isAdmin) {
      toast.error('Only admin can add products');
      return false;
    }
    try {
      const response = await api.post('/products', productData);
      if (response.data) {
        toast.success('Product added successfully!');
        await fetchProducts();
        return true;
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.message || 'Failed to add product');
      return false;
    }
  }, [fetchProducts, isAdmin]);

  const handleUpdateProduct = useCallback(async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      if (response.data) {
        toast.success('Product updated successfully!');
        await fetchProducts();
        return true;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.message || 'Failed to update product');
      return false;
    }
  }, [fetchProducts]);

  const handleDeleteProduct = useCallback(async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone!`)) {
      try {
        await api.delete(`/products/${id}`);
        toast.success(`"${name}" deleted successfully!`);
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  }, [fetchProducts]);

  const handleToggleHide = useCallback(async (product) => {
    const isCurrentlyHidden = product.is_hidden === true || product.is_hidden === 1;
    const newHiddenStatus = isCurrentlyHidden ? 0 : 1;
    const action = newHiddenStatus === 1 ? 'hide' : 'unhide';
    
    try {
      await api.patch(`/products/${product.id}`, {
        is_hidden: newHiddenStatus
      });
      
      await fetchProducts();
      toast.success(`Product ${action}ned successfully!`);
      
      if (newHiddenStatus === 1) {
        setViewMode('hidden');
      } else {
        setViewMode('active');
      }
      
    } catch (error) {
      console.error('Error toggling product visibility:', error);
      toast.error(error.response?.data?.message || `Failed to ${action} product`);
    }
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const exportToExcel = useCallback((data, filename) => {
    const exportData = data.map(p => ({
      'Product': p.name,
      ...(isAdmin && { 'Purchase Price': `Rs. ${(p.purchase_price || 0).toLocaleString()}` }),
      ...(isAdmin && { 'Selling Price': `Rs. ${(p.selling_price || 0).toLocaleString()}` }),
      'Stock': p.quantity || 0,
      'Status': p.is_hidden === true ? 'Hidden' : 'Active'
    }));
    
    const summaryRow = {
      'Product': '📊 TOTAL',
      ...(isAdmin && { 'Purchase Price': `Rs. ${summaryTotals.totalPurchaseValue.toLocaleString()}` }),
      ...(isAdmin && { 'Selling Price': `Rs. ${summaryTotals.totalSellingValue.toLocaleString()}` }),
      'Stock': summaryTotals.totalStock,
      'Status': ''
    };
    exportData.push(summaryRow);
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Exported to Excel');
  }, [isAdmin, summaryTotals]);

  const exportToPDF = useCallback((data, title) => {
    const doc = new jsPDF('landscape');
    doc.text(title, 14, 10);
    
    const head = ['Product'];
    if (isAdmin) head.push('Purchase Price', 'Selling Price');
    head.push('Stock', 'Status');
    
    const body = data.map(p => {
      const row = [p.name || ''];
      if (isAdmin) row.push(`Rs. ${(p.purchase_price || 0).toLocaleString()}`, `Rs. ${(p.selling_price || 0).toLocaleString()}`);
      row.push(p.quantity || 0);
      row.push(p.is_hidden === true ? 'Hidden' : 'Active');
      return row;
    });
    
    const summaryRow = ['📊 TOTAL'];
    if (isAdmin) {
      summaryRow.push(`Rs. ${summaryTotals.totalPurchaseValue.toLocaleString()}`);
      summaryRow.push(`Rs. ${summaryTotals.totalSellingValue.toLocaleString()}`);
    }
    summaryRow.push(summaryTotals.totalStock);
    summaryRow.push('');
    body.push(summaryRow);
    
    doc.autoTable({
      head: [head],
      body: body,
      startY: 20,
    });
    doc.save(`${title}.pdf`);
    toast.success('Exported to PDF');
  }, [isAdmin, summaryTotals]);

  const handleInputChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Only admin can add products');
      return;
    }
    
    if (!formData.name || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const purchasePriceNum = parseFloat(formData.purchasePrice);
    const sellingPriceNum = parseFloat(formData.sellingPrice);
    const quantityNum = parseInt(formData.quantity);

    if (isNaN(purchasePriceNum) || isNaN(sellingPriceNum) || isNaN(quantityNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    if (purchasePriceNum < 0 || sellingPriceNum < 0 || quantityNum < 0) {
      toast.error('Values cannot be negative');
      return;
    }

    const success = await handleAddProduct({
      name: formData.name,
      purchase_price: purchasePriceNum,
      selling_price: sellingPriceNum,
      quantity: quantityNum
    });

    if (success) {
      setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
      setIsModalOpen(false);
    }
  }, [formData, handleAddProduct, isAdmin]);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      purchasePrice: product.purchase_price,
      sellingPrice: product.selling_price,
      quantity: product.quantity
    });
    setIsModalOpen(true);
  }, []);

  const handleUpdateSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      if (!formData.quantity) {
        toast.error('Please enter stock quantity');
        return;
      }
      const quantityNum = parseInt(formData.quantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        toast.error('Please enter a valid positive number');
        return;
      }
      
      const success = await handleUpdateProduct(editingProduct.id, {
        quantity: quantityNum
      });
      
      if (success) {
        setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
        setEditingProduct(null);
        setIsModalOpen(false);
      }
      return;
    }
    
    if (!formData.name || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const purchasePriceNum = parseFloat(formData.purchasePrice);
    const sellingPriceNum = parseFloat(formData.sellingPrice);
    const quantityNum = parseInt(formData.quantity);

    if (isNaN(purchasePriceNum) || isNaN(sellingPriceNum) || isNaN(quantityNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    const success = await handleUpdateProduct(editingProduct.id, {
      name: formData.name,
      purchase_price: purchasePriceNum,
      selling_price: sellingPriceNum,
      quantity: quantityNum
    });

    if (success) {
      setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
      setEditingProduct(null);
      setIsModalOpen(false);
    }
  }, [formData, editingProduct, handleUpdateProduct, isAdmin]);

  const startInlineEdit = useCallback(({ productId, field, value }) => {
    setEditingCell({ productId, field, value });
  }, []);

  const saveInlineEdit = useCallback(async (productId, field) => {
    let newValue;
    const productToUpdate = products.find(p => p.id === productId);
    
    if (!isAdmin && field !== 'quantity') {
      toast.error('You can only update stock quantity');
      setEditingCell({ productId: null, field: null, value: '' });
      return;
    }
    
    if (field === 'name') {
      newValue = editingCell.value.trim();
      if (!newValue) {
        toast.error('Product name cannot be empty');
        setEditingCell({ productId: null, field: null, value: '' });
        return;
      }
    } else if (field === 'quantity') {
      newValue = parseInt(editingCell.value);
      if (isNaN(newValue) || newValue < 0) {
        toast.error('Please enter a valid positive number');
        setEditingCell({ productId: null, field: null, value: '' });
        return;
      }
    } else {
      newValue = parseFloat(editingCell.value);
      if (isNaN(newValue) || newValue < 0) {
        toast.error('Please enter a valid positive number');
        setEditingCell({ productId: null, field: null, value: '' });
        return;
      }
    }

    const updateData = {
      name: productToUpdate.name,
      purchase_price: productToUpdate.purchase_price,
      selling_price: productToUpdate.selling_price,
      quantity: productToUpdate.quantity
    };
    
    if (field === 'name') updateData.name = newValue;
    else if (field === 'quantity') updateData.quantity = newValue;
    else if (field === 'purchasePrice') updateData.purchase_price = newValue;
    else if (field === 'sellingPrice') updateData.selling_price = newValue;
    
    try {
      await api.put(`/products/${productId}`, updateData);
      await fetchProducts();
      
      const successMessage = {
        name: 'Product name updated successfully!',
        quantity: 'Stock updated successfully!',
        purchasePrice: 'Purchase price updated successfully!',
        sellingPrice: 'Selling price updated successfully!'
      }[field];
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
    setEditingCell({ productId: null, field: null, value: '' });
  }, [editingCell, products, fetchProducts, isAdmin]);

  const handleKeyPress = useCallback((e, productId, field) => {
    if (e.key === 'Enter') {
      saveInlineEdit(productId, field);
    } else if (e.key === 'Escape') {
      setEditingCell({ productId: null, field: null, value: '' });
    }
  }, [saveInlineEdit]);

  const formatPrice = useCallback((price) => {
    return `Rs. ${price?.toLocaleString() || 0}`;
  }, []);

  const getProductCount = () => {
    let filtered = products;
    if (viewMode === 'active') {
      filtered = filtered.filter(p => p.is_hidden !== true);
    } else if (viewMode === 'hidden') {
      filtered = filtered.filter(p => p.is_hidden === true);
    }
    filtered = filterProductsByDate(filtered, timeFilter);
    return filtered.length;
  };

  const getViewModeText = () => {
    if (viewMode === 'active') return 'active';
    if (viewMode === 'hidden') return 'hidden';
    return 'all';
  };

  // ✅ Get filter label
  const getFilterLabel = () => {
    const labels = {
      all: 'All Time',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year'
    };
    return labels[timeFilter] || 'All Time';
  };

  // ✅ Get stats label for cards
  const getStatsLabelText = () => {
    const labels = {
      all: 'Total',
      today: "Today's",
      week: "This Week's",
      month: "This Month's",
      year: "This Year's"
    };
    return labels[timeFilter] || 'Total';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ FILTER BUTTONS - Daily, Weekly, Monthly, Yearly */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiCalendar className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
        </div>
        <button
          onClick={() => setTimeFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            timeFilter === 'all' 
              ? 'bg-red-500 text-white shadow-md' 
              : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setTimeFilter('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            timeFilter === 'today' 
              ? 'bg-red-500 text-white shadow-md' 
              : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setTimeFilter('week')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            timeFilter === 'week' 
              ? 'bg-red-500 text-white shadow-md' 
              : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setTimeFilter('month')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            timeFilter === 'month' 
              ? 'bg-red-500 text-white shadow-md' 
              : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeFilter('year')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            timeFilter === 'year' 
              ? 'bg-red-500 text-white shadow-md' 
              : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          This Year
        </button>
        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getFilterLabel()}</strong>
        </span>
      </div>

      {/* ✅ DYNAMIC STATISTICS CARDS - Change with filter */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">{getStatsLabelText()} Purchase Total</p>
                <p className="text-3xl font-bold mt-2">Rs. {filteredStats.totalPurchase.toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-2">{getStatsLabelText().toLowerCase()} purchases</p>
              </div>
              <FiShoppingCart className="text-3xl opacity-50" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">{getStatsLabelText()} Selling Value</p>
                <p className="text-3xl font-bold mt-2">Rs. {filteredStats.totalSelling.toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-2">{getStatsLabelText().toLowerCase()} sales</p>
              </div>
              <FiDollarSign className="text-3xl opacity-50" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">{getStatsLabelText()} Profit</p>
                <p className="text-3xl font-bold mt-2">Rs. {filteredStats.totalProfit.toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-2">{getStatsLabelText().toLowerCase()} profit</p>
              </div>
              <FiTrendingUp className="text-3xl opacity-50" />
            </div>
          </div>
        </div>
      )}

      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <FiPackage className="text-xl text-red-500" />
              Products Inventory
              <span className={`text-sm font-normal ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ({getProductCount()} {getViewModeText()})
              </span>
            </h3>
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  onChange={handleSearchChange}
                  className={`px-4 py-2 pl-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  style={{ width: '250px' }}
                />
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <FiX />
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => setViewMode('active')} 
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'active' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FiEye className="text-sm" />
                Active
              </button>
              
              <button 
                onClick={() => setViewMode('hidden')} 
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'hidden' 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FiEyeOff className="text-sm" />
                Hidden
              </button>
              
              <button 
                onClick={() => setViewMode('all')} 
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'all' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                All
              </button>
              
              {isAdmin && (
                <button onClick={() => setIsModalOpen(true)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition flex items-center gap-2 shadow-md">
                  <FiPlus className="text-sm" /> Add Product
                </button>
              )}
              
              <button onClick={() => exportToExcel(filteredProducts, 'Inventory_Report')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-2 shadow-md">
                <FiFileText className="text-sm" /> Excel
              </button>
              <button onClick={() => exportToPDF(filteredProducts, 'Inventory_Report')} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2 shadow-md">
                <FiDownload className="text-sm" /> PDF
              </button>
            </div>
          </div>
          
          {searchTerm && (
            <div className={`mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Found {filteredProducts.length} product(s) for "{searchTerm}"
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Product</th>
                {isAdmin && (
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Purchase Price</th>
                )}
                {isAdmin && (
                  <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Selling Price</th>
                )}
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Stock</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiPackage className="text-5xl text-gray-400" />
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {searchTerm ? `No products found matching "${searchTerm}"` : 
                         viewMode === 'active' ? 'No active products found.' :
                         viewMode === 'hidden' ? 'No hidden products found.' :
                         'No products added yet.'}
                      </p>
                      {viewMode === 'active' && (
                        <button 
                          onClick={() => setViewMode('all')} 
                          className="text-sm text-blue-500 hover:text-blue-600 underline"
                        >
                          Check all products?
                        </button>
                      )}
                      {viewMode === 'hidden' && (
                        <button 
                          onClick={() => setViewMode('active')} 
                          className="text-sm text-blue-500 hover:text-blue-600 underline"
                        >
                          Check active products?
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredProducts.map(product => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      darkMode={darkMode}
                      editingCell={editingCell}
                      onStartEdit={startInlineEdit}
                      onSaveEdit={saveInlineEdit}
                      onKeyPress={handleKeyPress}
                      onEditProduct={handleEditProduct}
                      onDeleteProduct={handleDeleteProduct}
                      onToggleHide={handleToggleHide}
                      formatPrice={formatPrice}
                      isAdmin={isAdmin}
                    />
                  ))}
                  
                  {/* ✅ SUMMARY ROW - Clean Styling */}
                  <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-400'}`}>
                    <td className="px-6 py-3">
                      <div className="font-bold text-base flex items-center gap-2">
                        <FiBarChart2 className="text-red-500" />
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>📊 TOTAL</span>
                      </div>
                    </td>
                    
                    {isAdmin && (
                      <td className="px-6 py-3">
                        <div className="font-semibold text-blue-600 text-sm">
                          Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}
                        </div>
                      </td>
                    )}
                    
                    {isAdmin && (
                      <td className="px-6 py-3">
                        <div className="font-semibold text-red-500 text-sm">
                          Rs. {summaryTotals.totalSellingValue.toLocaleString()}
                        </div>
                      </td>
                    )}
                    
                    <td className="px-6 py-3">
                      <div className="font-bold text-base flex items-center gap-1">
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{summaryTotals.totalStock}</span>
                        <span className="text-xs text-gray-400">units</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Stock: {summaryTotals.totalStock}</span>
                        {isAdmin && (
                          <>
                            <span className="text-xs text-blue-500">Buy: Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}</span>
                            <span className="text-xs text-red-500">Sell: Rs. {summaryTotals.totalSellingValue.toLocaleString()}</span>
                            <span className={`text-xs font-bold ${summaryTotals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              Profit: Rs. {summaryTotals.totalProfit.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        
        {/* ✅ SUMMARY CARD - Compact and Clean */}
        <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Products:</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{filteredProducts.length}</span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Stock:</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{summaryTotals.totalStock}</span>
              </div>
              {isAdmin && (
                <>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purchase:</span>
                    <span className={`text-sm font-semibold text-blue-500`}>Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Selling:</span>
                    <span className={`text-sm font-semibold text-red-500`}>Rs. {summaryTotals.totalSellingValue.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Profit:</span>
                    <span className={`text-sm font-bold ${summaryTotals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Rs. {summaryTotals.totalProfit.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
            {isAdmin && (
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>
                * Based on current stock × price
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal - Sirf Admin ke liye */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' }); }} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <form onSubmit={editingProduct ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Product Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} 
                  placeholder="Enter product name" 
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Price * (Rs.)</label>
                <input 
                  type="number" 
                  name="purchasePrice" 
                  value={formData.purchasePrice} 
                  onChange={handleInputChange} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} 
                  placeholder="Enter purchase price" 
                  min="0" 
                  step="0.01" 
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Selling Price * (Rs.)</label>
                <input 
                  type="number" 
                  name="sellingPrice" 
                  value={formData.sellingPrice} 
                  onChange={handleInputChange} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} 
                  placeholder="Enter selling price" 
                  min="0" 
                  step="0.01" 
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Stock Quantity *</label>
                <input 
                  type="number" 
                  name="quantity" 
                  value={formData.quantity} 
                  onChange={handleInputChange} 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} 
                  placeholder="Enter stock quantity" 
                  min="0" 
                  required 
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingProduct(null); setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' }); }} 
                  className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <FiCheckCircle className="text-sm" /> 
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;