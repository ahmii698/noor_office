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

// ============================================================
// 🕒 KARACHI TIMEZONE HELPERS (Asia/Karachi, UTC+5, no DST)
// Saari date filtering 'YYYY-MM-DD' strings par hoti hai jo Karachi ke
// hisab se nikalti hain, isliye browser/server timezone ka asar nahi padta.
// ============================================================
const KARACHI_TZ = 'Asia/Karachi';

const karachiFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KARACHI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Kisi bhi date value ko Karachi ki 'YYYY-MM-DD' string mein badalta hai
const toKarachiDateStr = (value) => {
  if (!value) return '';
  const str = String(value).trim();

  // Sirf date: jaisi hai waisi (already calendar date hai)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Time hai magar timezone nahi (e.g. "2026-09-29 00:30:00") -> Karachi time maan lo
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/i.test(str);
  if (!hasTz && /^\d{4}-\d{2}-\d{2}[ T]/.test(str)) return str.substring(0, 10);

  // ISO with Z / offset -> Karachi mein convert
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return karachiFormatter.format(d);
};

// Aaj ki date (Karachi)
const getKarachiToday = () => karachiFormatter.format(new Date());

// Is hafte ka Monday (Karachi)
const getWeekStartStr = () => {
  const d = new Date(`${getKarachiToday()}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
};

// Is mahine ki 1 tareekh (Karachi)
const getMonthStartStr = () => `${getKarachiToday().slice(0, 8)}01`;

// Is saal ki 1 January (Karachi)
const getYearStartStr = () => `${getKarachiToday().slice(0, 4)}-01-01`;

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' display
const formatDisplayDate = (value) => {
  const s = toKarachiDateStr(value);
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

// ✅ Battery filter function - Battery items ko detect karega
const isBatteryItem = (item) => {
  if (!item) return false;
  return item.service_category === 'Battery' || 
         item.service_name?.toLowerCase().includes('battery');
};

// ✅ Helper: Get non-battery items from invoice
const getNonBatteryItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => !isBatteryItem(item));
};

// ✅ Helper: Check if invoice has any non-battery items
const hasNonBatteryItems = (items) => {
  return getNonBatteryItems(items).length > 0;
};

// Helper: Get date range for filter (Karachi 'YYYY-MM-DD' strings)
const getDateRange = (filter, customDate = null) => {
  const today = getKarachiToday();

  if (filter === 'custom' && customDate) {
    return { start: customDate, end: customDate };
  }

  switch (filter) {
    case 'today':
      return { start: today, end: today };
    case 'week':
      return { start: getWeekStartStr(), end: today };
    case 'month':
      return { start: getMonthStartStr(), end: today };
    case 'year':
      return { start: getYearStartStr(), end: today };
    default:
      return null;
  }
};

const isInRange = (dayStr, range) => {
  if (!dayStr) return false;
  return dayStr >= range.start && dayStr <= range.end;
};

// Helper: Filter invoices by date range
const filterInvoicesByDate = (invoices, filter, customDate = null) => {
  if (filter === 'all' || !invoices || invoices.length === 0) return invoices;
  const range = getDateRange(filter, customDate);
  if (!range) return invoices;
  
  return invoices.filter(inv => {
    if (!inv.invoice_date) return false;
    return isInRange(toKarachiDateStr(inv.invoice_date), range);
  });
};

// Helper: Filter expenses by date range
const filterExpensesByDate = (expenses, filter, customDate = null) => {
  if (filter === 'all' || !expenses || expenses.length === 0) return expenses;
  const range = getDateRange(filter, customDate);
  if (!range) return expenses;
  
  return expenses.filter(exp => {
    const raw = exp.expense_date || exp.date || exp.created_at;
    if (!raw) return false;
    return isInRange(toKarachiDateStr(raw), range);
  });
};

// ✅ Helper: Inventory Purchased (jo paisay actually nikal chuke hain)
//  1) Cash purchase (vendor se link nahi): poori purchase_price × quantity
//  2) Vendor/credit purchase: sirf wo paisay jo vendor ko diye gaye
//     - khareedte waqt diya hua amount -> record ki date par
//     - baad mein Pay Now se diye hue payments -> payment ki date par
//  Battery excluded, sab Karachi date ke hisab se
const getInventoryCost = (products, creditRecords, filter, customDate = null) => {
  const range = filter !== 'all' ? getDateRange(filter, customDate) : null;
  const inRange = (raw) => {
    if (!range) return true;
    if (!raw) return false;
    return isInRange(toKarachiDateStr(raw), range);
  };

  // 1) Cash products (credit vendor se linked products yahan nahi ginay jayenge)
  const cashProducts = (products || []).filter(p =>
    p.category !== 'Battery' &&
    !p.name?.toLowerCase().includes('battery') &&
    !p.credit_vendor &&
    !p.credit_vendor_id
  );

  const cashTotal = cashProducts
    .filter(p => inRange(p.created_at || p.date_added))
    .reduce(
      (sum, p) => sum + (parseFloat(p.purchase_price) || 0) * (parseInt(p.quantity) || 0),
      0
    );

  // 2) Credit purchases - sirf diye hue paisay
  let creditPaidTotal = 0;
  (creditRecords || []).forEach(rec => {
    if (String(rec.products || '').toLowerCase().includes('battery')) return;

    const payments = Array.isArray(rec.payments) ? rec.payments : [];
    const paymentsSum = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const paidTotal = parseFloat(rec.paid_amount) || 0;

    // Khareedte waqt diya hua amount (agar payments list mein already hai to 0 banega)
    const initialPaid = Math.max(0, paidTotal - paymentsSum);
    if (initialPaid > 0 && inRange(rec.created_at)) {
      creditPaidTotal += initialPaid;
    }

    payments.forEach(p => {
      const amt = parseFloat(p.amount) || 0;
      if (amt > 0 && inRange(p.date || p.payment_date || p.created_at)) {
        creditPaidTotal += amt;
      }
    });
  });

  return cashTotal + creditPaidTotal;
};

// ✅ Collapsible Stat Card (compact prop = chhota card)
const StatCard = ({ gradient, icon: Icon, title, mainValue, subLines = [], onClick, expanded, compact = false }) => {
  return (
    <div
      className={`bg-gradient-to-r ${gradient} rounded-2xl ${compact ? 'p-4' : 'p-6'} text-white shadow-lg transition-transform min-w-0 ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-xs' : 'text-sm'} opacity-90`}>{title}</p>
          <p className={`${compact ? 'text-xl mt-1' : 'text-3xl mt-2'} font-bold break-words`}>{mainValue}</p>
        </div>
        <Icon className={`${compact ? 'text-xl' : 'text-3xl'} opacity-50 flex-shrink-0`} />
      </div>

      {subLines.length > 0 && (
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'
          }`}
        >
          {subLines.map((line, i) => (
            <p key={i} className="text-xs opacity-75 mt-1">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// Memoized Invoice Details Component - ✅ Battery filtered out
const InvoiceDetails = React.memo(({ title, data, darkMode, onClose }) => {
  const allItems = useMemo(() => {
    const items = [];
    (data?.details || []).forEach(inv => {
      const nonBatteryItems = getNonBatteryItems(inv.items);
      nonBatteryItems.forEach(item => {
        items.push({ ...item, inv });
      });
    });
    return items;
  }, [data?.details]);

  if (!data?.details || data.details.length === 0) {
    return (
      <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} text-center`}>
        <p>No sales data available</p>
      </div>
    );
  }
  
  if (allItems.length === 0) {
    return (
      <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} text-center`}>
        <p>No non-battery sales data available</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📋 {title}</h4>
        <button onClick={onClose} className={`text-lg ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>✕</button>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className={`w-full text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
            <tr className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
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
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {allItems.map((item, idx) => (
              <tr key={idx} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                <td className={`px-3 py-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.service_name}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.isProduct 
                      ? darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700' 
                      : darkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {item.isProduct ? 'Product' : 'Service'}
                  </span>
                </td>
                <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}
                </td>
                <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rs. {item.price.toLocaleString()}</td>
                <td className={`px-3 py-2 text-center font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</td>
                <td className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>
                  + Rs. {item.unitProfit.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>
                  Rs. {(item.unitProfit * item.quantity).toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.inv.customer}</td>
               </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}>
            <tr>
              <td colSpan="6" className="px-3 py-2 text-right font-bold">Total:</td>
              <td className={`px-3 py-2 text-right font-bold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>Rs. {data.profit.toLocaleString()}</td>
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
  const totalAmount = useMemo(() => 
    (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0), 
    [expenses]
  );

  if (!expenses || expenses.length === 0) {
    return (
      <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} text-center`}>
        <p>No expense data available</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📋 {title}</h4>
        <button onClick={onClose} className={`text-lg ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>✕</button>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className={`w-full text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
            <tr className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Amount</th>
             </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {expenses.map((exp, idx) => (
              <tr key={idx} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                <td className={`px-3 py-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{exp.description}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                    {exp.category || 'General'}
                  </span>
                </td>
                <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDisplayDate(exp.date || exp.expense_date)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Rs. {exp.amount.toLocaleString()}</td>
               </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}>
            <tr>
              <td colSpan="3" className="px-3 py-2 text-right font-bold">Total:</td>
              <td className={`px-3 py-2 text-right font-bold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Rs. {totalAmount.toLocaleString()}</td>
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

const FinanceOverview = ({ darkMode }) => {
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState(parseInt(getKarachiToday().slice(0, 4)));
  const [showYearlyReport, setShowYearlyReport] = useState(true);
  const [showTodayDetails, setShowTodayDetails] = useState(false);
  const [showWeekDetails, setShowWeekDetails] = useState(false);
  const [showMonthDetails, setShowMonthDetails] = useState(false);
  const [showTodayExpenses, setShowTodayExpenses] = useState(false);
  const [showWeekExpenses, setShowWeekExpenses] = useState(false);
  const [showMonthExpenses, setShowMonthExpenses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showAllDetails, setShowAllDetails] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  // ✅ Vendor/credit records (paid_amount + payments) - inventory purchased ke liye
  const [creditRecords, setCreditRecords] = useState([]);
  
  const [filteredSalesData, setFilteredSalesData] = useState({ total: 0, items: 0, count: 0, profit: 0, discount: 0, details: [] });
  const [filteredExpenseData, setFilteredExpenseData] = useState([]);
  const [filteredStats, setFilteredStats] = useState({
    expenses: 0,
    expenseCount: 0,
    profit: 0,
    discount: 0
  });
  
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

  const getFilterLabel = useCallback(() => {
    const labels = {
      all: 'All Time',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      custom: `Custom: ${customDate || 'Select Date'}`
    };
    return labels[timeFilter] || 'All Time';
  }, [timeFilter, customDate]);

  const handleCustomDateChange = (e) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      setTimeFilter('custom');
      setShowCustomDate(true);
    }
  };

  const toggleCustomDate = () => {
    setShowCustomDate(!showCustomDate);
  };

  const clearCustomDate = () => {
    setCustomDate('');
    setTimeFilter('all');
    setShowCustomDate(false);
  };

  const calculateFilteredData = useCallback((invoicesList, expensesList, productsMap) => {
    const filteredInvoices = filterInvoicesByDate(invoicesList, timeFilter, customDate || null);
    const filteredExpenses = filterExpensesByDate(expensesList, timeFilter, customDate || null);
    
    let total = 0, items = 0, profit = 0, discount = 0, details = [];
    
    filteredInvoices.forEach(inv => {
      const nonBatteryItems = getNonBatteryItems(inv.items);
      
      if (nonBatteryItems.length === 0) {
        return;
      }
      
      let invTotal = 0;
      let invProfit = 0;
      let itemCount = 0;
      let invDiscount = parseFloat(inv.discount) || 0;
      
      nonBatteryItems.forEach(item => {
        const itemQty = parseInt(item.quantity) || 0;
        const itemPrice = parseFloat(item.price) || 0;
        itemCount += itemQty;
        invTotal += itemPrice * itemQty;
        
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
      
      total += invTotal;
      items += itemCount;
      profit += invProfit;
      discount += invDiscount;
      
      details.push({
        invoiceNo: inv.invoice_no,
        customer: inv.customer_name,
        date: inv.invoice_date,
        total: invTotal,
        profit: invProfit,
        discount: invDiscount,
        items: nonBatteryItems,
        itemCount: itemCount
      });
    });
    
    let expenseTotal = 0;
    let expenseList = [];
    filteredExpenses.forEach(exp => {
      const amount = parseFloat(exp.amount) || 0;
      expenseTotal += amount;
      expenseList.push({
        id: exp.id,
        description: exp.description,
        amount: amount,
        date: exp.expense_date || exp.date || exp.created_at,
        category: exp.category
      });
    });
    
    return {
      sales: { total, items, count: details.length, profit, discount, details },
      expenses: expenseList,
      expenseTotal: expenseTotal,
      expenseCount: expenseList.length
    };
  }, [timeFilter, customDate]);

  // ✅ Products API response shape ko safely handle karega
  // (seedha array, { data: [...] }, { products: [...] } - teeno cases)
  const fetchProducts = useCallback(async (signal) => {
    try {
      const response = await api.get('/products', { signal });
      const raw = response.data;

      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.products)
        ? raw.products
        : [];

      setProducts(list);
      return list;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching products:', err);
      }
      return [];
    }
  }, []);

  // ✅ Credit vendor records (paid_amount + payments) - vendor ko diye hue paisay ke liye
  const fetchCreditRecords = useCallback(async (signal) => {
    try {
      const response = await api.get('/credit/vendors', { signal });
      const raw = response.data;

      const list = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];

      setCreditRecords(list);
      return list;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching credit vendors:', err);
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
        fetchInvoices(abortController.signal),
        fetchCreditRecords(abortController.signal)
      ]);
      
      const productsMap = new Map();
      productsList.forEach(p => {
        productsMap.set(p.name, p);
      });
      
      const filtered = calculateFilteredData(invoicesList, expensesList, productsMap);
      setFilteredSalesData(filtered.sales);
      setFilteredExpenseData(filtered.expenses);
      setFilteredStats({
        expenses: filtered.expenseTotal,
        expenseCount: filtered.expenseCount,
        // ✅ Net Profit = Sales Profit - (Expenses + Discount Given)
        profit: filtered.sales.profit - (filtered.expenseTotal + filtered.sales.discount),
        discount: filtered.sales.discount
      });
      
      // 🕒 Karachi ke hisab se aaj / hafta / mahina
      const todayStr = getKarachiToday();
      const weekStartStr = getWeekStartStr();
      const monthStartStr = getMonthStartStr();
      
      let todayTotal = 0, todayItems = 0, todayProfit = 0, todayDiscount = 0, todayDetails = [];
      let weekTotal = 0, weekItems = 0, weekProfit = 0, weekDiscount = 0, weekDetails = [];
      let monthTotal = 0, monthItems = 0, monthProfit = 0, monthDiscount = 0, monthDetails = [];
      
      invoicesList.forEach(inv => {
        if (!inv.invoice_date) return;
        
        const nonBatteryItems = getNonBatteryItems(inv.items);
        if (nonBatteryItems.length === 0) return;
        
        const invDay = toKarachiDateStr(inv.invoice_date);
        if (!invDay) return;
        const isToday = invDay === todayStr;
        const isThisWeek = invDay >= weekStartStr && invDay <= todayStr;
        const isThisMonth = invDay >= monthStartStr && invDay <= todayStr;
        
        let invTotal = 0;
        let invProfit = 0;
        let itemCount = 0;
        let invDiscount = parseFloat(inv.discount) || 0;
        
        nonBatteryItems.forEach(item => {
          const itemQty = parseInt(item.quantity) || 0;
          const itemPrice = parseFloat(item.price) || 0;
          itemCount += itemQty;
          invTotal += itemPrice * itemQty;
          
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
        
        const detailItem = {
          invoiceNo: inv.invoice_no,
          customer: inv.customer_name,
          date: inv.invoice_date,
          total: invTotal,
          profit: invProfit,
          discount: invDiscount,
          items: nonBatteryItems,
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
        const rawDate = exp.expense_date || exp.date || exp.created_at;
        const expDay = toKarachiDateStr(rawDate);
        const amount = parseFloat(exp.amount) || 0;
        const expenseItem = {
          id: exp.id,
          description: exp.description,
          amount: amount,
          date: rawDate,
          category: exp.category
        };
        
        if (!expDay) return;
        
        if (expDay === todayStr) {
          todayExp += amount;
          todayExpCount++;
          todayExpList.push(expenseItem);
        }
        if (expDay >= weekStartStr && expDay <= todayStr) {
          weekExp += amount;
          weekExpCount++;
          weekExpList.push(expenseItem);
        }
        if (expDay >= monthStartStr && expDay <= todayStr) {
          monthExp += amount;
          monthExpCount++;
          monthExpList.push(expenseItem);
        }
      });
      
      setTodayExpenseDetails(todayExpList);
      setWeekExpenseDetails(weekExpList);
      setMonthExpenseDetails(monthExpList);
      
      // ✅ Net Profit = Sales Profit - (Expenses + Discount Given)
      const todayNetProfit = todayProfit - (todayExp + todayDiscount);
      const weekNetProfit = weekProfit - (weekExp + weekDiscount);
      const monthNetProfit = monthProfit - (monthExp + monthDiscount);
      
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
        return toKarachiDateStr(inv.invoice_date).slice(0, 4) === String(year);
      });
      
      let yearlyTotal = 0, yearlyItems = 0, yearlyProfit = 0, yearlyDiscount = 0, yearlyDetails = [];
      
      yearInvoices.forEach(inv => {
        const nonBatteryItems = getNonBatteryItems(inv.items);
        if (nonBatteryItems.length === 0) return;
        
        let invTotal = 0;
        let invProfit = 0;
        let itemCount = 0;
        let invDiscount = parseFloat(inv.discount) || 0;
        
        nonBatteryItems.forEach(item => {
          const itemQty = parseInt(item.quantity) || 0;
          const itemPrice = parseFloat(item.price) || 0;
          itemCount += itemQty;
          invTotal += itemPrice * itemQty;
          
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
          items: nonBatteryItems,
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
  }, [selectedYear, fetchProducts, fetchExpenses, fetchInvoices, fetchCreditRecords, calculateFilteredData, timeFilter, customDate]);

  useEffect(() => {
    const cleanup = loadAllData();
    return () => {
      if (cleanup && typeof cleanup === 'function') cleanup();
    };
  }, [loadAllData]);

  const flattenedItems = useMemo(() => {
    const items = [];
    selectedYearData.details.forEach(inv => {
      const nonBatteryItems = getNonBatteryItems(inv.items);
      nonBatteryItems.forEach(item => {
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

  // ✅ Inventory Purchased: cash purchases (poori cost) + vendor ko diye hue paisay (Battery excluded, Karachi time)
  const inventoryCost = useMemo(
    () => getInventoryCost(products, creditRecords, timeFilter, customDate || null),
    [products, creditRecords, timeFilter, customDate]
  );

  const exportToExcel = useCallback(() => {
    if (selectedYearData.details.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }
    
    const exportData = [];
    selectedYearData.details.forEach(inv => {
      const nonBatteryItems = getNonBatteryItems(inv.items);
      nonBatteryItems.forEach(item => {
        exportData.push({
          'Invoice #': inv.invoiceNo,
          'Customer': inv.customer,
          'Date': formatDisplayDate(inv.date),
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
    
    if (exportData.length === 0) {
      toast.error('No non-battery data available for export');
      return;
    }
    
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
      const nonBatteryItems = getNonBatteryItems(inv.items);
      nonBatteryItems.forEach(item => {
        tableData.push([
          inv.invoiceNo,
          inv.customer,
          formatDisplayDate(inv.date),
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
    
    if (tableData.length === 0) {
      toast.error('No non-battery data available for export');
      return;
    }
    
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
      {/* Filter Buttons with Custom Date */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiCalendar className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
        </div>
        <button
          onClick={() => { setTimeFilter('all'); setShowCustomDate(false); }}
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
          onClick={() => { setTimeFilter('today'); setShowCustomDate(false); }}
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
          onClick={() => { setTimeFilter('week'); setShowCustomDate(false); }}
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
          onClick={() => { setTimeFilter('month'); setShowCustomDate(false); }}
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
          onClick={() => { setTimeFilter('year'); setShowCustomDate(false); }}
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
        
        <button
          onClick={() => setShowAllDetails(!showAllDetails)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
            darkMode
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showAllDetails ? <FiChevronUp /> : <FiChevronDown />}
          {showAllDetails ? 'Hide Details' : 'Show Details'}
        </button>

        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getFilterLabel()}</strong>
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
            darkMode 
              ? 'bg-yellow-900/40 text-yellow-300' 
              : 'bg-yellow-50 text-yellow-600'
          }`}>
            (Battery Sales Excluded)
          </span>
        </span>
      </div>

      {/* ✅ Top 5 Cards - ek hi line mein (chhote): Sales, Expenses, Inventory Purchased, Discount Given, Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          compact
          gradient="from-blue-500 to-blue-600"
          icon={FiDollarSign}
          title={`${getFilterLabel()} Sales`}
          mainValue={`Rs. ${filteredSalesData.total.toLocaleString()}`}
          subLines={[
            `${filteredSalesData.items} items sold`,
            `Profit: Rs. ${filteredSalesData.profit.toLocaleString()}`,
            '(Battery sales excluded)'
          ]}
          expanded={showAllDetails}
        />

        <StatCard
          compact
          gradient="from-red-500 to-red-600"
          icon={FiTrendingDown}
          title={`${getFilterLabel()} Expenses`}
          mainValue={`Rs. ${filteredStats.expenses.toLocaleString()}`}
          subLines={[
            `${filteredStats.expenseCount} transactions`
          ]}
          expanded={showAllDetails}
        />

        {/* ✅ 3rd: Inventory Purchased (cash cost + vendor ko diye hue paisay) */}
        <StatCard
          compact
          gradient="from-orange-500 to-orange-600"
          icon={FiPackage}
          title="Inventory Purchased"
          mainValue={`Rs. ${inventoryCost.toLocaleString()}`}
          subLines={[
            'Cash purchases + paid to vendors',
            '(Battery excluded)'
          ]}
          expanded={showAllDetails}
        />

        {/* ✅ 4th: Discount Given */}
        <StatCard
          compact
          gradient="from-sky-400 to-sky-500"
          icon={FiGift}
          title="Discount Given"
          mainValue={`Rs. ${filteredSalesData.discount.toLocaleString()}`}
          subLines={[
            'Given to customers',
            '(Battery sales excluded)'
          ]}
          expanded={showAllDetails}
        />

        {/* ✅ 5th: Profit = Sales Profit - (Expenses + Discount) */}
        <StatCard
          compact
          gradient={filteredStats.profit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}
          icon={FiTrendingUp}
          title={`${getFilterLabel()} Profit`}
          mainValue={`Rs. ${filteredStats.profit.toLocaleString()}`}
          subLines={[
            'After expenses & discount',
            '(Battery sales excluded)'
          ]}
          expanded={showAllDetails}
        />
      </div>

      {showAllDetails && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              gradient="from-blue-500 to-blue-600"
              icon={FiCalendar}
              title="Today's Sales"
              mainValue={`Rs. ${todaySales.total.toLocaleString()}`}
              onClick={() => setShowTodayDetails(!showTodayDetails)}
              subLines={[
                `${todaySales.items} items sold`,
                `Profit: Rs. ${todaySales.profit.toLocaleString()}`,
                'Click for details',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-blue-500 to-blue-600"
              icon={FiTrendingUp}
              title="This Week's Sales"
              mainValue={`Rs. ${weeklySales.total.toLocaleString()}`}
              onClick={() => setShowWeekDetails(!showWeekDetails)}
              subLines={[
                `${weeklySales.items} items sold`,
                `Profit: Rs. ${weeklySales.profit.toLocaleString()}`,
                'Click for details',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-blue-500 to-blue-600"
              icon={FiDollarSign}
              title="This Month's Sales"
              mainValue={`Rs. ${monthlySales.total.toLocaleString()}`}
              onClick={() => setShowMonthDetails(!showMonthDetails)}
              subLines={[
                `${monthlySales.items} items sold`,
                `Profit: Rs. ${monthlySales.profit.toLocaleString()}`,
                'Click for details',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />
          </div>

          {showTodayDetails && <InvoiceDetails title="Today's Sales" data={todaySales} darkMode={darkMode} onClose={() => setShowTodayDetails(false)} />}
          {showWeekDetails && <InvoiceDetails title="This Week's Sales" data={weeklySales} darkMode={darkMode} onClose={() => setShowWeekDetails(false)} />}
          {showMonthDetails && <InvoiceDetails title="This Month's Sales" data={monthlySales} darkMode={darkMode} onClose={() => setShowMonthDetails(false)} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              gradient="from-red-500 to-red-600"
              icon={FiTrendingDown}
              title="Today's Expenses"
              mainValue={`Rs. ${stats.todayExpenses.toLocaleString()}`}
              onClick={() => setShowTodayExpenses(!showTodayExpenses)}
              subLines={[
                `${stats.todayExpenseCount} transactions`,
                'Click for details'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-red-500 to-red-600"
              icon={FiTrendingDown}
              title="This Week's Expenses"
              mainValue={`Rs. ${stats.weekExpenses.toLocaleString()}`}
              onClick={() => setShowWeekExpenses(!showWeekExpenses)}
              subLines={[
                `${stats.weekExpenseCount} transactions`,
                'Click for details'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-red-500 to-red-600"
              icon={FiTrendingDown}
              title="This Month's Expenses"
              mainValue={`Rs. ${stats.monthExpenses.toLocaleString()}`}
              onClick={() => setShowMonthExpenses(!showMonthExpenses)}
              subLines={[
                `${stats.monthExpenseCount} transactions`,
                'Click for details'
              ]}
              expanded={true}
            />
          </div>

          {showTodayExpenses && <ExpenseDetails title="Today's Expenses" expenses={todayExpenseDetails} darkMode={darkMode} onClose={() => setShowTodayExpenses(false)} />}
          {showWeekExpenses && <ExpenseDetails title="This Week's Expenses" expenses={weekExpenseDetails} darkMode={darkMode} onClose={() => setShowWeekExpenses(false)} />}
          {showMonthExpenses && <ExpenseDetails title="This Month's Expenses" expenses={monthExpenseDetails} darkMode={darkMode} onClose={() => setShowMonthExpenses(false)} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              gradient="from-green-500 to-green-600"
              icon={FiTrendingUp}
              title="Today's Profit"
              mainValue={`Rs. ${stats.todayProfit?.toLocaleString() || 0}`}
              subLines={[
                'After expenses & discount',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-green-500 to-green-600"
              icon={FiTrendingUp}
              title="This Week's Profit"
              mainValue={`Rs. ${stats.weekProfit?.toLocaleString() || 0}`}
              subLines={[
                'After expenses & discount',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-green-500 to-green-600"
              icon={FiTrendingUp}
              title="This Month's Profit"
              mainValue={`Rs. ${stats.monthProfit?.toLocaleString() || 0}`}
              subLines={[
                'After expenses & discount',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              gradient="from-sky-400 to-sky-500"
              icon={FiGift}
              title="Today's Discount"
              mainValue={`Rs. ${stats.todayDiscount?.toLocaleString() || 0}`}
              subLines={[
                'Given today',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-sky-400 to-sky-500"
              icon={FiGift}
              title="This Week's Discount"
              mainValue={`Rs. ${stats.weekDiscount?.toLocaleString() || 0}`}
              subLines={[
                'Given this week',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />

            <StatCard
              gradient="from-sky-400 to-sky-500"
              icon={FiGift}
              title="This Month's Discount"
              mainValue={`Rs. ${stats.monthDiscount?.toLocaleString() || 0}`}
              subLines={[
                'Given this month',
                '(Battery sales excluded)'
              ]}
              expanded={true}
            />
          </div>
        </>
      )}

      {/* Monthly Breakdown - Net Profit = Sales Profit - (Expenses + Discount) */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 flex-wrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <FiBarChart2 className="text-red-500" /> Monthly Financial Summary
          <span className={`text-xs font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ({getFilterLabel()})
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            darkMode 
              ? 'bg-yellow-900/40 text-yellow-300' 
              : 'bg-yellow-50 text-yellow-600'
          }`}>
            (Battery Excluded)
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Revenue</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>Rs. {filteredSalesData.total.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Expenses</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Rs. {filteredStats.expenses.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Discount Given</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-sky-400' : 'text-sky-500'}`}>Rs. {filteredStats.discount.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Net Profit</p>
            <p className={`text-xl font-bold ${filteredStats.profit >= 0 ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-red-400' : 'text-red-500')}`}>
              Rs. {filteredStats.profit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Yearly Report Section with Pagination */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button onClick={() => setShowYearlyReport(!showYearlyReport)} className={`w-full px-6 py-4 flex justify-between items-center transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <FiBarChart2 className="text-red-500 text-xl" />
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📊 Yearly Sales Report</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              darkMode 
                ? 'bg-yellow-900/40 text-yellow-300' 
                : 'bg-yellow-50 text-yellow-600'
            }`}>Battery Excluded</span>
          </div>
          {showYearlyReport ? <FiChevronUp className={darkMode ? 'text-gray-300' : 'text-gray-700'} /> : <FiChevronDown className={darkMode ? 'text-gray-300' : 'text-gray-700'} />}
        </button>
        
        {showYearlyReport && (
          <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex gap-3 items-center">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Year:</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                  className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                >
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
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Sales</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>Rs. {selectedYearData.total.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>(Battery Excluded)</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Invoices</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedYearData.count}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>(Non-Battery Only)</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Profit</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>Rs. {selectedYearData.profit.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>(Battery Excluded)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Purchase</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Sell</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Unit Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Total Profit</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="10" className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No non-battery invoices found</td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={idx} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDisplayDate(item.inv.date)}</td>
                        <td className={`px-4 py-3 font-mono text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.inv.invoiceNo}</td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.inv.customer}</td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.service_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.isProduct 
                              ? darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700' 
                              : darkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.isProduct ? 'Product' : 'Service'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.quantity}</td>
                        <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}</td>
                        <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rs. {item.price.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right ${darkMode ? 'text-green-400' : 'text-green-500'}`}>+ Rs. {item.unitProfit.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right ${darkMode ? 'text-green-400' : 'text-green-500'}`}>Rs. {(item.unitProfit * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className={darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}>
                  <tr>
                    <td colSpan="9" className="px-4 py-3 text-right font-bold">Total Profit:</td>
                    <td className={`px-4 py-3 text-right font-bold ${darkMode ? 'text-green-400' : 'text-green-500'}`}>Rs. {selectedYearData.profit.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={`flex justify-between items-center mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-wrap gap-3`}>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} items
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg flex items-center gap-1 transition ${
                      currentPage === 1
                        ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

      {error && (
        <div className={`p-4 rounded-lg text-center ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
          <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-700'}`}>⚠️ {error}</p>
        </div>
      )}
    </div>
  );
};

export default FinanceOverview;