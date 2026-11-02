// src/components/finance/FinanceOverview.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCalendar, FiTrendingUp, FiDollarSign, FiBarChart2, FiChevronDown, FiChevronUp, FiDownload, FiFileText, FiLoader, FiTrendingDown, FiChevronLeft, FiChevronRight, FiGift } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ============================================================
// 🎨 SHARED THEME HELPERS
// Every card/box uses the same colors (same look as the Inventory page)
// ============================================================
const cardClass = (darkMode) =>
  `border rounded-2xl shadow-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`;

const innerBoxClass = (darkMode) =>
  `border rounded-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`;

const iconTileClass = (darkMode) =>
  darkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600';

const strongText = (darkMode) => (darkMode ? 'text-white' : 'text-gray-900');
const mutedText = (darkMode) => (darkMode ? 'text-gray-400' : 'text-gray-500');
const bodyText = (darkMode) => (darkMode ? 'text-gray-300' : 'text-gray-700');

// ============================================================
// 💼 SALARY HELPERS (same rule as the Dashboard)
// Salary + Advance = expense, Loan = NOT an expense (money that comes back)
// ============================================================
const isLoanPayment = (p) =>
  String(p?.payment_type || p?.type || '').toLowerCase().includes('loan');

// Converts employee salary/advance payments into expense entries
const salaryPaymentsAsExpenses = (employees) => {
  const list = [];
  (Array.isArray(employees) ? employees : []).forEach(emp => {
    (Array.isArray(emp?.payments) ? emp.payments : []).forEach(p => {
      if (!p || isLoanPayment(p)) return;
      const isAdvance = String(p?.payment_type || p?.type || '').toLowerCase().includes('advance');
      list.push({
        id: `salary-${emp.id}-${p.id}`,
        description: `${isAdvance ? 'Advance' : 'Salary'} - ${emp.name}`,
        category: isAdvance ? 'Advance' : 'Salary',
        amount: parseFloat(p.amount) || 0,
        date: p.payment_date || p.date || p.created_at,
        isSalary: true
      });
    });
  });
  return list;
};

// ============================================================
// 🕒 KARACHI TIMEZONE HELPERS (Asia/Karachi, UTC+5, no DST)
// All date filtering uses 'YYYY-MM-DD' strings computed in Karachi time,
// so the browser/server timezone has no effect on the results.
// ============================================================
const KARACHI_TZ = 'Asia/Karachi';

const karachiFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KARACHI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Converts any date value to a Karachi 'YYYY-MM-DD' string
const toKarachiDateStr = (value) => {
  if (!value) return '';
  const str = String(value).trim();

  // Date only: return as is (already a calendar date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Has a time but no timezone (e.g. "2026-09-29 00:30:00") -> treat as Karachi time
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/i.test(str);
  if (!hasTz && /^\d{4}-\d{2}-\d{2}[ T]/.test(str)) return str.substring(0, 10);

  // ISO with Z / offset -> convert to Karachi
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return karachiFormatter.format(d);
};

// Today's date (Karachi)
const getKarachiToday = () => karachiFormatter.format(new Date());

// Monday of the current week (Karachi)
const getWeekStartStr = () => {
  const d = new Date(`${getKarachiToday()}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
};

// First day of the current month (Karachi)
const getMonthStartStr = () => `${getKarachiToday().slice(0, 8)}01`;

// First day of the current year (Karachi)
const getYearStartStr = () => `${getKarachiToday().slice(0, 4)}-01-01`;

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' for display
const formatDisplayDate = (value) => {
  const s = toKarachiDateStr(value);
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

// ============================================================
// ✅ SALES / PROFIT LOGIC (exactly the same as the Dashboard)
//  - Battery and Old Battery Sale are included in sales
//  - Trade-in (buying an old battery from a customer) is not a sale; its amount is deducted from profit
//  - The old battery value given as a trade-in discount is not counted as a real Discount,
//    but it is deducted from profit
//  - Buying inventory / paying vendors is NOT counted as an expense
// ============================================================

// Is the discount on this invoice actually a battery trade-in?
const isTradeInInvoice = (inv) => {
  const note = (inv?.discount_note || '').toLowerCase();
  if (note.includes('trade-in') || note.includes('old battery purchase')) return true;

  const items = Array.isArray(inv?.items) ? inv.items : [];
  return items.length > 0 && items.every(it => it && it.service_category === 'Battery');
};

// Calculates and annotates a single invoice line
const buildLine = (item, productsMap) => {
  const qty = parseInt(item.quantity) || 0;
  const price = parseFloat(item.price) || 0;
  const cat = item.service_category;

  // Old battery bought from a customer (cash paid) -> cost
  if (cat === 'Trade-in') {
    return {
      ...item, kind: 'trade-in', qty, purchasePrice: price, sellPrice: 0,
      isProduct: false, lineProfit: -(price * qty), unitProfit: -price,
      salesValue: 0, soldQty: 0
    };
  }

  // Old battery sold -> full amount (the cost was already deducted earlier)
  if (cat === 'Old Battery Sale') {
    return {
      ...item, kind: 'old-sale', qty, purchasePrice: 0, sellPrice: price,
      isProduct: false, lineProfit: price * qty, unitProfit: price,
      salesValue: price * qty, soldQty: qty
    };
  }

  const product = productsMap.get(item.service_name);
  const purchasePrice = product ? (parseFloat(product.purchase_price) || 0) : 0;
  const lineProfit = (price - purchasePrice) * qty;

  return {
    ...item, kind: 'normal', qty, purchasePrice, sellPrice: price,
    isProduct: !!product, lineProfit, unitProfit: qty > 0 ? lineProfit / qty : 0,
    salesValue: price * qty, soldQty: qty
  };
};

// Full calculation for a list of invoices
const aggregateInvoices = (invoicesList, productsMap) => {
  let total = 0, items = 0, profit = 0, discount = 0, tradeIn = 0;
  const details = [];

  (invoicesList || []).forEach(inv => {
    const rawItems = Array.isArray(inv.items) ? inv.items : [];
    const lines = rawItems.filter(Boolean).map(it => buildLine(it, productsMap));

    const invDiscountValue = parseFloat(inv.discount) || 0;
    const tradeInInv = isTradeInInvoice(inv);
    if (tradeInInv) tradeIn += invDiscountValue;
    else discount += invDiscountValue;

    if (lines.length === 0) return;

    const invTotal = lines.reduce((s, l) => s + l.salesValue, 0);
    const invProfit = lines.reduce((s, l) => s + l.lineProfit, 0);
    const itemCount = lines.reduce((s, l) => s + l.soldQty, 0);

    total += invTotal;
    items += itemCount;
    profit += invProfit;

    details.push({
      invoiceNo: inv.invoice_no,
      customer: inv.customer_name,
      date: inv.invoice_date,
      total: invTotal,
      profit: invProfit,
      discount: tradeInInv ? 0 : invDiscountValue,
      tradeIn: tradeInInv ? invDiscountValue : 0,
      items: lines,
      itemCount
    });
  });

  return { total, items, count: details.length, profit, discount, tradeIn, details };
};

// Net Profit = Line profit - Expenses - Real Discount - Trade-in (same as the Dashboard)
const netProfitOf = (agg, expenses = 0) =>
  agg.profit - expenses - agg.discount - agg.tradeIn;

const emptyAgg = { total: 0, items: 0, count: 0, profit: 0, discount: 0, tradeIn: 0, details: [] };

// Helper: get the date range for a filter (Karachi 'YYYY-MM-DD' strings)
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

// Helper: filter invoices by date range
const filterInvoicesByDate = (invoices, filter, customDate = null) => {
  if (filter === 'all' || !invoices || invoices.length === 0) return invoices;
  const range = getDateRange(filter, customDate);
  if (!range) return invoices;

  return invoices.filter(inv => {
    if (!inv.invoice_date) return false;
    return isInRange(toKarachiDateStr(inv.invoice_date), range);
  });
};

// Helper: filter expenses by date range
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

// Display helpers for table rows
const typeLabel = (item) => {
  if (item.kind === 'old-sale') return 'Old Battery Sale';
  if (item.kind === 'trade-in') return 'Old Battery Purchase';
  return item.isProduct ? 'Product' : 'Service';
};

const formatProfit = (v) => `${v < 0 ? '- ' : '+ '}Rs. ${Math.abs(v).toLocaleString()}`;

const TypeBadge = ({ item, darkMode }) => {
  let cls;
  if (item.kind === 'old-sale' || item.kind === 'trade-in') {
    cls = darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700';
  } else if (item.isProduct) {
    cls = darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700';
  } else {
    cls = darkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700';
  }
  return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{typeLabel(item)}</span>;
};

const profitColor = (v, darkMode) =>
  v >= 0
    ? (darkMode ? 'text-green-400' : 'text-green-500')
    : (darkMode ? 'text-red-400' : 'text-red-500');

// ✅ Stat Card - one uniform style for every card (same as the Inventory page)
// compact = smaller card, expanded = show the sub lines
const StatCard = ({ icon: Icon, title, mainValue, subLines = [], onClick, expanded, compact = false, darkMode }) => {
  return (
    <div
      className={`${cardClass(darkMode)} ${compact ? 'p-4' : 'p-5'} min-w-0 transition ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-red-400' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconTileClass(darkMode)}`}>
          <Icon className="text-lg" />
        </div>
        <p className={`text-sm font-semibold truncate ${bodyText(darkMode)}`}>{title}</p>
      </div>

      <p className={`${compact ? 'text-2xl mt-3' : 'text-3xl mt-4'} font-bold break-words ${strongText(darkMode)}`}>
        {mainValue}
      </p>

      {subLines.length > 0 && (
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'
          }`}
        >
          {subLines.map((line, i) => (
            <p key={i} className={`text-xs mt-1 ${mutedText(darkMode)}`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// Memoized Invoice Details component
const InvoiceDetails = React.memo(({ title, data, darkMode, onClose }) => {
  const allItems = useMemo(() => {
    const items = [];
    (data?.details || []).forEach(inv => {
      inv.items.forEach(item => {
        items.push({ ...item, inv });
      });
    });
    return items;
  }, [data?.details]);

  if (!data?.details || data.details.length === 0 || allItems.length === 0) {
    return (
      <div className={`mt-4 p-4 text-center ${innerBoxClass(darkMode)} ${mutedText(darkMode)}`}>
        <p>No sales data available</p>
      </div>
    );
  }

  const deductions = (data.discount || 0) + (data.tradeIn || 0);

  return (
    <div className={`mt-4 p-4 space-y-3 ${cardClass(darkMode)}`}>
      <div className="flex justify-between items-center">
        <h4 className={`font-semibold ${strongText(darkMode)}`}>📋 {title}</h4>
        <button onClick={onClose} className={`text-lg ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>✕</button>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className={`w-full text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
            <tr className={bodyText(darkMode)}>
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
              <tr key={idx} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                <td className={`px-3 py-2 font-medium ${strongText(darkMode)}`}>{item.service_name}</td>
                <td className="px-3 py-2"><TypeBadge item={item} darkMode={darkMode} /></td>
                <td className={`px-3 py-2 text-right ${bodyText(darkMode)}`}>
                  {item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}
                </td>
                <td className={`px-3 py-2 text-right ${bodyText(darkMode)}`}>
                  {item.sellPrice > 0 ? `Rs. ${item.sellPrice.toLocaleString()}` : '-'}
                </td>
                <td className={`px-3 py-2 text-center font-semibold ${strongText(darkMode)}`}>{item.qty}</td>
                <td className={`px-3 py-2 text-right font-semibold ${profitColor(item.unitProfit, darkMode)}`}>
                  {formatProfit(item.unitProfit)}
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${profitColor(item.lineProfit, darkMode)}`}>
                  {formatProfit(item.lineProfit)}
                </td>
                <td className={`px-3 py-2 text-xs ${mutedText(darkMode)}`}>{item.inv.customer}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}>
            <tr>
              <td colSpan="6" className="px-3 py-2 text-right font-bold">Total:</td>
              <td className={`px-3 py-2 text-right font-bold ${profitColor(data.profit, darkMode)}`}>Rs. {data.profit.toLocaleString()}</td>
              <td></td>
            </tr>
            {deductions > 0 && (
              <>
                <tr>
                  <td colSpan="6" className="px-3 py-2 text-right font-bold">Less: Discount / Trade-in:</td>
                  <td className={`px-3 py-2 text-right font-bold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>- Rs. {deductions.toLocaleString()}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="6" className="px-3 py-2 text-right font-bold">Net:</td>
                  <td className={`px-3 py-2 text-right font-bold ${profitColor(data.profit - deductions, darkMode)}`}>Rs. {(data.profit - deductions).toLocaleString()}</td>
                  <td></td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
});

// Memoized Expense Details component
const ExpenseDetails = React.memo(({ title, expenses, darkMode, onClose }) => {
  const totalAmount = useMemo(() =>
    (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0),
    [expenses]
  );

  if (!expenses || expenses.length === 0) {
    return (
      <div className={`mt-4 p-4 text-center ${innerBoxClass(darkMode)} ${mutedText(darkMode)}`}>
        <p>No expense data available</p>
      </div>
    );
  }

  return (
    <div className={`mt-4 p-4 space-y-3 ${cardClass(darkMode)}`}>
      <div className="flex justify-between items-center">
        <h4 className={`font-semibold ${strongText(darkMode)}`}>📋 {title}</h4>
        <button onClick={onClose} className={`text-lg ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>✕</button>
      </div>
      <div className="overflow-x-auto max-h-96">
        <table className={`w-full text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
            <tr className={bodyText(darkMode)}>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {expenses.map((exp, idx) => (
              <tr key={idx} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                <td className={`px-3 py-2 font-medium ${strongText(darkMode)}`}>{exp.description}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                    {exp.category || 'General'}
                  </span>
                </td>
                <td className={`px-3 py-2 text-sm ${bodyText(darkMode)}`}>{formatDisplayDate(exp.date || exp.expense_date)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Rs. {exp.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}>
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

const TIME_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

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

  const [filteredSalesData, setFilteredSalesData] = useState(emptyAgg);
  const [filteredStats, setFilteredStats] = useState({
    expenses: 0,
    expenseCount: 0,
    salary: 0,
    salaryCount: 0,
    profit: 0,
    discount: 0
  });

  const [todaySales, setTodaySales] = useState(emptyAgg);
  const [weeklySales, setWeeklySales] = useState(emptyAgg);
  const [monthlySales, setMonthlySales] = useState(emptyAgg);
  const [selectedYearData, setSelectedYearData] = useState(emptyAgg);

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

  const pillClass = (active) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      active
        ? 'bg-red-500 text-white shadow-md'
        : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  const calculateFilteredData = useCallback((invoicesList, expensesList, productsMap) => {
    const filteredInvoices = filterInvoicesByDate(invoicesList, timeFilter, customDate || null);
    const filteredExpenses = filterExpensesByDate(expensesList, timeFilter, customDate || null);

    const sales = aggregateInvoices(filteredInvoices, productsMap);

    let expenseTotal = 0;
    let salaryTotal = 0;
    let salaryCount = 0;
    const expenseList = [];
    filteredExpenses.forEach(exp => {
      const amount = parseFloat(exp.amount) || 0;
      expenseTotal += amount;
      if (exp.isSalary) {
        salaryTotal += amount;
        salaryCount++;
      }
      expenseList.push({
        id: exp.id,
        description: exp.description,
        amount: amount,
        date: exp.expense_date || exp.date || exp.created_at,
        category: exp.category
      });
    });

    return {
      sales,
      expenses: expenseList,
      expenseTotal: expenseTotal,
      expenseCount: expenseList.length,
      salaryTotal,
      salaryCount
    };
  }, [timeFilter, customDate]);

  // Safely handles the different shapes the products API can return
  const fetchProducts = useCallback(async (signal) => {
    try {
      const response = await api.get('/products', { signal });
      const raw = response.data;

      return Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.products)
        ? raw.products
        : [];
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching products:', err);
      }
      return [];
    }
  }, []);

  // Employees (salary + advance payments come from here) - same route as the Dashboard
  const fetchEmployees = useCallback(async (signal) => {
    try {
      const response = await api.get('/employees', { signal });
      const raw = response.data;
      return Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching employees:', err);
      }
      return [];
    }
  }, []);

  const fetchExpenses = useCallback(async (signal) => {
    try {
      const response = await api.get('/expenses', { signal });
      if (response.data && Array.isArray(response.data)) {
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
      const [productsList, manualExpenses, invoicesList, employeesList] = await Promise.all([
        fetchProducts(abortController.signal),
        fetchExpenses(abortController.signal),
        fetchInvoices(abortController.signal),
        fetchEmployees(abortController.signal)
      ]);

      // Manual expenses + Salary/Advance payments (loans are excluded)
      // Inventory purchases / vendor payments are NOT included here
      const expensesList = [...manualExpenses, ...salaryPaymentsAsExpenses(employeesList)];

      const productsMap = new Map();
      productsList.forEach(p => {
        productsMap.set(p.name, p);
      });

      // ----- Selected filter (All Time / Today / ...) -----
      const filtered = calculateFilteredData(invoicesList, expensesList, productsMap);
      setFilteredSalesData(filtered.sales);
      setFilteredStats({
        expenses: filtered.expenseTotal,
        expenseCount: filtered.expenseCount,
        salary: filtered.salaryTotal,
        salaryCount: filtered.salaryCount,
        // Net Profit (same as the Dashboard)
        profit: netProfitOf(filtered.sales, filtered.expenseTotal),
        discount: filtered.sales.discount
      });

      // 🕒 Today / week / month based on Karachi time
      const todayStr = getKarachiToday();
      const weekStartStr = getWeekStartStr();
      const monthStartStr = getMonthStartStr();

      const dayOf = (inv) => toKarachiDateStr(inv.invoice_date);

      const todayAgg = aggregateInvoices(
        invoicesList.filter(inv => dayOf(inv) === todayStr), productsMap
      );
      const weekAgg = aggregateInvoices(
        invoicesList.filter(inv => { const d = dayOf(inv); return d && d >= weekStartStr && d <= todayStr; }), productsMap
      );
      const monthAgg = aggregateInvoices(
        invoicesList.filter(inv => { const d = dayOf(inv); return d && d >= monthStartStr && d <= todayStr; }), productsMap
      );

      setTodaySales(todayAgg);
      setWeeklySales(weekAgg);
      setMonthlySales(monthAgg);

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

      setStats({
        todayExpenses: todayExp,
        todayExpenseCount: todayExpCount,
        weekExpenses: weekExp,
        weekExpenseCount: weekExpCount,
        monthExpenses: monthExp,
        monthExpenseCount: monthExpCount,
        todayProfit: netProfitOf(todayAgg, todayExp),
        weekProfit: netProfitOf(weekAgg, weekExp),
        monthProfit: netProfitOf(monthAgg, monthExp),
        todayDiscount: todayAgg.discount,
        weekDiscount: weekAgg.discount,
        monthDiscount: monthAgg.discount
      });

      // ----- Selected year -----
      const yearInvoices = invoicesList.filter(inv => {
        if (!inv.invoice_date) return false;
        return toKarachiDateStr(inv.invoice_date).slice(0, 4) === String(selectedYear);
      });

      const yearAgg = aggregateInvoices(yearInvoices, productsMap);
      setSelectedYearData({ ...yearAgg, count: yearInvoices.length });
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
  }, [selectedYear, fetchProducts, fetchExpenses, fetchInvoices, fetchEmployees, calculateFilteredData, timeFilter, customDate]);

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

  // Selected year: only Discount + Trade-in are deducted (same as the Dashboard)
  const yearDeductions = (selectedYearData.discount || 0) + (selectedYearData.tradeIn || 0);
  const yearNetProfit = selectedYearData.profit - yearDeductions;

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

  // ✅ Expenses = only manual expenses + Salary/Advance (no inventory / vendor payments)
  const totalExpenses = filteredStats.expenses;

  // ✅ Final Profit = Sales Profit - (Expenses + Discount + Trade-in)
  const finalProfit = filteredStats.profit;

  const exportToExcel = useCallback(() => {
    if (flattenedItems.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }

    const exportData = flattenedItems.map(item => ({
      'Invoice #': item.inv.invoiceNo,
      'Customer': item.inv.customer,
      'Date': formatDisplayDate(item.inv.date),
      'Item': item.service_name,
      'Type': typeLabel(item),
      'Quantity': item.qty,
      'Purchase Price': item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : 'N/A',
      'Selling Price': item.sellPrice > 0 ? `Rs. ${item.sellPrice.toLocaleString()}` : 'N/A',
      'Unit Profit': `Rs. ${item.unitProfit.toLocaleString()}`,
      'Total Profit': `Rs. ${item.lineProfit.toLocaleString()}`
    }));

    exportData.push({
      'Invoice #': 'TOTAL (After Discount & Trade-in)',
      'Customer': '', 'Date': '', 'Item': '', 'Type': '', 'Quantity': '',
      'Purchase Price': '', 'Selling Price': '', 'Unit Profit': '',
      'Total Profit': `Rs. ${yearNetProfit.toLocaleString()}`
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Year_${selectedYear}_Report`);
    XLSX.writeFile(wb, `Year_${selectedYear}_Sales_Report.xlsx`);
    toast.success(`Exported to Excel for year ${selectedYear}`);
  }, [flattenedItems, selectedYear, yearNetProfit]);

  const exportToPDF = useCallback(() => {
    if (flattenedItems.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }

    const doc = new jsPDF('landscape');
    doc.text(`Sales Report for Year ${selectedYear}`, 14, 10);
    const tableData = flattenedItems.map(item => [
      item.inv.invoiceNo,
      item.inv.customer,
      formatDisplayDate(item.inv.date),
      item.service_name,
      typeLabel(item),
      item.qty,
      item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-',
      item.sellPrice > 0 ? `Rs. ${item.sellPrice.toLocaleString()}` : '-',
      `Rs. ${item.unitProfit.toLocaleString()}`,
      `Rs. ${item.lineProfit.toLocaleString()}`
    ]);

    tableData.push(['TOTAL (After Discount & Trade-in)', '', '', '', '', '', '', '', '', `Rs. ${yearNetProfit.toLocaleString()}`]);

    doc.autoTable({
      head: [['Invoice', 'Customer', 'Date', 'Item', 'Type', 'Qty', 'Purchase', 'Sell', 'Unit Profit', 'Total Profit']],
      body: tableData,
      startY: 20,
    });
    doc.save(`Year_${selectedYear}_Sales_Report.pdf`);
    toast.success(`Exported to PDF for year ${selectedYear}`);
  }, [flattenedItems, selectedYear, yearNetProfit]);

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={bodyText(darkMode)}>Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${strongText(darkMode)}`}>
      {/* Filter buttons with custom date */}
      <div className={`flex flex-wrap items-center gap-3 p-4 ${cardClass(darkMode)}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiCalendar className={`text-lg ${mutedText(darkMode)}`} />
          <span className={`text-sm font-medium ${bodyText(darkMode)}`}>Filter:</span>
        </div>

        {TIME_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setTimeFilter(f.id); setShowCustomDate(false); }}
            className={pillClass(timeFilter === f.id)}
          >
            {f.label}
          </button>
        ))}

        <button onClick={toggleCustomDate} className={pillClass(timeFilter === 'custom')}>
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

        <span className={`ml-auto text-xs ${mutedText(darkMode)}`}>
          Showing: <strong className={strongText(darkMode)}>{getFilterLabel()}</strong>
        </span>
      </div>

      {/* Top 4 cards in one row: Sales, Expenses, Discount Given, Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          compact
          darkMode={darkMode}
          icon={FiDollarSign}
          title={`${getFilterLabel()} Sales`}
          mainValue={`Rs. ${filteredSalesData.total.toLocaleString()}`}
          subLines={[
            `${filteredSalesData.items} items sold`,
            `Profit: Rs. ${filteredSalesData.profit.toLocaleString()}`
          ]}
          expanded={showAllDetails}
        />

        {/* Expenses = only manual expenses + Salary/Advance (no inventory / vendor payments) */}
        <StatCard
          compact
          darkMode={darkMode}
          icon={FiTrendingDown}
          title={`${getFilterLabel()} Expenses`}
          mainValue={`Rs. ${totalExpenses.toLocaleString()}`}
          subLines={[
            `Salary: Rs. ${filteredStats.salary.toLocaleString()} (${filteredStats.salaryCount} payments)`,
            `Other: Rs. ${(filteredStats.expenses - filteredStats.salary).toLocaleString()} (${filteredStats.expenseCount - filteredStats.salaryCount} transactions)`
          ]}
          expanded={showAllDetails}
        />

        {/* Discount Given (real discount only, not trade-in) */}
        <StatCard
          compact
          darkMode={darkMode}
          icon={FiGift}
          title="Discount Given"
          mainValue={`Rs. ${filteredSalesData.discount.toLocaleString()}`}
          subLines={[
            'Given to customers'
          ]}
          expanded={showAllDetails}
        />

        {/* Profit = Sales Profit - (Expenses + Discount + Trade-in) */}
        <StatCard
          compact
          darkMode={darkMode}
          icon={FiTrendingUp}
          title={`${getFilterLabel()} Profit`}
          mainValue={`Rs. ${finalProfit.toLocaleString()}`}
          subLines={[
            'After expenses, discount & trade-in'
          ]}
          expanded={showAllDetails}
        />
      </div>

      {showAllDetails && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              darkMode={darkMode}
              icon={FiCalendar}
              title="Today's Sales"
              mainValue={`Rs. ${todaySales.total.toLocaleString()}`}
              onClick={() => setShowTodayDetails(!showTodayDetails)}
              subLines={[
                `${todaySales.items} items sold`,
                `Profit: Rs. ${todaySales.profit.toLocaleString()}`,
                'Click for details'
              ]}
              expanded={true}
            />

            <StatCard
              darkMode={darkMode}
              icon={FiTrendingUp}
              title="This Week's Sales"
              mainValue={`Rs. ${weeklySales.total.toLocaleString()}`}
              onClick={() => setShowWeekDetails(!showWeekDetails)}
              subLines={[
                `${weeklySales.items} items sold`,
                `Profit: Rs. ${weeklySales.profit.toLocaleString()}`,
                'Click for details'
              ]}
              expanded={true}
            />

            <StatCard
              darkMode={darkMode}
              icon={FiDollarSign}
              title="This Month's Sales"
              mainValue={`Rs. ${monthlySales.total.toLocaleString()}`}
              onClick={() => setShowMonthDetails(!showMonthDetails)}
              subLines={[
                `${monthlySales.items} items sold`,
                `Profit: Rs. ${monthlySales.profit.toLocaleString()}`,
                'Click for details'
              ]}
              expanded={true}
            />
          </div>

          {showTodayDetails && <InvoiceDetails title="Today's Sales" data={todaySales} darkMode={darkMode} onClose={() => setShowTodayDetails(false)} />}
          {showWeekDetails && <InvoiceDetails title="This Week's Sales" data={weeklySales} darkMode={darkMode} onClose={() => setShowWeekDetails(false)} />}
          {showMonthDetails && <InvoiceDetails title="This Month's Sales" data={monthlySales} darkMode={darkMode} onClose={() => setShowMonthDetails(false)} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              darkMode={darkMode}
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
              darkMode={darkMode}
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
              darkMode={darkMode}
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
              darkMode={darkMode}
              icon={FiTrendingUp}
              title="Today's Profit"
              mainValue={`Rs. ${stats.todayProfit?.toLocaleString() || 0}`}
              subLines={['After expenses, discount & trade-in']}
              expanded={true}
            />

            <StatCard
              darkMode={darkMode}
              icon={FiTrendingUp}
              title="This Week's Profit"
              mainValue={`Rs. ${stats.weekProfit?.toLocaleString() || 0}`}
              subLines={['After expenses, discount & trade-in']}
              expanded={true}
            />

            <StatCard
              darkMode={darkMode}
              icon={FiTrendingUp}
              title="This Month's Profit"
              mainValue={`Rs. ${stats.monthProfit?.toLocaleString() || 0}`}
              subLines={['After expenses, discount & trade-in']}
              expanded={true}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              darkMode={darkMode}
              icon={FiGift}
              title="Today's Discount"
              mainValue={`Rs. ${stats.todayDiscount?.toLocaleString() || 0}`}
              subLines={['Given today']}
              expanded={true}
            />

            <StatCard
              darkMode={darkMode}
              icon={FiGift}
              title="This Week's Discount"
              mainValue={`Rs. ${stats.weekDiscount?.toLocaleString() || 0}`}
              subLines={['Given this week']}
              expanded={true}
            />

            <StatCard
              darkMode={darkMode}
              icon={FiGift}
              title="This Month's Discount"
              mainValue={`Rs. ${stats.monthDiscount?.toLocaleString() || 0}`}
              subLines={['Given this month']}
              expanded={true}
            />
          </div>
        </>
      )}

      {/* Monthly breakdown - Net Profit = Sales Profit - (Expenses + Discount + Trade-in) */}
      <div className={`${cardClass(darkMode)} p-6`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 flex-wrap ${strongText(darkMode)}`}>
          <FiBarChart2 className="text-red-500" /> Monthly Financial Summary
          <span className={`text-xs font-normal ${mutedText(darkMode)}`}>
            ({getFilterLabel()})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 ${innerBoxClass(darkMode)}`}>
            <p className={`text-sm ${mutedText(darkMode)}`}>Sales</p>
            <p className={`text-xl font-bold ${strongText(darkMode)}`}>Rs. {filteredSalesData.total.toLocaleString()}</p>
          </div>
          {/* Expenses = only manual expenses + Salary/Advance */}
          <div className={`p-4 ${innerBoxClass(darkMode)}`}>
            <p className={`text-sm ${mutedText(darkMode)}`}>Expenses</p>
            <p className={`text-xl font-bold ${strongText(darkMode)}`}>Rs. {totalExpenses.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${mutedText(darkMode)}`}>
              Salary: Rs. {filteredStats.salary.toLocaleString()} + Other: Rs. {(filteredStats.expenses - filteredStats.salary).toLocaleString()}
            </p>
          </div>
          <div className={`p-4 ${innerBoxClass(darkMode)}`}>
            <p className={`text-sm ${mutedText(darkMode)}`}>Discount Given</p>
            <p className={`text-xl font-bold ${strongText(darkMode)}`}>Rs. {filteredStats.discount.toLocaleString()}</p>
          </div>
          <div className={`p-4 ${innerBoxClass(darkMode)}`}>
            <p className={`text-sm ${mutedText(darkMode)}`}>Net Profit</p>
            <p className={`text-xl font-bold ${strongText(darkMode)}`}>
              Rs. {finalProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Yearly report section with pagination */}
      <div className={`${cardClass(darkMode)} overflow-hidden`}>
        <button onClick={() => setShowYearlyReport(!showYearlyReport)} className={`w-full px-6 py-4 flex justify-between items-center transition ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <FiBarChart2 className="text-red-500 text-xl" />
            <h3 className={`text-lg font-semibold ${strongText(darkMode)}`}>📊 Yearly Sales Report</h3>
          </div>
          {showYearlyReport ? <FiChevronUp className={bodyText(darkMode)} /> : <FiChevronDown className={bodyText(darkMode)} />}
        </button>

        {showYearlyReport && (
          <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex gap-3 items-center">
                <label className={`text-sm font-medium ${bodyText(darkMode)}`}>Select Year:</label>
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
              <div className={`p-4 text-center ${innerBoxClass(darkMode)}`}>
                <p className={`text-sm ${mutedText(darkMode)}`}>Total Sales</p>
                <p className={`text-2xl font-bold ${strongText(darkMode)}`}>Rs. {selectedYearData.total.toLocaleString()}</p>
              </div>
              <div className={`p-4 text-center ${innerBoxClass(darkMode)}`}>
                <p className={`text-sm ${mutedText(darkMode)}`}>Total Invoices</p>
                <p className={`text-2xl font-bold ${strongText(darkMode)}`}>{selectedYearData.count}</p>
              </div>
              <div className={`p-4 text-center ${innerBoxClass(darkMode)}`}>
                <p className={`text-sm ${mutedText(darkMode)}`}>Total Profit</p>
                <p className={`text-2xl font-bold ${strongText(darkMode)}`}>Rs. {yearNetProfit.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${mutedText(darkMode)}`}>(After discount & trade-in)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr className={bodyText(darkMode)}>
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
                      <td colSpan="10" className={`px-4 py-8 text-center ${mutedText(darkMode)}`}>No invoices found</td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={idx} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm ${bodyText(darkMode)}`}>{formatDisplayDate(item.inv.date)}</td>
                        <td className={`px-4 py-3 font-mono text-sm ${strongText(darkMode)}`}>{item.inv.invoiceNo}</td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.inv.customer}</td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.service_name}</td>
                        <td className="px-4 py-3"><TypeBadge item={item} darkMode={darkMode} /></td>
                        <td className={`px-4 py-3 text-center ${bodyText(darkMode)}`}>{item.qty}</td>
                        <td className={`px-4 py-3 text-right ${bodyText(darkMode)}`}>{item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}</td>
                        <td className={`px-4 py-3 text-right ${bodyText(darkMode)}`}>{item.sellPrice > 0 ? `Rs. ${item.sellPrice.toLocaleString()}` : '-'}</td>
                        <td className={`px-4 py-3 text-right ${profitColor(item.unitProfit, darkMode)}`}>{formatProfit(item.unitProfit)}</td>
                        <td className={`px-4 py-3 text-right ${profitColor(item.lineProfit, darkMode)}`}>{formatProfit(item.lineProfit)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className={darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}>
                  <tr>
                    <td colSpan="9" className="px-4 py-3 text-right font-bold">Total Profit:</td>
                    <td className={`px-4 py-3 text-right font-bold ${profitColor(selectedYearData.profit, darkMode)}`}>Rs. {selectedYearData.profit.toLocaleString()}</td>
                  </tr>
                  {yearDeductions > 0 && (
                    <>
                      <tr>
                        <td colSpan="9" className="px-4 py-3 text-right font-bold">Less: Discount / Trade-in:</td>
                        <td className={`px-4 py-3 text-right font-bold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>- Rs. {yearDeductions.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colSpan="9" className="px-4 py-3 text-right font-bold">Net Profit:</td>
                        <td className={`px-4 py-3 text-right font-bold ${profitColor(yearNetProfit, darkMode)}`}>Rs. {yearNetProfit.toLocaleString()}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={`flex justify-between items-center mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-wrap gap-3`}>
                <div className={`text-sm ${mutedText(darkMode)}`}>
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