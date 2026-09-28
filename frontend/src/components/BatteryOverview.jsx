// src/components/BatteryOverview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiDollarSign, FiPackage, FiTrendingUp, FiTrendingDown, FiClock, FiBattery, FiDownload, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

const getTodayKarachiStr = () => {
  return new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
};

const getWeekStartKarachi = () => {
  const today = getTodayKarachi();
  const day = today.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getMonthStartKarachi = () => {
  const today = getTodayKarachi();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getYearStartKarachi = () => {
  const today = getTodayKarachi();
  const start = new Date(today.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

// ✅ Format date in Karachi timezone
const formatDateKarachi = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi'
  });
};

const BatteryOverview = ({ darkMode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getTodayKarachi().getFullYear());
  const [batterySales, setBatterySales] = useState({
    today: { total: 0, count: 0, items: 0, profit: 0 },
    week: { total: 0, count: 0, items: 0, profit: 0 },
    month: { total: 0, count: 0, items: 0, profit: 0 },
    year: { total: 0, count: 0, items: 0, profit: 0 },
    all: { total: 0, count: 0, items: 0, profit: 0 },
    custom: { total: 0, count: 0, items: 0, profit: 0 }
  });
  const [recentSales, setRecentSales] = useState([]);
  const [yearlyData, setYearlyData] = useState({ total: 0, count: 0, items: 0, profit: 0, details: [] });

  // ✅ Battery filter function
  // Old battery KHAREEDNA (Trade-in) sale nahi hai — skip.
  // Old battery BECHNA ('Old Battery Sale') sale hai — include.
  const isBatteryItem = (item) => {
    if (!item) return false;
    if (item.service_category === 'Trade-in') return false;
    return (
      item.service_category === 'Battery' ||
      item.service_category === 'Old Battery Sale' ||
      item.service_name?.toLowerCase().includes('battery')
    );
  };

  const getBatteryItems = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item => isBatteryItem(item));
  };

  // ✅ Calculate the FINAL invoice total for battery items — subtracts
  // any trade-in discount that was applied on the Battery Sale page.
  const calculateInvoiceBatteryTotal = (inv, batteryItems, rawItemsTotal) => {
    const invDiscount = parseFloat(inv.discount) || 0;
    const isOldBatterySale = batteryItems.some(item => item.service_category === 'Old Battery Sale');
    const isTradeInOnlyInvoice = batteryItems.some(item => item.service_category === 'Trade-in');

    if (isOldBatterySale || isTradeInOnlyInvoice || invDiscount <= 0) {
      return rawItemsTotal;
    }

    return Math.max(0, rawItemsTotal - invDiscount);
  };

  // ✅ Ek invoice ka total / items / profit.
  // Old battery sale ka profit old_batteries table se aata hai (sell - purchase).
  const calcInvoiceStats = (inv, batteryItems, productsMap, oldProfitMap) => {
    let rawTotal = 0, invProfit = 0, invItems = 0;
    const isOldSale = batteryItems.some(i => i.service_category === 'Old Battery Sale');

    batteryItems.forEach(item => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      rawTotal += price * qty;
      invItems += qty;

      if (!isOldSale) {
        const product = productsMap.get(item.service_name);
        const purchasePrice = product ? (parseFloat(product.purchase_price) || 0) : 0;
        invProfit += product ? (price - purchasePrice) * qty : price * qty;
      }
    });

    if (isOldSale) {
      invProfit = oldProfitMap.get(inv.invoice_no) || 0; // e.g. 100 - 98 = 2
    }

    const invTotal = calculateInvoiceBatteryTotal(inv, batteryItems, rawTotal);
    return { invTotal, invProfit, invItems };
  };

  // ✅ Get date range for custom filter - WITH KARACHI TIMEZONE
  const getDateRange = (filter, customDateValue = null) => {
    const now = getTodayKarachi();
    const start = new Date(now);

    if (filter === 'custom' && customDateValue) {
      const date = new Date(customDateValue);
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

  // ✅ Fetch battery sales
  const fetchBatterySales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [invoicesRes, productsRes, oldRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/products'),
        api.get('/old-batteries', { params: { status: 'sold' } }).catch(() => ({ data: [] }))
      ]);

      // ✅ Products
      let products = [];
      if (productsRes.data?.success && Array.isArray(productsRes.data.data)) {
        products = productsRes.data.data;
      } else if (Array.isArray(productsRes.data)) {
        products = productsRes.data;
      } else {
        products = [];
      }

      // ✅ Invoices
      let invoices = [];
      if (Array.isArray(invoicesRes.data)) {
        invoices = invoicesRes.data;
      } else if (invoicesRes.data?.data && Array.isArray(invoicesRes.data.data)) {
        invoices = invoicesRes.data.data;
      } else {
        invoices = [];
      }

      // ✅ Old battery profit map: invoice_no -> profit
      const oldSold = Array.isArray(oldRes.data) ? oldRes.data : (oldRes.data?.data || []);
      const oldProfitMap = new Map();
      oldSold.forEach(b => {
        if (!b.sold_invoice_no) return;
        oldProfitMap.set(
          b.sold_invoice_no,
          (oldProfitMap.get(b.sold_invoice_no) || 0) + (parseFloat(b.profit) || 0)
        );
      });

      // Create products map for profit calculation
      const productsMap = new Map();
      products.forEach(p => {
        productsMap.set(p.name, p);
      });

      // Filter battery sales
      const batteryInvoices = invoices.filter(inv => {
        if (!inv.items) return false;
        return inv.items.some(item => isBatteryItem(item));
      });

      // ✅ Use Karachi timezone for calculations
      const todayStr = getTodayKarachiStr();
      const weekStart = getWeekStartKarachi();
      const monthStart = getMonthStartKarachi();
      const yearStart = getYearStartKarachi();

      let todayTotal = 0, todayCount = 0, todayItems = 0, todayProfit = 0;
      let weekTotal = 0, weekCount = 0, weekItems = 0, weekProfit = 0;
      let monthTotal = 0, monthCount = 0, monthItems = 0, monthProfit = 0;
      let yearTotal = 0, yearCount = 0, yearItems = 0, yearProfit = 0;
      let allTotal = 0, allCount = 0, allItems = 0, allProfit = 0;
      let customTotal = 0, customCount = 0, customItems = 0, customProfit = 0;
      let recent = [];

      // ✅ Custom date filter
      const customRange = timeFilter === 'custom' && customDate ? getDateRange('custom', customDate) : null;

      batteryInvoices.forEach(inv => {
        const invDate = getKarachiDate(inv.invoice_date);
        if (!invDate) return;

        const batteryItems = getBatteryItems(inv.items);
        if (batteryItems.length === 0) return;

        const { invTotal, invProfit, invItems } = calcInvoiceStats(inv, batteryItems, productsMap, oldProfitMap);

        const detail = {
          invoiceNo: inv.invoice_no,
          customer: inv.customer_name || 'Walk-in',
          date: inv.invoice_date,
          total: invTotal,
          profit: invProfit,
          items: invItems,
          batteryItems: batteryItems
        };

        recent.push(detail);

        allTotal += invTotal;
        allItems += invItems;
        allProfit += invProfit;
        allCount++;

        if (invDate >= yearStart) {
          yearTotal += invTotal;
          yearItems += invItems;
          yearProfit += invProfit;
          yearCount++;
        }

        if (invDate >= monthStart) {
          monthTotal += invTotal;
          monthItems += invItems;
          monthProfit += invProfit;
          monthCount++;
        }

        if (invDate >= weekStart) {
          weekTotal += invTotal;
          weekItems += invItems;
          weekProfit += invProfit;
          weekCount++;
        }

        const invDateStr = invDate.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
        if (invDateStr === todayStr) {
          todayTotal += invTotal;
          todayItems += invItems;
          todayProfit += invProfit;
          todayCount++;
        }

        // ✅ Custom date check
        if (customRange) {
          if (invDate >= customRange.start && invDate <= customRange.end) {
            customTotal += invTotal;
            customItems += invItems;
            customProfit += invProfit;
            customCount++;
          }
        }
      });

      recent.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentSales(recent.slice(0, 10));

      setBatterySales({
        today: { total: todayTotal, count: todayCount, items: todayItems, profit: todayProfit },
        week: { total: weekTotal, count: weekCount, items: weekItems, profit: weekProfit },
        month: { total: monthTotal, count: monthCount, items: monthItems, profit: monthProfit },
        year: { total: yearTotal, count: yearCount, items: yearItems, profit: yearProfit },
        all: { total: allTotal, count: allCount, items: allItems, profit: allProfit },
        custom: { total: customTotal, count: customCount, items: customItems, profit: customProfit }
      });

      // ✅ Yearly data with Karachi timezone
      const yearInvoices = batteryInvoices.filter(inv => {
        if (!inv.invoice_date) return false;
        const invDate = getKarachiDate(inv.invoice_date);
        return invDate && invDate.getFullYear() === selectedYear;
      });

      let yearlyTotal = 0, yearlyCount = 0, yearlyItems = 0, yearlyProfit = 0, yearlyDetails = [];

      yearInvoices.forEach(inv => {
        const batteryItems = getBatteryItems(inv.items);
        if (batteryItems.length === 0) return;

        const { invTotal, invProfit, invItems } = calcInvoiceStats(inv, batteryItems, productsMap, oldProfitMap);

        yearlyTotal += invTotal;
        yearlyItems += invItems;
        yearlyProfit += invProfit;
        yearlyCount++;
        yearlyDetails.push({
          invoiceNo: inv.invoice_no,
          customer: inv.customer_name || 'Walk-in',
          date: inv.invoice_date,
          total: invTotal,
          profit: invProfit,
          items: invItems,
          batteryItems: batteryItems
        });
      });

      setYearlyData({
        total: yearlyTotal,
        count: yearlyCount,
        items: yearlyItems,
        profit: yearlyProfit,
        details: yearlyDetails
      });

    } catch (err) {
      console.error('Error fetching battery sales:', err);
      setError('Failed to load battery sales data');
      toast.error('Failed to load battery sales');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, timeFilter, customDate]);

  useEffect(() => {
    fetchBatterySales();
  }, [fetchBatterySales]);

  const getCurrentSales = () => {
    switch (timeFilter) {
      case 'today': return batterySales.today;
      case 'week': return batterySales.week;
      case 'month': return batterySales.month;
      case 'year': return batterySales.year;
      case 'custom': return batterySales.custom;
      default: return batterySales.all;
    }
  };

  const getFilterLabel = () => {
    const labels = {
      all: 'All Time',
      today: 'Today (Karachi Time)',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      custom: customDate ? `Custom: ${new Date(customDate).toLocaleDateString()}` : 'Custom Date'
    };
    return labels[timeFilter] || 'All Time';
  };

  // ✅ Handle custom date change
  const handleCustomDateChange = (e) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      setTimeFilter('custom');
      setShowCustomDate(true);
    }
  };

  // ✅ Toggle custom date picker
  const toggleCustomDate = () => {
    setShowCustomDate(!showCustomDate);
  };

  // ✅ Clear custom date
  const clearCustomDate = () => {
    setCustomDate('');
    setTimeFilter('all');
    setShowCustomDate(false);
  };

  // ✅ Export to Excel
  const exportToExcel = () => {
    if (yearlyData.details.length === 0) {
      toast.error('No battery sales data available for export');
      return;
    }

    const exportData = [];
    yearlyData.details.forEach(inv => {
      inv.batteryItems.forEach(item => {
        exportData.push({
          'Invoice #': inv.invoiceNo,
          'Customer': inv.customer,
          'Date': formatDateKarachi(inv.date),
          'Battery': item.service_name,
          'Quantity': item.quantity,
          'Price': `Rs. ${item.price.toLocaleString()}`,
          'Final Total (after trade-in)': `Rs. ${inv.total.toLocaleString()}`
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Battery_Sales_${selectedYear}`);
    XLSX.writeFile(wb, `Battery_Sales_${selectedYear}.xlsx`);
    toast.success('Exported to Excel successfully!');
  };

  // ✅ Export to PDF
  const exportToPDF = () => {
    if (yearlyData.details.length === 0) {
      toast.error('No battery sales data available for export');
      return;
    }

    const doc = new jsPDF('landscape');
    doc.text(`Battery Sales Report - ${selectedYear}`, 14, 10);

    const tableData = [];
    yearlyData.details.forEach(inv => {
      inv.batteryItems.forEach(item => {
        tableData.push([
          inv.invoiceNo,
          inv.customer,
          formatDateKarachi(inv.date),
          item.service_name,
          item.quantity,
          `Rs. ${item.price.toLocaleString()}`,
          `Rs. ${inv.total.toLocaleString()}`
        ]);
      });
    });

    doc.autoTable({
      head: [['Invoice', 'Customer', 'Date', 'Battery', 'Qty', 'Price', 'Final Total']],
      body: tableData,
      startY: 20,
    });
    doc.save(`Battery_Sales_${selectedYear}.pdf`);
    toast.success('Exported to PDF successfully!');
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading battery sales...</p>
        </div>
      </div>
    );
  }

  const currentSales = getCurrentSales();

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Filter Buttons with Custom Date */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiCalendar className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
        </div>
        {['all', 'today', 'week', 'month', 'year'].map((filter) => (
          <button
            key={filter}
            onClick={() => { setTimeFilter(filter); setShowCustomDate(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              timeFilter === filter
                ? 'bg-red-500 text-white shadow-md'
                : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' ? 'All Time' : filter}
          </button>
        ))}

        {/* ✅ Custom Date Button */}
        <button
          onClick={toggleCustomDate}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            timeFilter === 'custom'
              ? 'bg-red-500 text-white shadow-md'
              : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📅 Custom Date
        </button>

        {/* ✅ Custom Date Input */}
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
                onClick={clearCustomDate}
                className="text-red-500 text-sm hover:text-red-600"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getFilterLabel()}</strong>
          <span className="ml-2 text-green-500">(Karachi Time)</span>
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Total Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {currentSales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{currentSales.count} invoices</p>
            </div>
            <FiDollarSign className="text-3xl opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Batteries Sold</p>
              <p className="text-3xl font-bold mt-2">{currentSales.items}</p>
              <p className="text-xs opacity-75 mt-1">Units</p>
            </div>
            <FiPackage className="text-3xl opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Total Profit</p>
              <p className="text-3xl font-bold mt-2">Rs. {currentSales.profit.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">From battery sales</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FiClock className="text-blue-500" /> Today's Battery Sales
            <span className="text-xs text-green-500">(Karachi Time)</span>
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Sales</span>
              <span className="font-bold">Rs. {batterySales.today.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Batteries</span>
              <span className="font-bold">{batterySales.today.items}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Profit</span>
              <span className="font-bold text-green-500">Rs. {batterySales.today.profit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FiTrendingUp className="text-green-500" /> This Week's Battery Sales
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Sales</span>
              <span className="font-bold">Rs. {batterySales.week.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Batteries</span>
              <span className="font-bold">{batterySales.week.items}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Profit</span>
              <span className="font-bold text-green-500">Rs. {batterySales.week.profit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FiTrendingDown className="text-red-500" /> This Month's Battery Sales
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Sales</span>
              <span className="font-bold">Rs. {batterySales.month.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Batteries</span>
              <span className="font-bold">{batterySales.month.items}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Profit</span>
              <span className="font-bold text-green-500">Rs. {batterySales.month.profit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Report */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FiBattery className="text-red-500" /> Battery Sales Report
            <span className="text-xs text-green-500 font-normal">(Karachi Time)</span>
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
              <FiFileText /> Excel
            </button>
            <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2">
              <FiDownload /> PDF
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm opacity-70">Total Sales</p>
              <p className="text-2xl font-bold text-blue-500">Rs. {yearlyData.total.toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm opacity-70">Total Invoices</p>
              <p className="text-2xl font-bold">{yearlyData.count}</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm opacity-70">Total Batteries</p>
              <p className="text-2xl font-bold">{yearlyData.items}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-4 py-3 text-left">Date (Karachi)</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Battery</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Final Total</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.details.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">No battery sales found for {selectedYear}</td>
                  </tr>
                ) : (
                  yearlyData.details.slice(0, 10).map((inv, idx) => (
                    inv.batteryItems.map((item, itemIdx) => (
                      <tr key={`${idx}-${itemIdx}`} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">{formatDateKarachi(inv.date)}</td>
                        <td className="px-4 py-3 font-mono text-sm">{inv.invoiceNo}</td>
                        <td className="px-4 py-3">{inv.customer}</td>
                        <td className="px-4 py-3">{item.service_name}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">Rs. {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold">Rs. {inv.total.toLocaleString()}</td>
                      </tr>
                    ))
                  ))
                )}
              </tbody>
              <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                <tr>
                  <td colSpan="6" className="px-4 py-3 text-right font-bold">Total:</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-500">Rs. {yearlyData.total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
};

export default BatteryOverview;