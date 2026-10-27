// src/components/finance/FinanceOverview.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCalendar, FiTrendingUp, FiDollarSign, FiPackage, FiBarChart2, FiChevronDown, FiChevronUp, FiDownload, FiFileText, FiLoader, FiTrendingDown, FiChevronLeft, FiChevronRight, FiGift } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ============================================================
// OLD BATTERY API ENDPOINT (Dashboard wala hi route)
// ============================================================
const OLD_BATTERY_ENDPOINT = '/old-batteries';

// ============================================================
// 💼 SALARY HELPERS (Dashboard jaisa hi rule)
// Salary + Advance = expense, Loan = expense NAHI (wapas aane wala paisa)
// ============================================================
const isLoanPayment = (p) =>
  String(p?.payment_type || p?.type || '').toLowerCase().includes('loan');

// Employees ki salary/advance payments ko expense-entries mein badalta hai
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

// ============================================================
// ✅ SALES / PROFIT LOGIC (Dashboard ke bilkul barabar)
//  - Battery aur Old Battery Sale sales mein shamil
//  - Trade-in (customer se old battery khareedna) sales mein nahi, uski raqam profit se minus
//  - Battery bechte waqt old battery ki value (trade-in discount) asli Discount mein nahi ginti,
//    magar profit se kat jati hai
//  - Old Battery ki khareedi (trade_in_amount) Expenses / Inventory Purchased mein dikhti hai.
//    Profit se ALAG minus NAHI hoti, kyunke woh Trade-in line / trade-in discount se pehle hi cut chuki hoti hai
//    (Dashboard ki tarah)
// ============================================================

// Kya is invoice ka discount asal mein battery trade-in hai?
const isTradeInInvoice = (inv) => {
  const note = (inv?.discount_note || '').toLowerCase();
  if (note.includes('trade-in') || note.includes('old battery purchase')) return true;

  const items = Array.isArray(inv?.items) ? inv.items : [];
  return items.length > 0 && items.every(it => it && it.service_category === 'Battery');
};

// Inventory se bike hue items (Trade-in aur Old Battery Sale inventory ka maal nahi)
const getSoldInventoryItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item =>
    item &&
    item.service_category !== 'Trade-in' &&
    item.service_category !== 'Old Battery Sale'
  );
};

// Ek invoice line ko calculate karke annotate karta hai
const buildLine = (item, productsMap) => {
  const qty = parseInt(item.quantity) || 0;
  const price = parseFloat(item.price) || 0;
  const cat = item.service_category;

  // Customer se old battery khareedi (cash diya) -> cost
  if (cat === 'Trade-in') {
    return {
      ...item, kind: 'trade-in', qty, purchasePrice: price, sellPrice: 0,
      isProduct: false, lineProfit: -(price * qty), unitProfit: -price,
      salesValue: 0, soldQty: 0
    };
  }

  // Purani battery bechi -> poori raqam (cost pehle hi cut chuki hai)
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

// Invoices ki list ka poora hisaab
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

// Net Profit = Lines ka profit - Expenses - Asli Discount - Trade-in  (Dashboard ke barabar)
const netProfitOf = (agg, expenses = 0) =>
  agg.profit - expenses - agg.discount - agg.tradeIn;

const emptyAgg = { total: 0, items: 0, count: 0, profit: 0, discount: 0, tradeIn: 0, details: [] };

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

// ✅ Helper: Inventory Purchased (jo paisay actually nikal chuke hain) - BATTERY bhi shamil
//  1) Cash purchase (vendor se link nahi): purchase_price × KHAREEDI HUI quantity
//     Kharidi hui quantity = abhi ki stock + ab tak bika hua maal
//  2) Vendor/credit purchase: sirf wo paisay jo vendor ko diye gaye
//     - khareedte waqt diya hua amount -> record ki date par
//     - baad mein Pay Now se diye hue payments -> payment ki date par
const getInventoryCost = (products, creditRecords, invoices, filter, customDate = null) => {
  const range = filter !== 'all' ? getDateRange(filter, customDate) : null;
  const inRange = (raw) => {
    if (!range) return true;
    if (!raw) return false;
    return isInRange(toKarachiDateStr(raw), range);
  };

  // Har product ka ab tak ka total bika hua maal (saare invoices se, date filter ke baghair)
  const soldQtyByName = {};
  (invoices || []).forEach(inv => {
    getSoldInventoryItems(inv.items).forEach(item => {
      const key = item.service_name;
      if (!key) return;
      soldQtyByName[key] = (soldQtyByName[key] || 0) + (parseInt(item.quantity) || 0);
    });
  });

  // 1) Cash products (credit vendor se linked products yahan nahi ginay jayenge)
  const cashProducts = (products || []).filter(p => !p.credit_vendor && !p.credit_vendor_id);

  const cashTotal = cashProducts
    .filter(p => inRange(p.created_at || p.date_added))
    .reduce((sum, p) => {
      const purchasedQty = (parseInt(p.quantity) || 0) + (soldQtyByName[p.name] || 0);
      return sum + (parseFloat(p.purchase_price) || 0) * purchasedQty;
    }, 0);

  // 2) Credit purchases - sirf diye hue paisay
  let creditPaidTotal = 0;
  (creditRecords || []).forEach(rec => {
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

// ✅ Khareedi hui purani batteries ki cost (Dashboard ki tarah)
//  - Price field: trade_in_amount (har record 1 battery hai)
//  - Date field : purchase_date || created_at
//  range = { start, end } ya null (null = All Time)
const getOldBatteryCost = (oldBatteries, range = null) => {
  return (oldBatteries || []).reduce((sum, b) => {
    if (!b) return sum;

    if (range) {
      const raw = b.purchase_date || b.created_at;
      if (!raw || !isInRange(toKarachiDateStr(raw), range)) return sum;
    }

    return sum + (parseFloat(b.trade_in_amount) || 0);
  }, 0);
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

// Memoized Invoice Details Component
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
      <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} text-center`}>
        <p>No sales data available</p>
      </div>
    );
  }

  const deductions = (data.discount || 0) + (data.tradeIn || 0);
  
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
                <td className="px-3 py-2"><TypeBadge item={item} darkMode={darkMode} /></td>
                <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}
                </td>
                <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item.sellPrice > 0 ? `Rs. ${item.sellPrice.toLocaleString()}` : '-'}
                </td>
                <td className={`px-3 py-2 text-center font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.qty}</td>
                <td className={`px-3 py-2 text-right font-semibold ${profitColor(item.unitProfit, darkMode)}`}>
                  {formatProfit(item.unitProfit)}
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${profitColor(item.lineProfit, darkMode)}`}>
                  {formatProfit(item.lineProfit)}
                </td>
                <td className={`px-3 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.inv.customer}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className={darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}>
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
  
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  // Vendor/credit records (paid_amount + payments) - inventory purchased ke liye
  const [creditRecords, setCreditRecords] = useState([]);
  // Khareedi hui purani batteries (cost = trade_in_amount)
  const [oldBatteries, setOldBatteries] = useState([]);
  
  const [filteredSalesData, setFilteredSalesData] = useState(emptyAgg);
  const [filteredExpenseData, setFilteredExpenseData] = useState([]);
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

  // Products API response shape ko safely handle karega
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

  // Credit vendor records (paid_amount + payments) - vendor ko diye hue paisay ke liye
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

  // Old batteries - Dashboard ki tarah status 'all' bhejte hain taake sold wali bhi aayein
  const fetchOldBatteries = useCallback(async (signal) => {
    try {
      const response = await api.get(OLD_BATTERY_ENDPOINT, {
        params: { status: 'all' },
        signal
      });
      const raw = response.data;

      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.batteries)
        ? raw.batteries
        : [];

      setOldBatteries(list);
      return list;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching old batteries:', err);
      }
      return [];
    }
  }, []);

  // Employees (salary + advance payments yahin se aate hain) - Dashboard wala hi route
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
      const [productsList, manualExpenses, invoicesList, , , employeesList] = await Promise.all([
        fetchProducts(abortController.signal),
        fetchExpenses(abortController.signal),
        fetchInvoices(abortController.signal),
        fetchCreditRecords(abortController.signal),
        fetchOldBatteries(abortController.signal),
        fetchEmployees(abortController.signal)
      ]);

      // Manual expenses + Salary/Advance payments (Loan shamil nahi)
      const expensesList = [...manualExpenses, ...salaryPaymentsAsExpenses(employeesList)];
      
      const productsMap = new Map();
      productsList.forEach(p => {
        productsMap.set(p.name, p);
      });
      
      // ----- Selected filter (All Time / Today / ...) -----
      const filtered = calculateFilteredData(invoicesList, expensesList, productsMap);
      setFilteredSalesData(filtered.sales);
      setFilteredExpenseData(filtered.expenses);
      setFilteredStats({
        expenses: filtered.expenseTotal,
        expenseCount: filtered.expenseCount,
        salary: filtered.salaryTotal,
        salaryCount: filtered.salaryCount,
        // Net Profit (Dashboard ke barabar: old battery alag minus nahi hoti)
        profit: netProfitOf(filtered.sales, filtered.expenseTotal),
        discount: filtered.sales.discount
      });
      
      // 🕒 Karachi ke hisab se aaj / hafta / mahina
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
  }, [selectedYear, fetchProducts, fetchExpenses, fetchInvoices, fetchCreditRecords, fetchOldBatteries, fetchEmployees, calculateFilteredData, timeFilter, customDate]);

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

  // Selected year: sirf Discount + Trade-in minus (old battery alag minus nahi, Dashboard ki tarah)
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

  // Selected filter ki old battery khareedi (trade_in_amount)
  const oldBatteryCost = useMemo(
    () => getOldBatteryCost(
      oldBatteries,
      timeFilter !== 'all' ? getDateRange(timeFilter, customDate || null) : null
    ),
    [oldBatteries, timeFilter, customDate]
  );

  // ✅ Inventory Purchased: cash purchases (khareedi hui poori quantity ki cost) + vendor ko diye hue paisay
  //    + old batteries ki khareedi (Karachi time)
  const inventoryCost = useMemo(
    () => getInventoryCost(products, creditRecords, invoices, timeFilter, customDate || null) + oldBatteryCost,
    [products, creditRecords, invoices, timeFilter, customDate, oldBatteryCost]
  );

  // ✅ Expenses card = Manual expenses + Inventory Purchased (old batteries samet)
  const totalExpensesWithInventory = useMemo(
    () => filteredStats.expenses + inventoryCost,
    [filteredStats.expenses, inventoryCost]
  );

  // ✅ Final Profit = Sales Profit - (Manual Expenses + Discount + Trade-in)
  //    Old battery ki cost yahan dobara minus NAHI hoti (Dashboard ke barabar)
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

        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getFilterLabel()}</strong>
        </span>
      </div>

      {/* Top 5 Cards - ek hi line mein (chhote): Sales, Expenses, Inventory Purchased, Discount Given, Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          compact
          gradient="from-blue-500 to-blue-600"
          icon={FiDollarSign}
          title={`${getFilterLabel()} Sales`}
          mainValue={`Rs. ${filteredSalesData.total.toLocaleString()}`}
          subLines={[
            `${filteredSalesData.items} items sold`,
            `Profit: Rs. ${filteredSalesData.profit.toLocaleString()}`
          ]}
          expanded={showAllDetails}
        />

        {/* 2nd: Expenses = Manual expenses + Inventory Purchased (battery + old battery bhi) */}
        <StatCard
          compact
          gradient="from-red-500 to-red-600"
          icon={FiTrendingDown}
          title={`${getFilterLabel()} Expenses`}
          mainValue={`Rs. ${totalExpensesWithInventory.toLocaleString()}`}
          subLines={[
            `Inventory: Rs. ${inventoryCost.toLocaleString()}`,
            `Salary: Rs. ${filteredStats.salary.toLocaleString()} (${filteredStats.salaryCount} payments)`,
            `Other: Rs. ${(filteredStats.expenses - filteredStats.salary).toLocaleString()} (${filteredStats.expenseCount - filteredStats.salaryCount} transactions)`
          ]}
          expanded={showAllDetails}
        />

        {/* 3rd: Inventory Purchased (khareedi hui poori quantity + vendor ko diye hue paisay + old batteries) */}
        <StatCard
          compact
          gradient="from-orange-500 to-orange-600"
          icon={FiPackage}
          title="Inventory Purchased"
          mainValue={`Rs. ${inventoryCost.toLocaleString()}`}
          subLines={[
            'Total khareedi (bika hua + bacha hua)',
            `Old Batteries: Rs. ${oldBatteryCost.toLocaleString()}`
          ]}
          expanded={showAllDetails}
        />

        {/* 4th: Discount Given (sirf asli discount, trade-in nahi) */}
        <StatCard
          compact
          gradient="from-sky-400 to-sky-500"
          icon={FiGift}
          title="Discount Given"
          mainValue={`Rs. ${filteredSalesData.discount.toLocaleString()}`}
          subLines={[
            'Given to customers'
          ]}
          expanded={showAllDetails}
        />

        {/* 5th: Profit = Sales Profit - (Manual Expenses + Discount + Trade-in) */}
        <StatCard
          compact
          gradient={finalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}
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
              gradient="from-blue-500 to-blue-600"
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
              gradient="from-blue-500 to-blue-600"
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
              gradient="from-blue-500 to-blue-600"
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
              subLines={['After expenses, discount & trade-in']}
              expanded={true}
            />

            <StatCard
              gradient="from-green-500 to-green-600"
              icon={FiTrendingUp}
              title="This Week's Profit"
              mainValue={`Rs. ${stats.weekProfit?.toLocaleString() || 0}`}
              subLines={['After expenses, discount & trade-in']}
              expanded={true}
            />

            <StatCard
              gradient="from-green-500 to-green-600"
              icon={FiTrendingUp}
              title="This Month's Profit"
              mainValue={`Rs. ${stats.monthProfit?.toLocaleString() || 0}`}
              subLines={['After expenses, discount & trade-in']}
              expanded={true}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              gradient="from-sky-400 to-sky-500"
              icon={FiGift}
              title="Today's Discount"
              mainValue={`Rs. ${stats.todayDiscount?.toLocaleString() || 0}`}
              subLines={['Given today']}
              expanded={true}
            />

            <StatCard
              gradient="from-sky-400 to-sky-500"
              icon={FiGift}
              title="This Week's Discount"
              mainValue={`Rs. ${stats.weekDiscount?.toLocaleString() || 0}`}
              subLines={['Given this week']}
              expanded={true}
            />

            <StatCard
              gradient="from-sky-400 to-sky-500"
              icon={FiGift}
              title="This Month's Discount"
              mainValue={`Rs. ${stats.monthDiscount?.toLocaleString() || 0}`}
              subLines={['Given this month']}
              expanded={true}
            />
          </div>
        </>
      )}

      {/* Monthly Breakdown - Net Profit = Sales Profit - (Manual Expenses + Discount + Trade-in) */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 flex items-center gap-2 flex-wrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <FiBarChart2 className="text-red-500" /> Monthly Financial Summary
          <span className={`text-xs font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ({getFilterLabel()})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sales</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>Rs. {filteredSalesData.total.toLocaleString()}</p>
          </div>
          {/* Expenses = Manual expenses + Inventory Purchased (old batteries samet) */}
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Expenses (incl. Inventory)</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>Rs. {totalExpensesWithInventory.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Inventory: Rs. {inventoryCost.toLocaleString()} + Salary: Rs. {filteredStats.salary.toLocaleString()} + Other: Rs. {(filteredStats.expenses - filteredStats.salary).toLocaleString()}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Discount Given</p>
            <p className={`text-xl font-bold ${darkMode ? 'text-sky-400' : 'text-sky-500'}`}>Rs. {filteredStats.discount.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Net Profit</p>
            <p className={`text-xl font-bold ${finalProfit >= 0 ? (darkMode ? 'text-green-400' : 'text-green-500') : (darkMode ? 'text-red-400' : 'text-red-500')}`}>
              Rs. {finalProfit.toLocaleString()}
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
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Invoices</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedYearData.count}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Profit</p>
                <p className={`text-2xl font-bold ${profitColor(yearNetProfit, darkMode)}`}>Rs. {yearNetProfit.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>(After discount & trade-in)</p>
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
                      <td colSpan="10" className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No invoices found</td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={idx} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDisplayDate(item.inv.date)}</td>
                        <td className={`px-4 py-3 font-mono text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.inv.invoiceNo}</td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.inv.customer}</td>
                        <td className={`px-4 py-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.service_name}</td>
                        <td className="px-4 py-3"><TypeBadge item={item} darkMode={darkMode} /></td>
                        <td className={`px-4 py-3 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.qty}</td>
                        <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.purchasePrice > 0 ? `Rs. ${item.purchasePrice.toLocaleString()}` : '-'}</td>
                        <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.sellPrice > 0 ? `Rs. ${item.sellPrice.toLocaleString()}` : '-'}</td>
                        <td className={`px-4 py-3 text-right ${profitColor(item.unitProfit, darkMode)}`}>{formatProfit(item.unitProfit)}</td>
                        <td className={`px-4 py-3 text-right ${profitColor(item.lineProfit, darkMode)}`}>{formatProfit(item.lineProfit)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className={darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}>
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