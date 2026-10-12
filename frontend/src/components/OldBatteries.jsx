// src/components/OldBatteries.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiBattery, FiPackage, FiDollarSign, FiTrendingUp, FiTrash2, FiDownload, FiFileText,
  FiSearch, FiX, FiEdit2, FiShoppingCart, FiBarChart2, FiCheckCircle,
  FiAlertCircle, FiLoader, FiUser, FiEye, FiEyeOff, FiCalendar, FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import BatteryOverview from './BatteryOverview';

const num = (v) => parseFloat(v) || 0;
const rs = (v) => `Rs. ${num(v).toLocaleString()}`;

/* =====================================================================
   OLD BATTERIES VIEW  (bilkul pehle jaisa — koi change nahi)
   ===================================================================== */
const OldBatteriesView = ({ darkMode }) => {
  const [loading, setLoading] = useState(true);
  const [oldBatteries, setOldBatteries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all | in_stock | sold

  // ✅ Fetch all old batteries (in stock + sold)
  const fetchOldBatteries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/old-batteries', { params: { status: 'all' } });
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      setOldBatteries(data);
    } catch (error) {
      console.error('Error fetching old batteries:', error);
      toast.error('Failed to load old batteries data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOldBatteries();
  }, [fetchOldBatteries]);

  // ✅ Delete old battery record
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/old-batteries/${id}`);
      toast.success('Record deleted successfully');
      fetchOldBatteries();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  // ✅ Filtered list
  const filteredBatteries = oldBatteries.filter((item) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      item.battery_name?.toLowerCase().includes(search) ||
      item.customer_name?.toLowerCase().includes(search) ||
      item.customer_phone?.includes(search);
    const matchesFilter = filter === 'all' ? true : item.status === filter;
    return matchesSearch && matchesFilter;
  });

  // ✅ Stats (based on ALL records, not filtered)
  const inStock = oldBatteries.filter((b) => b.status !== 'sold');
  const sold = oldBatteries.filter((b) => b.status === 'sold');
  const stockValue = inStock.reduce((s, b) => s + num(b.trade_in_amount), 0);
  const soldRevenue = sold.reduce((s, b) => s + num(b.selling_price), 0);
  const totalProfit = sold.reduce((s, b) => s + num(b.profit), 0);

  // ✅ Filtered totals for footer
  const footPurchase = filteredBatteries.reduce((s, b) => s + num(b.trade_in_amount), 0);
  const footSelling = filteredBatteries.reduce((s, b) => s + (b.status === 'sold' ? num(b.selling_price) : 0), 0);
  const footProfit = filteredBatteries.reduce((s, b) => s + (b.status === 'sold' ? num(b.profit) : 0), 0);

  const buildRow = (item) => ({
    date: new Date(item.purchase_date || item.created_at).toLocaleDateString(),
    battery: item.battery_name || 'Unknown',
    purchase: rs(item.trade_in_amount),
    selling: item.status === 'sold' ? rs(item.selling_price) : '-',
    profit: item.status === 'sold' ? rs(item.profit) : '-',
    status: item.status === 'sold' ? 'Sold' : 'In Stock',
    customer: item.customer_name || 'Walk-in',
    phone: item.customer_phone || 'N/A',
    note: item.note || '-',
  });

  // ✅ Export to Excel
  const exportToExcel = () => {
    if (filteredBatteries.length === 0) {
      toast.error('No data available');
      return;
    }
    const exportData = filteredBatteries.map((item) => {
      const r = buildRow(item);
      return {
        'Date': r.date,
        'Battery': r.battery,
        'Purchase Price': r.purchase,
        'Selling Price': r.selling,
        'Profit': r.profit,
        'Status': r.status,
        'Customer': r.customer,
        'Phone': r.phone,
        'Note': r.note,
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Old_Batteries');
    XLSX.writeFile(wb, 'Old_Batteries_History.xlsx');
    toast.success('Exported to Excel successfully!');
  };

  // ✅ Export to PDF
  const exportToPDF = () => {
    if (filteredBatteries.length === 0) {
      toast.error('No data available');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.text('Old Batteries History', 14, 10);

    const tableData = filteredBatteries.map((item) => {
      const r = buildRow(item);
      return [r.date, r.battery, r.purchase, r.selling, r.profit, r.status, r.customer, r.phone];
    });

    doc.autoTable({
      head: [['Date', 'Battery', 'Purchase', 'Selling', 'Profit', 'Status', 'Customer', 'Phone']],
      body: tableData,
      startY: 20,
    });
    doc.save('Old_Batteries_History.pdf');
    toast.success('Exported to PDF successfully!');
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading old batteries data...</p>
        </div>
      </div>
    );
  }

  const filterBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        filter === key
          ? 'bg-red-500 text-white'
          : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`flex flex-wrap justify-between items-center p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FiBattery className="text-red-500 text-2xl" />
          <h2 className="text-xl font-bold">Old Batteries History</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {oldBatteries.length} records
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm">
            <FiFileText /> Excel
          </button>
          <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 text-sm">
            <FiDownload /> PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Stock Value (Purchase)</p>
              <p className="text-3xl font-bold mt-2">{rs(stockValue)}</p>
              <p className="text-xs opacity-75 mt-1">{inStock.length} in stock</p>
            </div>
            <FiDollarSign className="text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Batteries Sold</p>
              <p className="text-3xl font-bold mt-2">{sold.length}</p>
              <p className="text-xs opacity-75 mt-1">Units sold</p>
            </div>
            <FiPackage className="text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Sales Revenue</p>
              <p className="text-3xl font-bold mt-2">{rs(soldRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">Total selling price</p>
            </div>
            <FiBattery className="text-3xl opacity-50" />
          </div>
        </div>
        <div className={`rounded-2xl p-6 text-white shadow-lg bg-gradient-to-r ${totalProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Total Profit</p>
              <p className="text-3xl font-bold mt-2">{rs(totalProfit)}</p>
              <p className="text-xs opacity-75 mt-1">Selling − Purchase</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by battery, customer, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
            />
          </div>
          <div className="flex gap-2">
            {filterBtn('all', 'All')}
            {filterBtn('in_stock', 'In Stock')}
            {filterBtn('sold', 'Sold')}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Battery</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Purchase Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Selling Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Profit</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredBatteries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No old battery records found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatteries.map((item) => {
                  const isSold = item.status === 'sold';
                  const profit = num(item.profit);
                  return (
                    <tr key={item.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(item.purchase_date || item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.battery_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-500">
                        {rs(item.trade_in_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-purple-500">
                        {isSold ? rs(item.selling_price) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isSold ? (profit >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                        {isSold ? `${profit >= 0 ? '+' : '-'} ${rs(Math.abs(profit))}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isSold ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {isSold ? 'Sold' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-sm">{item.customer_phone || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition"
                          title="Delete Record"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
              <tr>
                <td colSpan="2" className="px-4 py-3 text-right font-bold">Total:</td>
                <td className="px-4 py-3 text-right font-bold text-blue-500">{rs(footPurchase)}</td>
                <td className="px-4 py-3 text-right font-bold text-purple-500">{rs(footSelling)}</td>
                <td className={`px-4 py-3 text-right font-bold ${footProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {rs(footProfit)}
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =====================================================================
   NEW BATTERIES VIEW  (Inventory page jaisa — sirf battery products)
   ===================================================================== */

// ✅ Sirf battery wale products (BatteryPage wala hi filter)
const isBatteryProduct = (p) =>
  p?.name?.toLowerCase().includes('battery') ||
  p?.category?.toLowerCase().includes('battery');

const isHiddenProd = (p) => p?.is_hidden === true || p?.is_hidden === 1 || p?.is_hidden === '1';

// ✅ Helper: Get date range for filter (with custom date support)
const getDateRange = (filter, customDate = null) => {
  const now = new Date();
  const start = new Date();

  if (filter === 'custom' && customDate) {
    const date = new Date(customDate);
    start.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const day = now.getDay();
      const diff = (day === 0 ? 6 : day - 1);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
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

const filterProductsByDate = (products, filter, customDate = null) => {
  if (filter === 'all' || !products || products.length === 0) return products;
  const range = getDateRange(filter, customDate);
  if (!range) return products;

  return products.filter(product => {
    if (isHiddenProd(product)) return false;
    if (!product.date_added) return false;
    const prodDate = new Date(product.date_added);
    return prodDate >= range.start && prodDate <= range.end;
  });
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Date + Time formatter (e.g. 09 Oct 2026, 03:24 PM)
const formatDateTime = (value) => {
  if (!value) return { date: '-', time: '' };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { date: '-', time: '' };
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
};

// History helpers (eye button -> product history modal)
const HISTORY_FIELD_LABELS = {
  name: 'Product Name',
  purchase_price: 'Purchase Price',
  selling_price: 'Selling Price',
  quantity: 'Stock',
  low_stock_threshold: 'Low Stock Alert At',
  is_hidden: 'Visibility'
};

const HISTORY_ACTIONS = {
  created: { label: 'Product Added', dot: 'bg-green-500', badge: 'bg-green-500' },
  updated: { label: 'Updated', dot: 'bg-blue-500', badge: 'bg-blue-500' },
  hidden: { label: 'Hidden', dot: 'bg-yellow-500', badge: 'bg-yellow-500' },
  unhidden: { label: 'Unhidden', dot: 'bg-teal-500', badge: 'bg-teal-500' },
  deleted: { label: 'Deleted', dot: 'bg-red-500', badge: 'bg-red-500' }
};

const formatHistoryValue = (field, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (field === 'purchase_price' || field === 'selling_price') {
    const n = Number(value);
    return isNaN(n) ? String(value) : `Rs. ${n.toLocaleString()}`;
  }
  if (field === 'is_hidden') {
    return (value === true || value === 1 || value === '1') ? 'Hidden' : 'Visible';
  }
  return String(value);
};

// Backend `changes` can be an object { field: {old, new} } or an array [{field, old, new}]
const normalizeChanges = (changes) => {
  if (!changes) return [];
  let data = changes;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return []; }
  }
  if (Array.isArray(data)) {
    return data.map(c => ({ field: c.field, old: c.old, new: c.new }));
  }
  return Object.entries(data).map(([field, v]) => ({
    field,
    old: v?.old,
    new: v?.new
  }));
};

// ✅ Product Row Component
// Column order: S.No | Date & Time | Product | Purchase | Selling | Stock | Low Stock At | Updated At | Actions
const ProductRow = React.memo(({ product, index, darkMode, editingCell, onStartEdit, onSaveEdit, onKeyPress, onEditProduct, onDeleteProduct, onToggleHide, onViewHistory, formatPrice, isAdmin }) => {
  const isEditingName = editingCell.productId === product.id && editingCell.field === 'name';
  const isEditingPurchase = editingCell.productId === product.id && editingCell.field === 'purchasePrice';
  const isEditingSelling = editingCell.productId === product.id && editingCell.field === 'sellingPrice';
  const isEditingQuantity = editingCell.productId === product.id && editingCell.field === 'quantity';
  const isEditingThreshold = editingCell.productId === product.id && editingCell.field === 'lowStockThreshold';
  const isHidden = isHiddenProd(product);

  const threshold = product.low_stock_threshold ?? 5;

  const addedAt = formatDateTime(product.created_at || product.date_added);
  const updatedAt = formatDateTime(product.updated_at || product.created_at || product.date_added);

  return (
    <tr className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} ${isHidden ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''}`}>
      {/* S.NO */}
      <td className="px-6 py-4">
        <span className={`font-semibold text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{index + 1}</span>
      </td>

      {/* DATE & TIME */}
      <td className="px-6 py-4 text-sm">
        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{addedAt.date}</div>
        <div className="text-xs text-gray-400">{addedAt.time}</div>
      </td>

      {/* PRODUCT */}
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

      {/* PURCHASE PRICE (Admin only) */}
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

      {/* SELLING PRICE (Admin only) */}
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

      {/* STOCK */}
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
              product.quantity < threshold && product.quantity > 0 ? 'text-yellow-500' :
              product.quantity === 0 ? 'text-red-500' :
              darkMode ? 'text-white' : 'text-gray-900'
            } hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition`}
            title={`Double-click to edit stock (Low stock at: ${threshold})`}
          >
            {product.quantity}
            {product.quantity < threshold && product.quantity > 0 && <FiAlertCircle className="text-xs" title={`Low stock! Below ${threshold}`} />}
            {product.quantity === 0 && <FiX className="text-xs" title="Out of stock!" />}
          </div>
        )}
      </td>

      {/* LOW STOCK AT (Admin only) */}
      {isAdmin && (
        <td className="px-6 py-4">
          {isEditingThreshold ? (
            <input
              type="number"
              value={editingCell.value}
              onChange={(e) => onStartEdit({ ...editingCell, value: e.target.value })}
              onBlur={() => onSaveEdit(product.id, 'lowStockThreshold')}
              onKeyDown={(e) => onKeyPress(e, product.id, 'lowStockThreshold')}
              className={`w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
              autoFocus
              min="0"
            />
          ) : (
            <div
              onDoubleClick={() => onStartEdit({ productId: product.id, field: 'lowStockThreshold', value: product.low_stock_threshold ?? 5 })}
              className={`cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition w-fit`}
              title="Double-click to edit low stock alert level"
            >
              {product.low_stock_threshold ?? 5}
            </div>
          )}
        </td>
      )}

      {/* UPDATED AT */}
      <td className="px-6 py-4 text-sm">
        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{updatedAt.date}</div>
        <div className="text-xs text-gray-400">{updatedAt.time}</div>
      </td>

      {/* ACTIONS */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 flex-wrap">
          {isAdmin && (
            <>
              <button
                onClick={() => onViewHistory(product)}
                className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition flex items-center gap-1 shadow-md"
                title="View History"
              >
                <FiEye className="text-sm" />
              </button>
              <button
                onClick={() => onEditProduct(product)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-1 shadow-md"
              >
                <FiEdit2 className="text-xs" /> Edit
              </button>
              <button
                onClick={() => onToggleHide(product)}
                className={`px-3 py-1 rounded-lg text-sm transition flex items-center gap-1 shadow-md ${
                  isHidden
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
                title={isHidden ? "Unhide Product" : "Hide Product"}
              >
                {isHidden ? <FiEye className="text-xs" /> : <FiEyeOff className="text-xs" />}
                {isHidden ? 'Unhide' : 'Hide'}
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

// Empty form state - shared shape for reset points
const emptyFormData = {
  name: '',
  purchasePrice: '',
  sellingPrice: '',
  quantity: '',
  lowStockThreshold: 5
};

const NewBatteriesView = ({ darkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [sortOption, setSortOption] = useState('default');

  const [filteredStats, setFilteredStats] = useState({
    totalPurchase: 0,
    totalSelling: 0,
    totalProfit: 0
  });

  const [formData, setFormData] = useState({ ...emptyFormData });
  const [viewMode, setViewMode] = useState('active');
  const [editingCell, setEditingCell] = useState({ productId: null, field: null, value: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product history modal (eye button)
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        setIsAdmin(userData.role === 'admin');
      }
    } catch (e) {
      setIsAdmin(false);
    }
  }, []);

  // ✅ Sirf battery products
  const batteryProducts = useMemo(() => products.filter(isBatteryProduct), [products]);

  const filteredProducts = useMemo(() => {
    let filtered = batteryProducts;

    if (viewMode === 'active') {
      filtered = filtered.filter(product => !isHiddenProd(product));
    } else if (viewMode === 'hidden') {
      filtered = filtered.filter(product => isHiddenProd(product));
    }

    filtered = filterProductsByDate(filtered, timeFilter, customDate || null);

    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOption !== 'default') {
      filtered = [...filtered];
      switch (sortOption) {
        case 'name-asc':
          filtered.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
          break;
        case 'name-desc':
          filtered.sort((a, b) => b.name?.localeCompare(a.name || '') || 0);
          break;
        case 'price-asc':
          filtered.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
          break;
        case 'price-desc':
          filtered.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [batteryProducts, searchTerm, viewMode, timeFilter, customDate, sortOption]);

  const summaryTotals = useMemo(() => {
    const data = filteredProducts;

    const totalStock = data.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalPurchaseValue = data.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0);
    const totalSellingValue = data.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.quantity || 0)), 0);
    const totalProfit = data.reduce((sum, p) => sum + (((p.selling_price || 0) - (p.purchase_price || 0)) * (p.quantity || 0)), 0);

    return { totalStock, totalPurchaseValue, totalSellingValue, totalProfit };
  }, [filteredProducts]);

  const calculateFilteredStats = useCallback((productsList, filter, customDateVal = null) => {
    const range = getDateRange(filter, customDateVal);
    if (!range || filter === 'all') {
      return productsList.reduce((acc, product) => {
        if (isHiddenProd(product)) return acc;
        acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
        acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
        acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
        return acc;
      }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
    }

    const filtered = productsList.filter(product => {
      if (isHiddenProd(product)) return false;
      if (!product.date_added) return false;
      const prodDate = new Date(product.date_added);
      return prodDate >= range.start && prodDate <= range.end;
    });

    return filtered.reduce((acc, product) => {
      acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
      acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
      acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
  }, []);

  useEffect(() => {
    const stats = calculateFilteredStats(batteryProducts, timeFilter, customDate || null);
    setFilteredStats(stats);
  }, [batteryProducts, timeFilter, customDate, calculateFilteredStats]);

  const getFilterLabel = () => {
    const labels = {
      all: 'All Time',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      custom: `Custom: ${customDate || 'Select Date'}`
    };
    return labels[timeFilter] || 'All Time';
  };

  const getStatsLabelText = () => {
    const labels = {
      all: 'Total',
      today: "Today's",
      week: "This Week's",
      month: "This Month's",
      year: "This Year's",
      custom: `Custom (${customDate})`
    };
    return labels[timeFilter] || 'Total';
  };

  const getSortLabel = () => {
    const labels = {
      'default': 'Default',
      'name-asc': 'A → Z',
      'name-desc': 'Z → A',
      'price-asc': 'Price: Low → High',
      'price-desc': 'Price: High → Low'
    };
    return labels[sortOption] || 'Default';
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/products', {
        params: { show_hidden: 'true' }
      });

      let productsData = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }

      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handleCustomDateChange = (e) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      setTimeFilter('custom');
    }
  };

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
    const isCurrentlyHidden = isHiddenProd(product);
    const newHiddenStatus = isCurrentlyHidden ? 0 : 1;
    const action = newHiddenStatus === 1 ? 'hide' : 'unhide';

    try {
      await api.patch(`/products/${product.id}`, {
        is_hidden: newHiddenStatus
      });

      await fetchProducts();
      toast.success(`Product ${action}${action === 'hide' ? 'den' : 'ned'} successfully!`);

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

  // ✅ Export to Excel — order: S.No | Date & Time | Product | Purchase | Selling | Stock | Low Stock | Updated At | Status
  const exportToExcel = useCallback((data, filename) => {
    const exportData = data.map((p, i) => ({
      'S.No': i + 1,
      'Date & Time': (() => { const t = formatDateTime(p.created_at || p.date_added); return `${t.date} ${t.time}`.trim(); })(),
      'Product': p.name,
      ...(isAdmin && { 'Purchase Price': `Rs. ${(p.purchase_price || 0).toLocaleString()}` }),
      ...(isAdmin && { 'Selling Price': `Rs. ${(p.selling_price || 0).toLocaleString()}` }),
      'Stock': p.quantity || 0,
      ...(isAdmin && { 'Low Stock At': p.low_stock_threshold ?? 5 }),
      'Updated At': (() => { const t = formatDateTime(p.updated_at || p.created_at || p.date_added); return `${t.date} ${t.time}`.trim(); })(),
      'Status': isHiddenProd(p) ? 'Hidden' : 'Active'
    }));

    exportData.push({
      'S.No': '',
      'Date & Time': '-',
      'Product': '📊 TOTAL',
      ...(isAdmin && { 'Purchase Price': `Rs. ${summaryTotals.totalPurchaseValue.toLocaleString()}` }),
      ...(isAdmin && { 'Selling Price': `Rs. ${summaryTotals.totalSellingValue.toLocaleString()}` }),
      'Stock': summaryTotals.totalStock,
      ...(isAdmin && { 'Low Stock At': '-' }),
      'Updated At': '-',
      'Status': ''
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'New_Batteries');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Exported to Excel');
  }, [isAdmin, summaryTotals]);

  // ✅ Export to PDF — same order as the table
  const exportToPDF = useCallback((data, title) => {
    const doc = new jsPDF('landscape');
    doc.text(title, 14, 10);

    const head = ['S.No', 'Date & Time', 'Product'];
    if (isAdmin) head.push('Purchase Price', 'Selling Price');
    head.push('Stock');
    if (isAdmin) head.push('Low Stock At');
    head.push('Updated At');
    head.push('Status');

    const body = data.map((p, i) => {
      const t = formatDateTime(p.created_at || p.date_added);
      const row = [i + 1, `${t.date} ${t.time}`.trim(), p.name || ''];
      if (isAdmin) row.push(`Rs. ${(p.purchase_price || 0).toLocaleString()}`, `Rs. ${(p.selling_price || 0).toLocaleString()}`);
      row.push(p.quantity || 0);
      if (isAdmin) row.push(p.low_stock_threshold ?? 5);
      const u = formatDateTime(p.updated_at || p.created_at || p.date_added);
      row.push(`${u.date} ${u.time}`.trim());
      row.push(isHiddenProd(p) ? 'Hidden' : 'Active');
      return row;
    });

    const summaryRow = ['', '-', 'TOTAL'];
    if (isAdmin) {
      summaryRow.push(`Rs. ${summaryTotals.totalPurchaseValue.toLocaleString()}`);
      summaryRow.push(`Rs. ${summaryTotals.totalSellingValue.toLocaleString()}`);
    }
    summaryRow.push(summaryTotals.totalStock);
    if (isAdmin) summaryRow.push('-');
    summaryRow.push('-');
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setFormData({
      ...emptyFormData,
      name: product.name,
      purchasePrice: product.purchase_price,
      sellingPrice: product.selling_price,
      quantity: product.quantity,
      lowStockThreshold: product.low_stock_threshold ?? 5
    });
    setIsModalOpen(true);
  }, []);

  const handleUpdateSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

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

      setIsSubmitting(true);
      try {
        const success = await handleUpdateProduct(editingProduct.id, { quantity: quantityNum });
        if (success) {
          setFormData({ ...emptyFormData });
          setEditingProduct(null);
          setIsModalOpen(false);
        }
      } finally {
        setIsSubmitting(false);
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
    const thresholdNum = parseInt(formData.lowStockThreshold) || 5;

    if (isNaN(purchasePriceNum) || isNaN(sellingPriceNum) || isNaN(quantityNum) || isNaN(thresholdNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    if (purchasePriceNum < 0 || sellingPriceNum < 0 || quantityNum < 0 || thresholdNum < 0) {
      toast.error('Values cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await handleUpdateProduct(editingProduct.id, {
        name: formData.name,
        purchase_price: purchasePriceNum,
        selling_price: sellingPriceNum,
        quantity: quantityNum,
        low_stock_threshold: thresholdNum
      });

      if (success) {
        setFormData({ ...emptyFormData });
        setEditingProduct(null);
        setIsModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingProduct, handleUpdateProduct, isAdmin, isSubmitting]);

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
    } else if (field === 'quantity' || field === 'lowStockThreshold') {
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
      quantity: productToUpdate.quantity,
      low_stock_threshold: productToUpdate.low_stock_threshold ?? 5
    };

    if (field === 'name') updateData.name = newValue;
    else if (field === 'quantity') updateData.quantity = newValue;
    else if (field === 'purchasePrice') updateData.purchase_price = newValue;
    else if (field === 'sellingPrice') updateData.selling_price = newValue;
    else if (field === 'lowStockThreshold') updateData.low_stock_threshold = newValue;

    try {
      await api.put(`/products/${productId}`, updateData);
      await fetchProducts();

      const successMessage = {
        name: 'Product name updated successfully!',
        quantity: 'Stock updated successfully!',
        purchasePrice: 'Purchase price updated successfully!',
        sellingPrice: 'Selling price updated successfully!',
        lowStockThreshold: 'Low stock alert level updated!'
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
    let filtered = batteryProducts;
    if (viewMode === 'active') {
      filtered = filtered.filter(p => !isHiddenProd(p));
    } else if (viewMode === 'hidden') {
      filtered = filtered.filter(p => isHiddenProd(p));
    }
    filtered = filterProductsByDate(filtered, timeFilter, customDate || null);
    return filtered.length;
  };

  const getViewModeText = () => {
    if (viewMode === 'active') return 'active';
    if (viewMode === 'hidden') return 'hidden';
    return 'all';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ ...emptyFormData });
    setIsSubmitting(false);
  };

  // Open history modal + fetch product history from backend
  const openHistory = useCallback(async (product) => {
    setHistoryProduct(product);
    setHistoryEntries([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const response = await api.get(`/products/${product.id}/history`);
      const raw = response.data?.success && Array.isArray(response.data.data)
        ? response.data.data
        : (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []));
      const sorted = [...raw].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistoryEntries(sorted);
    } catch (error) {
      console.error('Error fetching product history:', error);
      if (error.response?.status === 404) {
        setHistoryError('History ka backend abhi set nahi hua (route / table baqi hai).');
      } else {
        setHistoryError(error.response?.data?.message || 'History load nahi ho saki');
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryProduct(null);
    setHistoryEntries([]);
    setHistoryError('');
    setHistoryLoading(false);
  }, []);

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading batteries...</p>
        </div>
      </div>
    );
  }

  const filterBtnClass = (active) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      active
        ? 'bg-red-500 text-white shadow-md'
        : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  const thClass = `px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`;

  return (
    <div className="space-y-6">
      {/* FILTER BUTTONS */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiCalendar className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
        </div>
        <button onClick={() => { setTimeFilter('all'); setShowCustomDate(false); }} className={filterBtnClass(timeFilter === 'all')}>All Time</button>
        <button onClick={() => { setTimeFilter('today'); setShowCustomDate(false); }} className={filterBtnClass(timeFilter === 'today')}>Today</button>
        <button onClick={() => { setTimeFilter('week'); setShowCustomDate(false); }} className={filterBtnClass(timeFilter === 'week')}>This Week</button>
        <button onClick={() => { setTimeFilter('month'); setShowCustomDate(false); }} className={filterBtnClass(timeFilter === 'month')}>This Month</button>
        <button onClick={() => { setTimeFilter('year'); setShowCustomDate(false); }} className={filterBtnClass(timeFilter === 'year')}>This Year</button>
        <button onClick={() => setShowCustomDate(!showCustomDate)} className={filterBtnClass(timeFilter === 'custom')}>📅 Custom Date</button>

        {showCustomDate && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDate}
              onChange={handleCustomDateChange}
              className={`px-3 py-2 rounded-lg text-sm border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            />
            {customDate && (
              <button
                onClick={() => { setCustomDate(''); setTimeFilter('all'); setShowCustomDate(false); }}
                className="text-red-500 text-sm hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getFilterLabel()}</strong>
        </span>
      </div>

      {/* SORTING BUTTONS */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiArrowUp className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sort by:</span>
        </div>
        <button onClick={() => setSortOption('default')} className={filterBtnClass(sortOption === 'default')}>Default</button>
        <button onClick={() => setSortOption('name-asc')} className={`${filterBtnClass(sortOption === 'name-asc')} flex items-center gap-1`}>
          <FiArrowUp className="text-xs" /> A → Z
        </button>
        <button onClick={() => setSortOption('name-desc')} className={`${filterBtnClass(sortOption === 'name-desc')} flex items-center gap-1`}>
          <FiArrowDown className="text-xs" /> Z → A
        </button>
        <button onClick={() => setSortOption('price-asc')} className={filterBtnClass(sortOption === 'price-asc')}>Price: Low → High</button>
        <button onClick={() => setSortOption('price-desc')} className={filterBtnClass(sortOption === 'price-desc')}>Price: High → Low</button>
        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Sorting: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getSortLabel()}</strong>
        </span>
      </div>

      {/* STATISTICS CARDS */}
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

      {/* MAIN TABLE */}
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
                  viewMode === 'active' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FiEye className="text-sm" />
                Active
              </button>

              <button
                onClick={() => setViewMode('hidden')}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'hidden' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FiEyeOff className="text-sm" />
                Hidden
              </button>

              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'all' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                All
              </button>

              <button onClick={() => exportToExcel(filteredProducts, 'New_Batteries_Inventory')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-2 shadow-md">
                <FiFileText className="text-sm" /> Excel
              </button>
              <button onClick={() => exportToPDF(filteredProducts, 'New_Batteries_Inventory')} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2 shadow-md">
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
                <th className={thClass}>S.No</th>
                <th className={thClass}>Date & Time</th>
                <th className={thClass}>
                  Product
                  {sortOption === 'name-asc' && <FiArrowUp className="inline ml-1 text-red-500" />}
                  {sortOption === 'name-desc' && <FiArrowDown className="inline ml-1 text-red-500" />}
                </th>
                {isAdmin && <th className={thClass}>Purchase Price</th>}
                {isAdmin && (
                  <th className={thClass}>
                    Selling Price
                    {sortOption === 'price-asc' && <FiArrowUp className="inline ml-1 text-red-500" />}
                    {sortOption === 'price-desc' && <FiArrowDown className="inline ml-1 text-red-500" />}
                  </th>
                )}
                <th className={thClass}>Stock</th>
                {isAdmin && <th className={thClass}>Low Stock At</th>}
                <th className={thClass}>Updated At</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiPackage className="text-5xl text-gray-400" />
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {searchTerm ? `No products found matching "${searchTerm}"` :
                         viewMode === 'active' ? 'No active batteries found.' :
                         viewMode === 'hidden' ? 'No hidden batteries found.' :
                         'No batteries added yet.'}
                      </p>
                      {viewMode === 'active' && (
                        <button onClick={() => setViewMode('all')} className="text-sm text-blue-500 hover:text-blue-600 underline">
                          Check all products?
                        </button>
                      )}
                      {viewMode === 'hidden' && (
                        <button onClick={() => setViewMode('active')} className="text-sm text-blue-500 hover:text-blue-600 underline">
                          Check active products?
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredProducts.map((product, index) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      index={index}
                      darkMode={darkMode}
                      editingCell={editingCell}
                      onStartEdit={startInlineEdit}
                      onSaveEdit={saveInlineEdit}
                      onKeyPress={handleKeyPress}
                      onEditProduct={handleEditProduct}
                      onDeleteProduct={handleDeleteProduct}
                      onToggleHide={handleToggleHide}
                      onViewHistory={openHistory}
                      formatPrice={formatPrice}
                      isAdmin={isAdmin}
                    />
                  ))}

                  {/* SUMMARY ROW */}
                  <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-400'}`}>
                    {/* S.No */}
                    <td className="px-6 py-3"><span className="text-xs text-gray-400"></span></td>

                    {/* Date & Time */}
                    <td className="px-6 py-3"><span className="text-xs text-gray-400">-</span></td>

                    {/* Product -> TOTAL label */}
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

                    {isAdmin && (
                      <td className="px-6 py-3"><span className="text-xs text-gray-400">-</span></td>
                    )}

                    {/* Updated At */}
                    <td className="px-6 py-3"><span className="text-xs text-gray-400">-</span></td>

                    {/* Actions */}
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

        {/* SUMMARY CARD */}
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
                    <span className="text-sm font-semibold text-blue-500">Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Selling:</span>
                    <span className="text-sm font-semibold text-red-500">Rs. {summaryTotals.totalSellingValue.toLocaleString()}</span>
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

      {/* Add/Edit Product Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">
                Edit Product
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Low Stock Alert At
                  <span className="text-xs ml-1 opacity-60">(Default: 5)</span>
                </label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                  placeholder="Alert when stock below"
                  min="0"
                  disabled={isSubmitting}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  ⚠️ UI alert only - No email will be sent
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <FiLoader className="text-sm animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="text-sm" />
                      Update Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product History Modal (eye button) */}
      {historyProduct && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-start`}>
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <FiEye className="text-purple-500" /> Product History
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{historyProduct.name}</p>
              </div>
              <button onClick={closeHistory} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {historyLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <FiLoader className="text-3xl text-purple-500 animate-spin" />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading history...</p>
                </div>
              ) : historyError ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <FiAlertCircle className="text-4xl text-red-500" />
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{historyError}</p>
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <FiPackage className="text-4xl text-gray-400" />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Abhi tak koi history record nahi hui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyEntries.map((entry, idx) => {
                    const cfg = HISTORY_ACTIONS[entry.action] || { label: entry.action || 'Change', dot: 'bg-gray-500', badge: 'bg-gray-500' };
                    const when = formatDateTime(entry.created_at);
                    const changes = normalizeChanges(entry.changes);
                    return (
                      <div key={entry.id ?? idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`w-3 h-3 rounded-full mt-1.5 ${cfg.dot}`}></span>
                          {idx < historyEntries.length - 1 && (
                            <span className={`w-px flex-1 mt-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
                          )}
                        </div>
                        <div className={`flex-1 p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-xs text-white px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{when.date} • {when.time}</span>
                          </div>
                          {entry.user_name && (
                            <p className={`text-xs mt-1 flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiUser className="text-xs" /> {entry.user_name}
                            </p>
                          )}
                          {changes.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {changes.map((c, i) => (
                                <li key={i} className="text-sm flex flex-wrap items-center gap-1">
                                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {HISTORY_FIELD_LABELS[c.field] || c.field}:
                                  </span>
                                  {entry.action === 'created' || c.old === null || c.old === undefined ? (
                                    <span className="text-green-500 font-semibold">{formatHistoryValue(c.field, c.new)}</span>
                                  ) : (
                                    <>
                                      <span className="text-red-500 line-through">{formatHistoryValue(c.field, c.old)}</span>
                                      <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>→</span>
                                      <span className="text-green-500 font-semibold">{formatHistoryValue(c.field, c.new)}</span>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={closeHistory}
                className={`w-full px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =====================================================================
   MAIN PAGE — Old Battery / New Battery / New Battery Sales Overview
   ===================================================================== */
const OldBatteries = ({ darkMode }) => {
  const [activeView, setActiveView] = useState('old'); // 'old' | 'new' | 'overview'

  const tabClass = (key, activeColor) =>
    `px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
      activeView === key
        ? `${activeColor} text-white shadow-md`
        : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Switch */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button onClick={() => setActiveView('old')} className={tabClass('old', 'bg-red-500')}>
          <FiBattery /> Old Battery
        </button>
        <button onClick={() => setActiveView('new')} className={tabClass('new', 'bg-red-500')}>
          <FiPackage /> New Battery
        </button>
        <button onClick={() => setActiveView('overview')} className={tabClass('overview', 'bg-red-500')}>
          <FiBarChart2 /> New Battery Sales Overview
        </button>
      </div>

      {activeView === 'old' && <OldBatteriesView darkMode={darkMode} />}
      {activeView === 'new' && <NewBatteriesView darkMode={darkMode} />}
      {activeView === 'overview' && <BatteryOverview darkMode={darkMode} />}
    </div>
  );
};

export default OldBatteries;