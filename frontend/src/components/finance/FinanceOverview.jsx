// src/components/finance/FinanceOverview.jsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { FiCalendar, FiTrendingUp, FiDollarSign, FiPackage, FiBarChart2, FiChevronDown, FiChevronUp, FiDownload, FiFileText, FiLoader, FiClock, FiTrendingDown, FiChevronLeft, FiChevronRight, FiPercent, FiGift } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Lazy load heavy components
const StatsCards = lazy(() => import('./StatsCards'));
const UpcomingPayments = lazy(() => import('./UpcomingPayments'));

// Debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Memoized Invoice Details Component
const InvoiceDetails = React.memo(({ title, data, darkMode, onClose }) => {
  if (!data?.details || data.details.length === 0) {
    return (
      <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
        <p className="text-gray-500">No sales data available</p>
      </div>
    );
  }
  
  const allItems = useMemo(() => {
    const items = [];
    data.details.forEach(inv => {
      inv.items.forEach(item => {
        items.push({ ...item, inv });
      });
    });
    return items;
  }, [data.details]);
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">📋 {title}</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm">
          <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Purchase</th>
              <th className="px-3 py-2 text-right">Sell</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Unit Profit</th>
              <th className="px-3 py-2 text-right">Total Profit</th>
              <th className="px-3 py-2 text-left">Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {allItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 font-medium">{item.service_name}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${item.isProduct ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {item.isProduct ? 'Product' : 'Service'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}
                </td>
                <td className="px-3 py-2 text-right">Rs. {item.price.toLocaleString()}</td>
                <td className="px-3 py-2 text-center font-semibold">{item.quantity}</td>
                <td className="px-3 py-2 text-right font-semibold text-green-500">
                  + Rs. {item.unitProfit.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-green-500">
                  Rs. {(item.unitProfit * item.quantity).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-xs">{item.inv.customer}</td>
               </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
            <tr>
              <td colSpan="6" className="px-3 py-2 text-right font-bold">Total:</td>
              <td className="px-3 py-2 text-right font-bold text-green-500">Rs. {data.profit.toLocaleString()}</td>
              <td></td>
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

// Memoized Expense Details Component
const ExpenseDetails = React.memo(({ title, expenses, darkMode, onClose }) => {
  if (!expenses || expenses.length === 0) {
    return (
      <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
        <p className="text-gray-500">No expense data available</p>
      </div>
    );
  }
  
  const totalAmount = useMemo(() => 
    expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0), 
    [expenses]
  );
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">📋 {title}</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-sm">
          <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
            <tr>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Amount</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {expenses.map((exp, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 font-medium">{exp.description}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {exp.category || 'General'}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right font-semibold text-red-500">Rs. {exp.amount.toLocaleString()}</td>
               </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
            <tr>
              <td colSpan="3" className="px-3 py-2 text-right font-bold">Total:</td>
              <td className="px-3 py-2 text-right font-bold text-red-500">Rs. {totalAmount.toLocaleString()}</td>
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

const FinanceOverview = ({ darkMode }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearlyReport, setShowYearlyReport] = useState(true);
  const [showTodayDetails, setShowTodayDetails] = useState(false);
  const [showWeekDetails, setShowWeekDetails] = useState(false);
  const [showMonthDetails, setShowMonthDetails] = useState(false);
  const [showTodayExpenses, setShowTodayExpenses] = useState(false);
  const [showWeekExpenses, setShowWeekExpenses] = useState(false);
  const [showMonthExpenses, setShowMonthExpenses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state for yearly report
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  const [todaySales, setTodaySales] = useState({ total: 0, items: 0, count: 0, profit: 0, discount: 0, details: [] });
  const [weeklySales, setWeeklySales] = useState({ total: 0, items: 0, count: 0, profit: 0, discount: 0, details: [] });
  const [monthlySales, setMonthlySales] = useState({ total: 0, items: 0, count: 0, profit: 0, discount: 0, details: [] });
  const [selectedYearData, setSelectedYearData] = useState({ total: 0, items: 0, count: 0, profit: 0, discount: 0, details: [] });
  
  const [todayExpenseDetails, setTodayExpenseDetails] = useState([]);
  const [weekExpenseDetails, setWeekExpenseDetails] = useState([]);
  const [monthExpenseDetails, setMonthExpenseDetails] = useState([]);
  
  const [stats, setStats] = useState({
    todayExpenses: 0,
    todayExpenseCount: 0,
    weekExpenses: 0,
    weekExpenseCount: 0,
    monthExpenses: 0,
    monthExpenseCount: 0,
    todayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    todayDiscount: 0,
    weekDiscount: 0,
    monthDiscount: 0
  });

  // Memoized helper functions
  const getStartOfWeek = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const getStartOfMonth = useCallback(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Fetch functions with abort controller
  const fetchProducts = useCallback(async (signal) => {
    try {
      const response = await api.get('/products', { signal });
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching products:', err);
      }
      return [];
    }
  }, []);

  const fetchExpenses = useCallback(async (signal) => {
    try {
      const response = await api.get('/expenses', { signal });
      if (response.data && Array.isArray(response.data)) {
        setExpenses(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching expenses:', err);
      }
      return [];
    }
  }, []);

  const fetchInvoices = useCallback(async (signal) => {
    try {
      const response = await api.get('/invoices', { signal });
      if (response.data && Array.isArray(response.data)) {
        setInvoices(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching invoices:', err);
      }
      return [];
    }
  }, []);

  const loadAllData = useCallback(async () => {
    const abortController = new AbortController();
    setLoading(true);
    setError(null);
    
    try {
      const [productsList, expensesList, invoicesList] = await Promise.all([
        fetchProducts(abortController.signal),
        fetchExpenses(abortController.signal),
        fetchInvoices(abortController.signal)
      ]);
      
      const todayStr = new Date().toDateString();
      const weekStart = getStartOfWeek();
      const monthStart = getStartOfMonth();
      
      let todayTotal = 0, todayItems = 0, todayProfit = 0, todayDiscount = 0, todayDetails = [];
      let weekTotal = 0, weekItems = 0, weekProfit = 0, weekDiscount = 0, weekDetails = [];
      let monthTotal = 0, monthItems = 0, monthProfit = 0, monthDiscount = 0, monthDetails = [];
      
      const productsMap = new Map();
      productsList.forEach(p => {
        productsMap.set(p.name, p);
      });
      
      invoicesList.forEach(inv => {
        if (!inv.invoice_date) return;
        
        const invDate = new Date(inv.invoice_date);
        const invDateStr = invDate.toDateString();
        const isToday = invDateStr === todayStr;
        const isThisWeek = invDate >= weekStart;
        const isThisMonth = invDate >= monthStart;
        
        let invTotal = parseFloat(inv.total_amount) || 0;
        let invProfit = 0;
        let itemCount = 0;
        let invDiscount = parseFloat(inv.discount) || 0;
        
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(item => {
            const itemQty = parseInt(item.quantity) || 0;
            const itemPrice = parseFloat(item.price) || 0;
            itemCount += itemQty;
            
            let itemProfit = 0;
            let purchasePrice = 0;
            
            const product = productsMap.get(item.service_name);
            
            if (product) {
              purchasePrice = parseFloat(product.purchase_price) || 0;
              itemProfit = (itemPrice - purchasePrice) * itemQty;
            } else {
              itemProfit = itemPrice * itemQty;
              purchasePrice = 0;
            }
            
            invProfit += itemProfit;
            item.purchasePrice = purchasePrice;
            item.isProduct = !!product;
            item.unitProfit = itemQty > 0 ? itemProfit / itemQty : 0;
          });
        }
        
        const detailItem = {
          invoiceNo: inv.invoice_no,
          customer: inv.customer_name,
          date: inv.invoice_date,
          total: invTotal,
          profit: invProfit,
          discount: invDiscount,
          items: inv.items || [],
          itemCount: itemCount
        };
        
        if (isToday) {
          todayTotal += invTotal;
          todayItems += itemCount;
          todayProfit += invProfit;
          todayDiscount += invDiscount;
          todayDetails.push(detailItem);
        }
        if (isThisWeek) {
          weekTotal += invTotal;
          weekItems += itemCount;
          weekProfit += invProfit;
          weekDiscount += invDiscount;
          weekDetails.push(detailItem);
        }
        if (isThisMonth) {
          monthTotal += invTotal;
          monthItems += itemCount;
          monthProfit += invProfit;
          monthDiscount += invDiscount;
          monthDetails.push(detailItem);
        }
      });
      
      setTodaySales({ total: todayTotal, items: todayItems, count: todayDetails.length, profit: todayProfit, discount: todayDiscount, details: todayDetails });
      setWeeklySales({ total: weekTotal, items: weekItems, count: weekDetails.length, profit: weekProfit, discount: weekDiscount, details: weekDetails });
      setMonthlySales({ total: monthTotal, items: monthItems, count: monthDetails.length, profit: monthProfit, discount: monthDiscount, details: monthDetails });
      
      let todayExp = 0, todayExpCount = 0, todayExpList = [];
      let weekExp = 0, weekExpCount = 0, weekExpList = [];
      let monthExp = 0, monthExpCount = 0, monthExpList = [];
      
      expensesList.forEach(exp => {
        if (!exp.expense_date) return;
        const expDate = new Date(exp.expense_date);
        const amount = parseFloat(exp.amount) || 0;
        const expenseItem = {
          id: exp.id,
          description: exp.description,
          amount: amount,
          date: exp.expense_date,
          category: exp.category
        };
        
        if (expDate.toDateString() === todayStr) {
          todayExp += amount;
          todayExpCount++;
          todayExpList.push(expenseItem);
        }
        if (expDate >= weekStart) {
          weekExp += amount;
          weekExpCount++;
          weekExpList.push(expenseItem);
        }
        if (expDate >= monthStart) {
          monthExp += amount;
          monthExpCount++;
          monthExpList.push(expenseItem);
        }
      });
      
      setTodayExpenseDetails(todayExpList);
      setWeekExpenseDetails(weekExpList);
      setMonthExpenseDetails(monthExpList);
      
      const todayNetProfit = todayProfit - todayExp;
      const weekNetProfit = weekProfit - weekExp;
      const monthNetProfit = monthProfit - monthExp;
      
      setStats({
        todayExpenses: todayExp,
        todayExpenseCount: todayExpCount,
        weekExpenses: weekExp,
        weekExpenseCount: weekExpCount,
        monthExpenses: monthExp,
        monthExpenseCount: monthExpCount,
        todayProfit: todayNetProfit,
        weekProfit: weekNetProfit,
        monthProfit: monthNetProfit,
        todayDiscount: todayDiscount,
        weekDiscount: weekDiscount,
        monthDiscount: monthDiscount
      });
      
      const year = selectedYear;
      const yearInvoices = invoicesList.filter(inv => {
        if (!inv.invoice_date) return false;
        return new Date(inv.invoice_date).getFullYear() === year;
      });
      
      let yearlyTotal = 0, yearlyItems = 0, yearlyProfit = 0, yearlyDiscount = 0, yearlyDetails = [];
      
      yearInvoices.forEach(inv => {
        let invTotal = parseFloat(inv.total_amount) || 0;
        let invProfit = 0;
        let itemCount = 0;
        let invDiscount = parseFloat(inv.discount) || 0;
        
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(item => {
            const itemQty = parseInt(item.quantity) || 0;
            const itemPrice = parseFloat(item.price) || 0;
            itemCount += itemQty;
            
            let itemProfit = 0;
            let purchasePrice = 0;
            
            const product = productsMap.get(item.service_name);
            
            if (product) {
              purchasePrice = parseFloat(product.purchase_price) || 0;
              itemProfit = (itemPrice - purchasePrice) * itemQty;
            } else {
              itemProfit = itemPrice * itemQty;
              purchasePrice = 0;
            }
            
            invProfit += itemProfit;
            item.purchasePrice = purchasePrice;
            item.isProduct = !!product;
            item.unitProfit = itemQty > 0 ? itemProfit / itemQty : 0;
          });
        }
        
        yearlyTotal += invTotal;
        yearlyItems += itemCount;
        yearlyProfit += invProfit;
        yearlyDiscount += invDiscount;
        yearlyDetails.push({
          invoiceNo: inv.invoice_no,
          customer: inv.customer_name,
          date: inv.invoice_date,
          total: invTotal,
          profit: invProfit,
          discount: invDiscount,
          items: inv.items || [],
          itemCount: itemCount
        });
      });
      
      setSelectedYearData({ total: yearlyTotal, items: yearlyItems, count: yearInvoices.length, profit: yearlyProfit, discount: yearlyDiscount, details: yearlyDetails });
      setCurrentPage(1);
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading data:', err);
        setError('Failed to load finance data. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
    
    return () => abortController.abort();
  }, [selectedYear, fetchProducts, fetchExpenses, fetchInvoices, getStartOfWeek, getStartOfMonth]);

  useEffect(() => {
    const cleanup = loadAllData();
    return () => {
      if (cleanup && typeof cleanup === 'function') cleanup();
    };
  }, [loadAllData]);

  const flattenedItems = useMemo(() => {
    const items = [];
    selectedYearData.details.forEach(inv => {
      inv.items.forEach(item => {
        items.push({ ...item, inv });
      });
    });
    return items;
  }, [selectedYearData.details]);

  const totalItems = flattenedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = useMemo(() => 
    flattenedItems.slice(indexOfFirstItem, indexOfLastItem),
    [flattenedItems, indexOfFirstItem, indexOfLastItem]
  );

  const paginate = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const exportToExcel = useCallback(() => {
    if (selectedYearData.details.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }
    
    const exportData = [];
    selectedYearData.details.forEach(inv => {
      inv.items.forEach(item => {
        exportData.push({
          'Invoice #': inv.invoiceNo,
          'Customer': inv.customer,
          'Date': new Date(inv.date).toLocaleDateString(),
          'Item': item.service_name,
          'Type': item.isProduct ? 'Product' : 'Service',
          'Quantity': item.quantity,
          'Purchase Price': item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : 'N/A',
          'Selling Price': `Rs. ${item.price.toLocaleString()}`,
          'Unit Profit': `Rs. ${item.unitProfit.toLocaleString()}`,
          'Total Profit': `Rs. ${(item.unitProfit * item.quantity).toLocaleString()}`
        });
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Year_${selectedYear}_Report`);
    XLSX.writeFile(wb, `Year_${selectedYear}_Sales_Report.xlsx`);
    toast.success(`Exported to Excel for year ${selectedYear}`);
  }, [selectedYearData, selectedYear]);

  const exportToPDF = useCallback(() => {
    if (selectedYearData.details.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }
    
    const doc = new jsPDF('landscape');
    doc.text(`Sales Report for Year ${selectedYear}`, 14, 10);
    const tableData = [];
    selectedYearData.details.forEach(inv => {
      inv.items.forEach(item => {
        tableData.push([
          inv.invoiceNo,
          inv.customer,
          new Date(inv.date).toLocaleDateString(),
          item.service_name,
          item.isProduct ? 'Product' : 'Service',
          item.quantity,
          item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-',
          `Rs. ${item.price.toLocaleString()}`,
          `Rs. ${item.unitProfit.toLocaleString()}`,
          `Rs. ${(item.unitProfit * item.quantity).toLocaleString()}`
        ]);
      });
    });
    
    doc.autoTable({
      head: [['Invoice', 'Customer', 'Date', 'Item', 'Type', 'Qty', 'Purchase', 'Sell', 'Unit Profit', 'Total Profit']],
      body: tableData,
      startY: 20,
    });
    doc.save(`Year_${selectedYear}_Sales_Report.pdf`);
    toast.success(`Exported to PDF for year ${selectedYear}`);
  }, [selectedYearData, selectedYear]);

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* ✅ SALES CARDS - Blue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowTodayDetails(!showTodayDetails)}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Today's Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {todaySales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{todaySales.items} items sold</p>
              <p className="text-xs opacity-75 mt-1">Profit: Rs. {todaySales.profit.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2 flex items-center gap-1"><FiClock /> Click for details</p>
            </div>
            <FiCalendar className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowWeekDetails(!showWeekDetails)}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Week's Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {weeklySales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{weeklySales.items} items sold</p>
              <p className="text-xs opacity-75 mt-1">Profit: Rs. {weeklySales.profit.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2 flex items-center gap-1"><FiClock /> Click for details</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowMonthDetails(!showMonthDetails)}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Month's Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {monthlySales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{monthlySales.items} items sold</p>
              <p className="text-xs opacity-75 mt-1">Profit: Rs. {monthlySales.profit.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2 flex items-center gap-1"><FiClock /> Click for details</p>
            </div>
            <FiDollarSign className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {showTodayDetails && <InvoiceDetails title="Today's Sales" data={todaySales} darkMode={darkMode} onClose={() => setShowTodayDetails(false)} />}
      {showWeekDetails && <InvoiceDetails title="This Week's Sales" data={weeklySales} darkMode={darkMode} onClose={() => setShowWeekDetails(false)} />}
      {showMonthDetails && <InvoiceDetails title="This Month's Sales" data={monthlySales} darkMode={darkMode} onClose={() => setShowMonthDetails(false)} />}

      {/* ✅ EXPENSE CARDS - Red */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowTodayExpenses(!showTodayExpenses)}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Today's Expenses</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.todayExpenses.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{stats.todayExpenseCount} transactions</p>
              <p className="text-xs opacity-75 mt-2 flex items-center gap-1"><FiClock /> Click for details</p>
            </div>
            <FiTrendingDown className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowWeekExpenses(!showWeekExpenses)}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Week's Expenses</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.weekExpenses.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{stats.weekExpenseCount} transactions</p>
              <p className="text-xs opacity-75 mt-2 flex items-center gap-1"><FiClock /> Click for details</p>
            </div>
            <FiTrendingDown className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowMonthExpenses(!showMonthExpenses)}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Month's Expenses</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.monthExpenses.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{stats.monthExpenseCount} transactions</p>
              <p className="text-xs opacity-75 mt-2 flex items-center gap-1"><FiClock /> Click for details</p>
            </div>
            <FiTrendingDown className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {showTodayExpenses && <ExpenseDetails title="Today's Expenses" expenses={todayExpenseDetails} darkMode={darkMode} onClose={() => setShowTodayExpenses(false)} />}
      {showWeekExpenses && <ExpenseDetails title="This Week's Expenses" expenses={weekExpenseDetails} darkMode={darkMode} onClose={() => setShowWeekExpenses(false)} />}
      {showMonthExpenses && <ExpenseDetails title="This Month's Expenses" expenses={monthExpenseDetails} darkMode={darkMode} onClose={() => setShowMonthExpenses(false)} />}

      {/* ✅ PROFIT CARDS - Green */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Today's Profit</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.todayProfit?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-75 mt-1">After expenses</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Week's Profit</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.weekProfit?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-75 mt-1">After expenses</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Month's Profit</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.monthProfit?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-75 mt-1">After expenses</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* ✅ DISCOUNT CARDS - Light Blue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-sky-400 to-sky-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Today's Discount</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.todayDiscount?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-75 mt-1">Given today</p>
            </div>
            <FiGift className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-sky-400 to-sky-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Week's Discount</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.weekDiscount?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-75 mt-1">Given this week</p>
            </div>
            <FiGift className="text-3xl opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-sky-400 to-sky-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Month's Discount</p>
              <p className="text-3xl font-bold mt-2">Rs. {stats.monthDiscount?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-75 mt-1">Given this month</p>
            </div>
            <FiGift className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FiBarChart2 className="text-red-500" /> Monthly Financial Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-xl font-bold text-blue-500">Rs. {monthlySales.total.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className="text-sm text-gray-500">Expenses</p>
            <p className="text-xl font-bold text-red-500">Rs. {stats.monthExpenses?.toLocaleString() || 0}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className="text-sm text-gray-500">Discount Given</p>
            <p className="text-xl font-bold text-sky-500">Rs. {monthlySales.discount.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className="text-sm text-gray-500">Net Profit</p>
            <p className="text-xl font-bold text-green-500">Rs. {(monthlySales.profit - (stats.monthExpenses || 0)).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Yearly Report Section with Pagination */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button onClick={() => setShowYearlyReport(!showYearlyReport)} className="w-full px-6 py-4 flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-900/20 transition">
          <div className="flex items-center gap-2">
            <FiBarChart2 className="text-red-500 text-xl" />
            <h3 className="text-lg font-semibold">📊 Yearly Sales Report</h3>
          </div>
          {showYearlyReport ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        
        {showYearlyReport && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex gap-3 items-center">
                <label className="text-sm font-medium">Select Year:</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  {[2024, 2025, 2026, 2027].map(year => (<option key={year} value={year}>{year}</option>))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"><FiFileText /> Export Excel</button>
                <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"><FiDownload /> Export PDF</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm opacity-70">Total Sales</p>
                <p className="text-2xl font-bold text-blue-500">Rs. {selectedYearData.total.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm opacity-70">Total Invoices</p>
                <p className="text-2xl font-bold">{selectedYearData.count}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm opacity-70">Total Profit</p>
                <p className="text-2xl font-bold text-green-500">Rs. {selectedYearData.profit.toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Purchase</th>
                    <th className="px-4 py-3 text-right">Sell</th>
                    <th className="px-4 py-3 text-right">Unit Profit</th>
                    <th className="px-4 py-3 text-right">Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center">No invoices found</td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={idx} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-sm">{new Date(item.inv.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-sm">{item.inv.invoiceNo}</td>
                        <td className="px-4 py-3">{item.inv.customer}</td>
                        <td className="px-4 py-3">{item.service_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${item.isProduct ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.isProduct ? 'Product' : 'Service'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-3 text-right">Rs. {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-500">+ Rs. {item.unitProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-500">Rs. {(item.unitProfit * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <td colSpan="9" className="px-4 py-3 text-right font-bold">Total Profit:</td>
                    <td className="px-4 py-3 text-right font-bold text-green-500">Rs. {selectedYearData.profit.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition ${
                      currentPage === 1
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <FiChevronLeft /> Previous
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`w-8 h-8 rounded-lg transition ${
                            currentPage === pageNum
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition ${
                      currentPage === totalPages
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Next <FiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center"><p className="text-sm text-red-700">⚠️ {error}</p></div>)}
    </div>
  );
};

export default FinanceOverview;