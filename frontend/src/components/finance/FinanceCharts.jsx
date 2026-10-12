// src/components/finance/FinanceCharts.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FinancialCharts from './FinancialCharts';
import { FiLoader, FiDownload, FiFileText } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// =====================================================================
// Dashboard.jsx wali hi logic (taake dono jagah numbers barabar aayen)
// =====================================================================

// Inventory se bike hue saare items (battery bhi shamil).
// Trade-in aur Old Battery Sale inventory ka maal nahi hain, isliye skip.
const getSoldInventoryItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item =>
    item &&
    item.service_category !== 'Trade-in' &&
    item.service_category !== 'Old Battery Sale'
  );
};

// Sales mein har line shamil, sirf 'Trade-in' (customer se old battery khareedna) skip.
const getSalesItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => item && item.service_category !== 'Trade-in');
};

// Cash-basis profit per line
const calcItemProfit = (item, purchaseMap) => {
  const qty = parseInt(item.quantity) || 0;
  const price = parseFloat(item.price) || 0;

  if (item.service_category === 'Trade-in') return -(price * qty);
  if (item.service_category === 'Old Battery Sale') return price * qty;

  const purchasePrice = purchaseMap[item.service_name] || 0;
  return (price - purchasePrice) * qty;
};

// Kya is invoice ka discount asal mein battery trade-in hai?
const isTradeInInvoice = (inv) => {
  const note = (inv?.discount_note || '').toLowerCase();
  if (note.includes('trade-in') || note.includes('old battery purchase')) return true;

  const items = Array.isArray(inv?.items) ? inv.items : [];
  return items.length > 0 && items.every(it => it && it.service_category === 'Battery');
};

const FinanceCharts = ({ darkMode }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for dynamic data from API
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalPurchase: 0,
    totalSelling: 0,
    totalProfit: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyOverview, setYearlyOverview] = useState({
    totalRevenue: 0,       // Total Sales
    totalExpenses: 0,      // Manual expenses (Expenses page wale)
    totalInventoryExpense: 0, // Inventory kitni kharidi gayi (purchase cost)
    totalProfit: 0,        // Inventory/products bechne se profit (discount ke baad)
    totalNetProfit: 0,     // Profit - Total Expenses (haath mein bacha hua)
    profitMargin: 0
  });

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      const response = await api.get('/products');
      let list = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        list = response.data.data;
      } else if (Array.isArray(response.data)) {
        list = response.data;
      }
      setProducts(list);
      return list;
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  }, []);

  // Fetch expenses from API
  const fetchExpenses = useCallback(async () => {
    try {
      const response = await api.get('/expenses');
      if (response.data && Array.isArray(response.data)) {
        setExpenses(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching expenses:', err);
      return [];
    }
  }, []);

  // Fetch invoices from API for sales data
  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('/invoices');
      if (response.data && Array.isArray(response.data)) {
        setInvoices(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching invoices:', err);
      return [];
    }
  }, []);

  // Inventory stats (abhi stock mein jo maal hai uski value)
  const calculateInventoryStats = useCallback((productsList) => {
    const stats = productsList.reduce((acc, product) => {
      const qty = parseInt(product.quantity) || 0;
      const purchase = parseFloat(product.purchase_price) || 0;
      const selling = parseFloat(product.selling_price) || 0;
      acc.totalPurchase += purchase * qty;
      acc.totalSelling += selling * qty;
      acc.totalProfit += (selling - purchase) * qty;
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });

    setInventoryStats(stats);
    return stats;
  }, []);

  // Monthly data (Dashboard jaisi logic)
  const calculateMonthlyData = useCallback((year, productsList, expensesList, invoicesList) => {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Product name -> purchase price (hidden products ke baghair, jaise Dashboard mein)
    const purchaseMap = {};
    productsList
      .filter(p => !(p.is_hidden === true || p.is_hidden === 1))
      .forEach(p => {
        purchaseMap[p.name] = parseFloat(p.purchase_price) || 0;
      });

    // Har product ki ab tak ki total bikri hui quantity (saare invoices se)
    // Kharidi hui quantity = abhi ki stock + ab tak bika hua maal
    const soldQtyByProduct = {};
    invoicesList.forEach(inv => {
      getSoldInventoryItems(inv.items).forEach(item => {
        const key = item.service_name;
        if (!key) return;
        soldQtyByProduct[key] = (soldQtyByProduct[key] || 0) + (parseInt(item.quantity) || 0);
      });
    });

    for (let i = 0; i < 12; i++) {
      // Is mahine ke invoices
      const monthInvoices = invoicesList.filter(inv => {
        if (!inv.invoice_date) return false;
        const invDate = new Date(inv.invoice_date);
        return invDate.getMonth() === i && invDate.getFullYear() === year;
      });

      let monthSales = 0;
      let monthGrossProfit = 0;
      let monthDiscount = 0;
      let monthTradeIn = 0;
      let monthItemsSold = 0;

      monthInvoices.forEach(inv => {
        const invDiscount = parseFloat(inv.discount) || 0;
        if (isTradeInInvoice(inv)) monthTradeIn += invDiscount;
        else monthDiscount += invDiscount;

        const items = Array.isArray(inv.items) ? inv.items : [];

        // Sales
        getSalesItems(items).forEach(item => {
          const qty = parseInt(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          monthSales += price * qty;
        });

        // Profit + items sold
        items.forEach(item => {
          if (!item) return;
          monthGrossProfit += calcItemProfit(item, purchaseMap);
        });
        getSoldInventoryItems(items).forEach(item => {
          monthItemsSold += parseInt(item.quantity) || 0;
        });
      });

      // Profit = products bechne se hua profit (discount / trade-in kat kar)
      const monthProfit = monthGrossProfit - monthDiscount - monthTradeIn;

      // Total Expenses = sirf manual expenses (Expenses page wale)
      const monthExpenses = expensesList.filter(exp => {
        const rawDate = exp.expense_date || exp.date || exp.created_at;
        if (!rawDate) return false;
        const expDate = new Date(rawDate);
        return expDate.getMonth() === i && expDate.getFullYear() === year;
      });
      const totalExpenses = monthExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

      // Inventory Expense = us mahine mein jitni inventory aayi (purchase price x kharidi hui qty)
      const monthProducts = productsList.filter(p => {
        const rawDate = p.date_added || p.created_at;
        if (!rawDate) return false;
        const productDate = new Date(rawDate);
        return productDate.getMonth() === i && productDate.getFullYear() === year;
      });
      const inventoryExpense = monthProducts.reduce((sum, p) => {
        const purchasedQty = (parseInt(p.quantity) || 0) + (soldQtyByProduct[p.name] || 0);
        return sum + (parseFloat(p.purchase_price) || 0) * purchasedQty;
      }, 0);

      // Net Profit = Profit - Total Expenses (haath mein bacha hua)
      const netProfit = monthProfit - totalExpenses;

      months.push({
        month: monthNames[i],
        monthIndex: i,
        revenue: monthSales,
        expenses: totalExpenses,
        inventoryExpense: inventoryExpense,
        purchase: inventoryExpense, // purana naam (agar FinancialCharts use kar raha ho)
        profit: monthProfit,
        netProfit: netProfit,
        discount: monthDiscount,
        itemsSold: monthItemsSold,
        invoiceCount: monthInvoices.length
      });
    }

    return months;
  }, []);

  // Yearly overview (12 mahino ka jod)
  const calculateYearlyOverview = useCallback((monthly) => {
    const totalRevenue = monthly.reduce((sum, m) => sum + m.revenue, 0);
    const totalExpenses = monthly.reduce((sum, m) => sum + m.expenses, 0);
    const totalInventoryExpense = monthly.reduce((sum, m) => sum + m.inventoryExpense, 0);
    const totalProfit = monthly.reduce((sum, m) => sum + m.profit, 0);
    const totalNetProfit = totalProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    setYearlyOverview({
      totalRevenue,
      totalExpenses,
      totalInventoryExpense,
      totalProfit,
      totalNetProfit,
      profitMargin
    });
  }, []);

  // Load all data and calculate monthly data
  const loadChartData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsList, expensesList, invoicesList] = await Promise.all([
        fetchProducts(),
        fetchExpenses(),
        fetchInvoices()
      ]);

      calculateInventoryStats(productsList);

      const monthlyChartData = calculateMonthlyData(selectedYear, productsList, expensesList, invoicesList);
      setMonthlyData(monthlyChartData);

      calculateYearlyOverview(monthlyChartData);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data. Please try again.');
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, fetchProducts, fetchExpenses, fetchInvoices, calculateInventoryStats, calculateMonthlyData, calculateYearlyOverview]);

  // Reload data when selected year changes
  useEffect(() => {
    loadChartData();
  }, [selectedYear, loadChartData]);

  // Available years from invoices and expenses
  const availableYears = useMemo(() => {
    const years = new Set();

    invoices.forEach(inv => {
      if (inv.invoice_date) {
        years.add(new Date(inv.invoice_date).getFullYear());
      }
    });

    expenses.forEach(exp => {
      const rawDate = exp.expense_date || exp.date || exp.created_at;
      if (rawDate) {
        years.add(new Date(rawDate).getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, expenses]);

  const monthHasData = (m) => m.revenue > 0 || m.expenses > 0 || m.inventoryExpense > 0;

  // ========== EXCEL EXPORT ==========
  const exportToExcel = () => {
    const hasData = monthlyData.some(monthHasData);

    if (!hasData) {
      toast.error('No data to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Monthly Financial Data
    const monthlySheetData = monthlyData.map(m => ({
      'Month': m.month,
      'Total Sales (Rs.)': m.revenue,
      'Total Expenses (Rs.)': m.expenses,
      'Inventory Expense (Rs.)': m.inventoryExpense,
      'Profit (Rs.)': m.profit,
      'Net Profit (Rs.)': m.netProfit,
      'Items Sold': m.itemsSold,
      'Invoices Count': m.invoiceCount
    }));
    const ws1 = XLSX.utils.json_to_sheet(monthlySheetData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Data');

    // Sheet 2: Summary
    const summaryData = [
      { 'Metric': 'Total Sales', 'Value': `Rs. ${yearlyOverview.totalRevenue.toLocaleString()}` },
      { 'Metric': 'Total Expenses', 'Value': `Rs. ${yearlyOverview.totalExpenses.toLocaleString()}` },
      { 'Metric': 'Total Inventory Expense', 'Value': `Rs. ${yearlyOverview.totalInventoryExpense.toLocaleString()}` },
      { 'Metric': 'Profit (Products Sale)', 'Value': `Rs. ${yearlyOverview.totalProfit.toLocaleString()}` },
      { 'Metric': 'Net Profit (Profit - Expenses)', 'Value': `Rs. ${yearlyOverview.totalNetProfit.toLocaleString()}` },
      { 'Metric': 'Net Profit Margin', 'Value': `${yearlyOverview.profitMargin.toFixed(1)}%` },
      { 'Metric': 'Year', 'Value': selectedYear }
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    // Sheet 3: Inventory Stats (abhi stock mein maal)
    const inventoryData = [
      { 'Metric': 'Current Stock Purchase Value', 'Value': `Rs. ${inventoryStats.totalPurchase.toLocaleString()}` },
      { 'Metric': 'Current Stock Selling Value', 'Value': `Rs. ${inventoryStats.totalSelling.toLocaleString()}` },
      { 'Metric': 'Current Stock Expected Profit', 'Value': `Rs. ${inventoryStats.totalProfit.toLocaleString()}` }
    ];
    const ws3 = XLSX.utils.json_to_sheet(inventoryData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Inventory Stats');

    XLSX.writeFile(wb, `Financial_Report_${selectedYear}.xlsx`);
    toast.success('Exported to Excel!');
  };

  // ========== PDF EXPORT ==========
  const exportToPDF = () => {
    const hasData = monthlyData.some(monthHasData);

    if (!hasData) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38);
    doc.text(`Financial Report - ${selectedYear}`, 14, 15);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    // Summary Stats
    doc.setFontSize(10);
    doc.text(`Total Sales: Rs. ${yearlyOverview.totalRevenue.toLocaleString()}`, 14, 30);
    doc.text(`Total Expenses: Rs. ${yearlyOverview.totalExpenses.toLocaleString()}`, 14, 36);
    doc.text(`Total Inventory Expense: Rs. ${yearlyOverview.totalInventoryExpense.toLocaleString()}`, 14, 42);
    doc.text(`Profit (Products Sale): Rs. ${yearlyOverview.totalProfit.toLocaleString()}`, 14, 48);
    doc.text(`Net Profit (Profit - Expenses): Rs. ${yearlyOverview.totalNetProfit.toLocaleString()}  (${yearlyOverview.profitMargin.toFixed(1)}%)`, 14, 54);

    // Monthly Data Table
    const tableData = monthlyData.map(m => [
      m.month,
      `Rs. ${m.revenue.toLocaleString()}`,
      `Rs. ${m.expenses.toLocaleString()}`,
      `Rs. ${m.inventoryExpense.toLocaleString()}`,
      `Rs. ${m.profit.toLocaleString()}`,
      `Rs. ${m.netProfit.toLocaleString()}`,
      m.itemsSold,
      m.invoiceCount
    ]);

    doc.autoTable({
      head: [['Month', 'Sales', 'Expenses', 'Inventory Exp.', 'Profit', 'Net Profit', 'Items Sold', 'Invoices']],
      body: tableData,
      startY: 62,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 }
      }
    });

    doc.save(`Financial_Report_${selectedYear}.pdf`);
    toast.success('Exported to PDF!');
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading chart data...</p>
        </div>
      </div>
    );
  }

  const hasData = monthlyData.some(monthHasData);
  const cardClass = `p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`;

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons */}
      <div className={`flex flex-wrap justify-between items-center p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Financial Dashboard</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Year {selectedYear}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToExcel}
            disabled={!hasData}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              darkMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FiFileText size={14} /> Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={!hasData}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              darkMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FiDownload size={14} /> PDF
          </button>
          <button
            onClick={loadChartData}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <FiLoader className={loading ? 'animate-spin' : ''} size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Yearly Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Sales */}
        <div className={cardClass}>
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-2xl font-bold text-green-500">Rs. {yearlyOverview.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Year {selectedYear}</p>
        </div>

        {/* 2. Total Expenses (jaisa pehle tha) */}
        <div className={cardClass}>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">Rs. {yearlyOverview.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Year {selectedYear}</p>
        </div>

        {/* 3. Total Inventory Expense */}
        <div className={cardClass}>
          <p className="text-sm text-gray-500">Total Inventory Expense</p>
          <p className="text-2xl font-bold text-orange-500">Rs. {yearlyOverview.totalInventoryExpense.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Inventory purchase cost</p>
        </div>

        {/* 4. Profit (products bechne se) */}
        <div className={cardClass}>
          <p className="text-sm text-gray-500">Profit</p>
          <p className={`text-2xl font-bold ${yearlyOverview.totalProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            Rs. {yearlyOverview.totalProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">From selling products</p>
        </div>

        {/* 5. Net Profit (haath mein bacha hua) */}
        <div className={cardClass}>
          <p className="text-sm text-gray-500">Net Profit</p>
          <p className={`text-2xl font-bold ${yearlyOverview.totalNetProfit >= 0 ? 'text-purple-500' : 'text-red-500'}`}>
            Rs. {yearlyOverview.totalNetProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Profit - Expenses ({yearlyOverview.profitMargin.toFixed(1)}%)</p>
        </div>
      </div>

      <FinancialCharts
        monthlyData={monthlyData}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        compareYear={compareYear}
        setCompareYear={setCompareYear}
        chartType={chartType}
        setChartType={setChartType}
        darkMode={darkMode}
        availableYears={availableYears}
        yearlyOverview={yearlyOverview}
        inventoryStats={inventoryStats}
      />

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">⚠️ {error}</p>
          <button
            onClick={loadChartData}
            className="mt-2 px-4 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No data available for year {selectedYear}. Please add invoices/sales and expenses first.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinanceCharts;