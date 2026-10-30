import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiMenu, FiChevronLeft, FiSun, FiMoon, FiLogOut, 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiBell, FiTrendingUp, FiShoppingCart, FiCheckCircle, 
  FiAlertCircle, FiClock, FiArrowRight, FiLoader, FiUsers,
  FiCreditCard, FiCalendar, FiGift, FiChevronDown, FiChevronUp, FiFile,
  FiBattery, FiArchive, FiTruck, FiBookOpen, FiDownload, 
  FiFileText as FiFileIcon, FiRefreshCw, FiClipboard,
  FiEye, FiEyeOff
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Sidebar from './Sidebar';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Inventory = lazy(() => import('./Inventory'));
const FinanceOverview = lazy(() => import('./finance/FinanceOverview'));
const FinanceExpenses = lazy(() => import('./finance/FinanceExpenses'));
const FinanceCharts = lazy(() => import('./finance/FinanceCharts'));
const FinanceReports = lazy(() => import('./finance/FinanceReports'));
const FinanceReminders = lazy(() => import('./finance/FinanceReminders'));
const Billing = lazy(() => import('./Billing'));
const Records = lazy(() => import('./Records'));
const Reminders = lazy(() => import('./Reminders'));
const Users = lazy(() => import('./Users'));
const Credit = lazy(() => import('./finance/Credit'));
const DiscardedBillsPage = lazy(() => import('./billing/DiscardedBillsPage'));
const EstimatedBill = lazy(() => import('./EstimatedBill'));
const BatteryPage = lazy(() => import('./BatteryPage'));
const EstimateRecords = lazy(() => import('./EstimateRecords'));
const BatteryOverview = lazy(() => import('./BatteryOverview'));
const BatteryCharts = lazy(() => import('./BatteryCharts'));
const OldBatteries = lazy(() => import('./OldBatteries'));
const CarPurchase = lazy(() => import('./CarPurchase'));
const CarSell = lazy(() => import('./CarSell'));
const CarRecords = lazy(() => import('./CarRecords'));
const ProductRecord = lazy(() => import('./ProductRecord'));
const CashInHand = lazy(() => import('./CashInHand'));
const InventoryHistory = lazy(() => import('./InventoryHistory')); // ✅ NEW

const PATH_TO_MENU = {
  '/dashboard': 'all-data',
  '/inventory': 'inventory',
  '/product-record': 'product-record',
  '/inventory-history': 'inventory-history', // ✅ NEW
  '/cash-in-hand': 'cash-in-hand',
  '/finance': 'finance-overview',
  '/finance-expenses': 'finance-expenses',
  '/finance-charts': 'finance-charts',
  '/finance-credit': 'finance-credit',
  '/finance-reports': 'finance-reports',
  '/finance-reminders': 'finance-reminders',
  '/billing': 'billing',
  '/estimate': 'estimate',
  '/estimate-records': 'estimate-records',
  '/battery': 'battery',
  '/battery-overview': 'battery-overview',
  '/battery-charts': 'battery-charts',
  '/old-batteries': 'old-batteries',
  '/car-purchase': 'car-purchase',
  '/car-sell': 'car-sell',
  '/car-records': 'car-records',
  '/records': 'record',
  '/reminders': 'reminders',
  '/users': 'users',
  '/discarded': 'discarded',
};

// ✅ Ye paths sirf admin ke liye hain
const ADMIN_ONLY_PATHS = ['/product-record', '/cash-in-hand', '/inventory-history']; // ✅ inventory-history added

const MENU_TO_PATH = Object.fromEntries(
  Object.entries(PATH_TO_MENU).map(([path, menu]) => [menu, path])
);

const getStoredRole = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.role || null;
  } catch {
    return null;
  }
};

const getMenuFromPath = (pathname, role) => {
  const fallback = role === 'employee' ? 'billing' : 'all-data';
  if (pathname === '/dashboard' || pathname === '/') return fallback;
  return PATH_TO_MENU[pathname] || fallback;
};

const LoadingFallback = ({ darkMode }) => (
  <div className={`flex items-center justify-center h-96 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
    <div className="text-center">
      <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
      <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading...</p>
    </div>
  </div>
);

const StatsCard = React.memo(({ title, value, subtitle, icon: Icon, color, darkMode }) => (
  <div className={`bg-gradient-to-r ${color} rounded-2xl p-5 text-white shadow-lg`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
      </div>
      <Icon className="text-3xl opacity-50" />
    </div>
  </div>
));

const isLoanPayment = (p) => {
  const t = String(p?.payment_type || p?.type || '').toLowerCase();
  return t.includes('loan');
};

const getSalesItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => item && item.service_category !== 'Trade-in');
};

const calcItemProfit = (item, purchaseMap) => {
  const qty = parseInt(item.quantity) || 0;
  const price = parseFloat(item.price) || 0;

  if (item.service_category === 'Trade-in') return -(price * qty);
  if (item.service_category === 'Old Battery Sale') return price * qty;

  const purchasePrice = purchaseMap[item.service_name] || 0;
  return (price - purchasePrice) * qty;
};

const isTradeInInvoice = (inv) => {
  const note = (inv?.discount_note || '').toLowerCase();
  if (note.includes('trade-in') || note.includes('old battery purchase')) return true;

  const items = Array.isArray(inv?.items) ? inv.items : [];
  return items.length > 0 && items.every(it => it && it.service_category === 'Battery');
};

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

const filterInvoicesByDate = (invoices, filter, customDate = null) => {
  if (filter === 'all') return invoices;
  const range = getDateRange(filter, customDate);
  if (!range) return invoices;
  
  return invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date);
    return invDate >= range.start && invDate <= range.end;
  });
};

const filterExpensesByDate = (expenses, filter, customDate = null) => {
  if (filter === 'all') return expenses;
  const range = getDateRange(filter, customDate);
  if (!range) return expenses;
  
  return expenses.filter(exp => {
    const expDate = new Date(exp.date || exp.created_at);
    return expDate >= range.start && expDate <= range.end;
  });
};

const TIME_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

const CHART_TYPES = [
  { id: 'line', label: 'Line' },
  { id: 'bar', label: 'Bar' },
  { id: 'area', label: 'Area' },
  { id: 'composed', label: 'Composed' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState(getStoredRole());

  const [activeMenu, setActiveMenu] = useState(() =>
    getMenuFromPath(location.pathname, getStoredRole())
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [chartType, setChartType] = useState('line');
  const [isLowStockOpen, setIsLowStockOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [showLoanCards, setShowLoanCards] = useState(false);
  const [loadingLoanStats, setLoadingLoanStats] = useState(false);
  const [loanStats, setLoanStats] = useState({ totalLoan: 0, totalRepaid: 0, balance: 0 });

  useEffect(() => {
    const role = getStoredRole();
    setUserRole(role);

    // ✅ Admin-only pages (product-record, cash-in-hand, inventory-history): employee ko dashboard par bhejo
    if (ADMIN_ONLY_PATHS.includes(location.pathname) && role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }

    setActiveMenu(getMenuFromPath(location.pathname, role));
  }, [location.pathname, navigate]);

  const goToMenu = useCallback((id) => {
    const path = MENU_TO_PATH[id];
    if (path) navigate(path);
    else setActiveMenu(id);
  }, [navigate]);

  const productsArray = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const expensesArray = useMemo(() => Array.isArray(expenses) ? expenses : [], [expenses]);
  const invoicesArray = useMemo(() => Array.isArray(invoices) ? invoices : [], [invoices]);
  const servicesArray = useMemo(() => Array.isArray(services) ? services : [], [services]);

  const filteredInvoices = useMemo(() => 
    filterInvoicesByDate(invoicesArray, timeFilter, customDate || null),
    [invoicesArray, timeFilter, customDate]
  );

  const filteredExpenses = useMemo(() => 
    filterExpensesByDate(expensesArray, timeFilter, customDate || null),
    [expensesArray, timeFilter, customDate]
  );

  const activeProducts = useMemo(() => {
    return productsArray.filter(p => {
      const isHidden = p.is_hidden === true || p.is_hidden === 1;
      return !isHidden;
    });
  }, [productsArray]);

  const purchaseMap = useMemo(() => {
    const map = {};
    activeProducts.forEach(p => {
      map[p.name] = parseFloat(p.purchase_price) || 0;
    });
    return map;
  }, [activeProducts]);

  const totalSales = useMemo(() => {
    let total = 0;
    filteredInvoices.forEach(inv => {
      getSalesItems(inv.items).forEach(item => {
        const qty = parseInt(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        total += price * qty;
      });
    });
    return total;
  }, [filteredInvoices]);

  const manualExpensesSum = useMemo(() => 
    filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0),
    [filteredExpenses]
  );

  const filteredSalaryPayments = useMemo(() => {
    const range = timeFilter === 'all' ? null : getDateRange(timeFilter, customDate || null);
    const list = [];

    (Array.isArray(employees) ? employees : []).forEach(emp => {
      (Array.isArray(emp?.payments) ? emp.payments : []).forEach(p => {
        if (!p || isLoanPayment(p)) return;

        const raw = p.payment_date || p.date || p.created_at;
        const d = raw ? new Date(raw) : null;
        const validDate = d && !isNaN(d.getTime()) ? d : null;

        if (range && !(validDate && validDate >= range.start && validDate <= range.end)) return;

        list.push({ amount: parseFloat(p.amount) || 0, date: validDate });
      });
    });

    return list;
  }, [employees, timeFilter, customDate]);

  const salaryPaymentsTotal = useMemo(() =>
    filteredSalaryPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredSalaryPayments]
  );

  const totalExpensesSum = useMemo(() => 
    manualExpensesSum + salaryPaymentsTotal,
    [manualExpensesSum, salaryPaymentsTotal]
  );

  const { totalDiscount, tradeInDiscount } = useMemo(() => {
    let real = 0;
    let tradeIn = 0;
    filteredInvoices.forEach(inv => {
      const d = parseFloat(inv.discount) || 0;
      if (isTradeInInvoice(inv)) tradeIn += d;
      else real += d;
    });
    return { totalDiscount: real, tradeInDiscount: tradeIn };
  }, [filteredInvoices]);

  const totalProfitCalc = useMemo(() => {
    let grossProfit = 0;

    filteredInvoices.forEach(inv => {
      (inv.items && Array.isArray(inv.items) ? inv.items : []).forEach(item => {
        if (!item) return;
        grossProfit += calcItemProfit(item, purchaseMap);
      });
    });

    return grossProfit - manualExpensesSum - salaryPaymentsTotal - totalDiscount - tradeInDiscount;
  }, [filteredInvoices, manualExpensesSum, salaryPaymentsTotal, purchaseMap, totalDiscount, tradeInDiscount]);

  const profitMargin = useMemo(() => 
    totalSales > 0 ? (totalProfitCalc / totalSales) * 100 : 0,
    [totalSales, totalProfitCalc]
  );

  const totalProductsCount = useMemo(() => activeProducts.length, [activeProducts]);
  const totalStock = useMemo(() => 
    activeProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0),
    [activeProducts]
  );

  const lowStockProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const threshold = p.low_stock_threshold ?? 5;
      return (parseInt(p.quantity) || 0) < threshold;
    });
  }, [activeProducts]);

  const recentInvoices = useMemo(() => 
    [...filteredInvoices]
      .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
      .slice(0, 5),
    [filteredInvoices]
  );

  const monthlyData = useMemo(() => {
    const monthly = {};
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    monthOrder.forEach(m => {
      monthly[m] = { sales: 0, profit: 0, expenses: 0, salary: 0, discount: 0, tradeIn: 0 };
    });
    
    filteredInvoices.forEach(inv => {
      if (inv.invoice_date) {
        const date = new Date(inv.invoice_date);
        const month = date.toLocaleString('default', { month: 'short' });
        if (monthly[month]) {
          const invDiscount = parseFloat(inv.discount) || 0;
          if (isTradeInInvoice(inv)) monthly[month].tradeIn += invDiscount;
          else monthly[month].discount += invDiscount;

          (inv.items && Array.isArray(inv.items) ? inv.items : []).forEach(item => {
            if (!item) return;
            if (item.service_category !== 'Trade-in') {
              const qty = parseInt(item.quantity) || 0;
              const price = parseFloat(item.price) || 0;
              monthly[month].sales += price * qty;
            }
            monthly[month].profit += calcItemProfit(item, purchaseMap);
          });
        }
      }
    });
    
    filteredExpenses.forEach(exp => {
      if (exp.date || exp.created_at) {
        const date = new Date(exp.date || exp.created_at);
        const month = date.toLocaleString('default', { month: 'short' });
        if (monthly[month]) {
          monthly[month].expenses += parseFloat(exp.amount) || 0;
        }
      }
    });

    filteredSalaryPayments.forEach(p => {
      if (!p.date) return;
      const month = p.date.toLocaleString('default', { month: 'short' });
      if (monthly[month]) {
        monthly[month].salary += p.amount;
      }
    });
    
    return monthOrder.map(month => {
      const data = monthly[month];
      return {
        month,
        sales: data.sales,
        profit: data.profit - data.expenses - data.salary - data.discount - data.tradeIn,
        expenses: data.expenses + data.salary,
        discount: data.discount
      };
    });
  }, [filteredInvoices, filteredExpenses, filteredSalaryPayments, purchaseMap]);

  const productSalesData = useMemo(() => {
    const allProducts = activeProducts
      .map(p => ({
        name: p.name,
        value: (parseFloat(p.selling_price) || 0) * (parseInt(p.quantity) || 0)
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);

    const TOP_N = 8;
    if (allProducts.length <= TOP_N) return allProducts;

    const top = allProducts.slice(0, TOP_N);
    const others = allProducts.slice(TOP_N);
    const othersValue = others.reduce((sum, p) => sum + p.value, 0);

    if (othersValue > 0) {
      top.push({ name: `Others (${others.length} products)`, value: othersValue });
    }
    return top;
  }, [activeProducts]);

  const COLORS = useMemo(() => ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'], []);

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

  const exportToExcel = () => {
    const hasData = filteredInvoices.length > 0 || filteredExpenses.length > 0 || activeProducts.length > 0;
    
    if (!hasData) {
      toast.error('No data to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    const monthlyDataSheet = monthlyData.map(m => ({
      'Month': m.month,
      'Sales (Rs.)': m.sales,
      'Profit (Rs.)': m.profit,
      'Expenses (Rs.)': m.expenses,
      'Discount (Rs.)': m.discount
    }));
    const ws1 = XLSX.utils.json_to_sheet(monthlyDataSheet);
    XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Summary');

    const productData = productSalesData.map(p => ({
      'Product': p.name,
      'Total Value (Rs.)': p.value
    }));
    const ws2 = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Product Sales');

    const invoiceData = recentInvoices.map(inv => ({
      'Invoice #': inv.invoice_no || inv.invoiceNo,
      'Customer': inv.customer_name || inv.customer?.name || 'Walk-in',
      'Amount (Rs.)': inv.total_amount || inv.total || 0,
      'Status': inv.status || 'Pending'
    }));
    const ws3 = XLSX.utils.json_to_sheet(invoiceData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Recent Invoices');

    const summaryData = [{
      'Metric': 'Total Sales',
      'Value': `Rs. ${totalSales.toLocaleString()}`
    }, {
      'Metric': 'Total Profit (After Expenses & Discount)',
      'Value': `Rs. ${totalProfitCalc.toLocaleString()}`
    }, {
      'Metric': 'Profit Margin',
      'Value': `${profitMargin.toFixed(1)}%`
    }, {
      'Metric': 'Total Expenses (Manual + Salary)',
      'Value': `Rs. ${totalExpensesSum.toLocaleString()}`
    }, {
      'Metric': 'Manual Expenses',
      'Value': `Rs. ${manualExpensesSum.toLocaleString()}`
    }, {
      'Metric': 'Salary & Advance Payments',
      'Value': `Rs. ${salaryPaymentsTotal.toLocaleString()}`
    }, {
      'Metric': 'Total Discount',
      'Value': `Rs. ${totalDiscount.toLocaleString()}`
    }, {
      'Metric': 'Active Products',
      'Value': totalProductsCount
    }, {
      'Metric': 'Total Stock Units',
      'Value': totalStock
    }, {
      'Metric': 'Total Invoices',
      'Value': filteredInvoices.length
    }, {
      'Metric': 'Filter',
      'Value': getFilterLabel()
    }];

    if (showLoanCards) {
      summaryData.push(
        { 'Metric': 'Total Loan Given', 'Value': `Rs. ${loanStats.totalLoan.toLocaleString()}` },
        { 'Metric': 'Loan Recovered', 'Value': `Rs. ${loanStats.totalRepaid.toLocaleString()}` },
        { 'Metric': 'Loan Remaining', 'Value': `Rs. ${loanStats.balance.toLocaleString()}` }
      );
    }

    const ws4 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Summary');

    XLSX.writeFile(wb, `Dashboard_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel!');
  };

  const exportToPDF = () => {
    const hasData = filteredInvoices.length > 0 || filteredExpenses.length > 0 || activeProducts.length > 0;
    
    if (!hasData) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38);
    doc.text('Dashboard Report', 14, 15);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Filter: ${getFilterLabel()}`, 14, 28);

    doc.setFontSize(10);
    doc.text(`Total Sales: Rs. ${totalSales.toLocaleString()}`, 14, 36);
    doc.text(`Total Profit (Net): Rs. ${totalProfitCalc.toLocaleString()} (${profitMargin.toFixed(1)}% margin)`, 14, 42);
    doc.text(`Total Expenses: Rs. ${totalExpensesSum.toLocaleString()}  [Manual: Rs. ${manualExpensesSum.toLocaleString()} | Salary: Rs. ${salaryPaymentsTotal.toLocaleString()}]`, 14, 48);
    doc.text(`Total Discount: Rs. ${totalDiscount.toLocaleString()}`, 14, 54);
    doc.text(`Active Products: ${totalProductsCount} | Total Stock: ${totalStock} units`, 14, 60);
    doc.text(`Total Invoices: ${filteredInvoices.length}`, 14, 66);

    let startY = 74;

    if (showLoanCards) {
      doc.text(`Loan Given: Rs. ${loanStats.totalLoan.toLocaleString()}  |  Recovered: Rs. ${loanStats.totalRepaid.toLocaleString()}  |  Remaining: Rs. ${loanStats.balance.toLocaleString()}`, 14, 72);
      startY = 80;
    }

    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text('Monthly Summary (Net Profit)', 14, startY);
    doc.setTextColor(0, 0, 0);
    startY += 6;

    const monthlyTableData = monthlyData.map(m => [
      m.month,
      `Rs. ${m.sales.toLocaleString()}`,
      `Rs. ${m.profit.toLocaleString()}`,
      `Rs. ${m.expenses.toLocaleString()}`,
      `Rs. ${m.discount.toLocaleString()}`
    ]);

    doc.autoTable({
      head: [['Month', 'Sales', 'Profit (Net)', 'Expenses', 'Discount']],
      body: monthlyTableData,
      startY: startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 }
      }
    });

    startY = doc.lastAutoTable.finalY + 10;

    if (productSalesData.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text('Product Sales Distribution', 14, startY);
      doc.setTextColor(0, 0, 0);
      startY += 6;

      const productTableData = productSalesData.map(p => [
        p.name,
        `Rs. ${p.value.toLocaleString()}`
      ]);

      doc.autoTable({
        head: [['Product', 'Total Value']],
        body: productTableData,
        startY: startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 }
        }
      });

      startY = doc.lastAutoTable.finalY + 10;
    }

    if (recentInvoices.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text('Recent Invoices', 14, startY);
      doc.setTextColor(0, 0, 0);
      startY += 6;

      const invoiceTableData = recentInvoices.map(inv => [
        inv.invoice_no || inv.invoiceNo,
        inv.customer_name || inv.customer?.name || 'Walk-in',
        `Rs. ${(inv.total_amount || inv.total || 0).toLocaleString()}`,
        inv.status || 'Pending'
      ]);

      doc.autoTable({
        head: [['Invoice #', 'Customer', 'Amount', 'Status']],
        body: invoiceTableData,
        startY: startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 38, 38] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 20 }
        }
      });
    }

    doc.save(`Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF!');
  };

  const fetchLoanStats = useCallback(async () => {
    setLoadingLoanStats(true);
    try {
      const empRes = await api.get('/employees');
      const list = Array.isArray(empRes.data?.data)
        ? empRes.data.data
        : (Array.isArray(empRes.data) ? empRes.data : []);

      const results = await Promise.all(
        list.map(emp =>
          api.get(`/employee-loans/${emp.id}/history`)
            .then(res => res.data?.data?.totals || null)
            .catch(() => null)
        )
      );

      const n = (v) => parseFloat(v) || 0;
      const totals = results.reduce((acc, t) => {
        if (!t) return acc;
        acc.totalLoan += n(t.total_loan);
        acc.totalRepaid += n(t.total_repaid);
        acc.balance += n(t.balance);
        return acc;
      }, { totalLoan: 0, totalRepaid: 0, balance: 0 });

      setLoanStats(totals);
    } catch (err) {
      console.error('Error fetching loan stats:', err);
      toast.error('Failed to load loan data');
    } finally {
      setLoadingLoanStats(false);
    }
  }, []);

  const handleToggleLoanCards = useCallback(() => {
    if (showLoanCards) {
      setShowLoanCards(false);
    } else {
      setShowLoanCards(true);
      fetchLoanStats();
    }
  }, [showLoanCards, fetchLoanStats]);

  const fetchAllData = useCallback(async (silent = false) => {
    const abortController = new AbortController();
    if (!silent) setLoading(true);
    try {
      const [productsRes, expensesRes, invoicesRes, servicesRes, employeesRes] = await Promise.all([
        api.get('/products', { signal: abortController.signal }),
        api.get('/expenses', { signal: abortController.signal }),
        api.get('/invoices', { signal: abortController.signal }),
        api.get('/services', { signal: abortController.signal }),
        api.get('/employees', { signal: abortController.signal })
          .catch(() => ({ data: [] }))
      ]);
      
      let productsData = [];
      if (productsRes.data?.success && Array.isArray(productsRes.data.data)) {
        productsData = productsRes.data.data;
      } else if (Array.isArray(productsRes.data)) {
        productsData = productsRes.data;
      }
      
      setProducts(productsData);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);

      const empData = Array.isArray(employeesRes.data?.data)
        ? employeesRes.data.data
        : (Array.isArray(employeesRes.data) ? employeesRes.data : []);
      setEmployees(empData);
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching data:', err);
        toast.error('Failed to load data');
        if (!silent) {
          setProducts([]);
          setExpenses([]);
          setInvoices([]);
          setServices([]);
          setEmployees([]);
        }
      }
    } finally {
      setLoading(false);
    }
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    const cleanup = fetchAllData();
    return () => {
      if (cleanup && typeof cleanup === 'function') cleanup();
    };
  }, [fetchAllData]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchAllData(true);
      if (showLoanCards) await fetchLoanStats();
      setRefreshKey(prev => prev + 1);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchAllData, showLoanCards, fetchLoanStats]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleAddProduct = useCallback(async (product) => {
    try {
      const response = await api.post('/products', product);
      if (response.data) {
        await fetchAllData();
        toast.success('Product added successfully');
        return true;
      }
    } catch (err) {
      console.error('Error adding product:', err);
      toast.error('Failed to add product');
      return false;
    }
  }, [fetchAllData]);

  const handleUpdateProduct = useCallback(async (updatedProduct) => {
    try {
      const response = await api.put(`/products/${updatedProduct.id}`, updatedProduct);
      if (response.data) {
        await fetchAllData();
        toast.success('Product updated successfully');
        return true;
      }
    } catch (err) {
      console.error('Error updating product:', err);
      toast.error('Failed to update product');
      return false;
    }
  }, [fetchAllData]);

  const handleAddExpense = useCallback(async (expense) => {
    try {
      const response = await api.post('/expenses', expense);
      if (response.data) {
        await fetchAllData();
        toast.success('Expense added successfully');
        return true;
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      toast.error('Failed to add expense');
      return false;
    }
  }, [fetchAllData]);

  const handleUpdateExpense = useCallback(async (updatedExpense) => {
    try {
      const response = await api.put(`/expenses/${updatedExpense.id}`, updatedExpense);
      if (response.data) {
        await fetchAllData();
        toast.success('Expense updated successfully');
        return true;
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      toast.error('Failed to update expense');
      return false;
    }
  }, [fetchAllData]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out');
    navigate('/');
  }, [navigate]);

  const getMenuTitle = useCallback(() => {
    const titles = {
      'all-data': 'Complete Business Overview',
      inventory: 'Inventory Management',
      'product-record': 'Product Record',
      'inventory-history': 'Inventory History', // ✅ NEW
      'cash-in-hand': 'Cash in Hand',
      'finance-overview': 'Finance Dashboard',
      'finance-expenses': 'Expenses Management',
      'finance-charts': 'Financial Charts & Analytics',
      'finance-reports': 'Finance Reports & Distribution',
      'finance-reminders': 'Upcoming Payments & Reminders',
      'finance-credit': 'Credit Management',
      billing: 'Billing System',
      estimate: 'Estimate / Quotation',
      'estimate-records': 'Estimate Records',
      battery: 'Battery Sale',
      'battery-overview': 'Battery Sales Overview',
      'battery-charts': 'Battery Sales Charts',
      'old-batteries': 'Old Batteries History',
      'car-purchase': 'Car Purchase',
      'car-sell': 'Car Sell',
      'car-records': 'Car Records',
      record: 'Records Archive',
      reminders: 'Reminders',
      users: 'User Management',
      discarded: 'Drafted Bills'
    };
    return titles[activeMenu] || 'Dashboard';
  }, [activeMenu]);

  const getMenuDescription = useCallback(() => {
    const descriptions = {
      'all-data': 'Everything at a glance - Sales, Expenses, Products, Invoices',
      inventory: 'Manage products, track purchases and sales',
      'product-record': 'Sold products ka poora record - purchase, selling, discount aur profit',
      'inventory-history': 'Balance sheet - paisa kahan laga, cash in hand aur owner capital', // ✅ NEW
      'cash-in-hand': 'Cash add / withdraw karo - ye amount Inventory History ke Cash in Hand me judti hai',
      'finance-overview': 'View daily, weekly and monthly financial overview',
      'finance-expenses': 'Add, edit and manage all expenses',
      'finance-charts': 'Visualize financial data with interactive charts', 
      'finance-reports': 'Analyze expense distribution and generate reports',
      'finance-reminders': 'Track upcoming bills, salaries and payments',
      'finance-credit': 'Manage vendor credits, payments and history',
      billing: 'Create bills, print invoices, export data',
      estimate: 'Create and print customer estimates / quotations',
      'estimate-records': 'View all estimate records with search and filters',
      battery: 'Sell batteries with trade-in option',
      'battery-overview': 'View battery sales statistics and reports',
      'battery-charts': 'Visualize battery sales with interactive charts',
      'old-batteries': 'View all purchased old batteries history with stats',
      'car-purchase': 'Record car purchase details',
      'car-sell': 'Record car sale details',
      'car-records': 'View complete history of car purchases and sales',
      record: 'View all transaction history',
      reminders: 'Birthday, Tuning & Oil Change reminders',
      users: 'Manage system users and employees',
      discarded: 'View and restore drafted bills'
    };
    return descriptions[activeMenu] || '';
  }, [activeMenu]);

  const getActiveIcon = useCallback(() => {
    const icons = {
      'all-data': <FiBarChart2 className="text-2xl" />,
      inventory: <FiPackage className="text-2xl" />,
      'product-record': <FiClipboard className="text-2xl" />,
      'inventory-history': <FiClock className="text-2xl" />, // ✅ NEW
      'cash-in-hand': <FiDollarSign className="text-2xl" />,
      'finance-overview': <FiDollarSign className="text-2xl" />,
      'finance-expenses': <FiFileText className="text-2xl" />,
      'finance-charts': <FiBarChart2 className="text-2xl" />,
      'finance-reports': <FiBarChart2 className="text-2xl" />,
      'finance-reminders': <FiBell className="text-2xl" />,
      'finance-credit': <FiCreditCard className="text-2xl" />,
      billing: <FiFileText className="text-2xl" />,
      estimate: <FiFile className="text-2xl" />,
      'estimate-records': <FiArchive className="text-2xl" />,
      battery: <FiBattery className="text-2xl" />,
      'battery-overview': <FiTrendingUp className="text-2xl" />,
      'battery-charts': <FiBarChart2 className="text-2xl" />,
      'old-batteries': <FiBattery className="text-2xl" />,
      'car-purchase': <FiShoppingCart className="text-2xl" />,
      'car-sell': <FiTruck className="text-2xl" />,
      'car-records': <FiBookOpen className="text-2xl" />,
      record: <FiBarChart2 className="text-2xl" />,
      reminders: <FiBell className="text-2xl" />,
      users: <FiUsers className="text-2xl" />,
      discarded: <FiClock className="text-2xl" />
    };
    return icons[activeMenu] || <FiPackage className="text-2xl" />;
  }, [activeMenu]);

  const handleCustomDateChange = (e) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      setTimeFilter('custom');
    }
  };

  const renderChart = (data, darkMode) => {
    const commonProps = {
      data: data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const axisProps = {
      stroke: darkMode ? '#9ca3af' : '#6b7280'
    };

    const gridProps = {
      stroke: darkMode ? '#374151' : '#e5e7eb',
      strokeDasharray: '3 3'
    };

    const tooltipProps = {
      contentStyle: { backgroundColor: darkMode ? '#1f2937' : '#ffffff' }
    };

    const legendProps = {
      wrapperStyle: { color: darkMode ? '#ffffff' : '#000000' }
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar dataKey="sales" fill="#ef4444" name="Sales" />
            <Bar dataKey="profit" fill="#22c55e" name="Profit" />
            <Bar dataKey="expenses" fill="#3b82f6" name="Expenses" />
            <Bar dataKey="discount" fill="#0ea5e9" name="Discount" />
          </BarChart>
        );
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Area type="monotone" dataKey="sales" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Sales" />
            <Area type="monotone" dataKey="profit" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Profit" />
            <Area type="monotone" dataKey="expenses" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Expenses" />
            <Area type="monotone" dataKey="discount" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} name="Discount" />
          </AreaChart>
        );
      
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar dataKey="expenses" barSize={20} fill="#3b82f6" name="Expenses" />
            <Bar dataKey="discount" barSize={20} fill="#0ea5e9" name="Discount" />
            <Line type="monotone" dataKey="sales" stroke="#ef4444" name="Sales" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#22c55e" name="Profit" strokeWidth={2} />
          </ComposedChart>
        );
      
      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Line type="monotone" dataKey="sales" stroke="#ef4444" name="Sales" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#22c55e" name="Profit" strokeWidth={2} />
            <Line type="monotone" dataKey="expenses" stroke="#3b82f6" name="Expenses" strokeWidth={2} />
            <Line type="monotone" dataKey="discount" stroke="#0ea5e9" name="Discount" strokeWidth={2} />
          </LineChart>
        );
    }
  };

  const hasData = filteredInvoices.length > 0 || filteredExpenses.length > 0 || activeProducts.length > 0;

  const isProductRecord = activeMenu === 'product-record';
  const handleHeaderExcel = () => {
    if (isProductRecord) window.dispatchEvent(new CustomEvent('product-record-export', { detail: 'excel' }));
    else exportToExcel();
  };
  const handleHeaderPDF = () => {
    if (isProductRecord) window.dispatchEvent(new CustomEvent('product-record-export', { detail: 'pdf' }));
    else exportToPDF();
  };
  const exportDisabled = !isProductRecord && !hasData;

  const pillClass = (active) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      active
        ? 'bg-red-500 text-white shadow-md'
        : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="flex h-screen">
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          darkMode={darkMode}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm px-6 py-3 flex justify-between items-center border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
              >
                {isSidebarOpen ? <FiChevronLeft className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
              <div className="text-2xl">{getActiveIcon()}</div>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {getMenuTitle()}
                </h2>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getMenuDescription()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                onClick={handleHeaderExcel}
                disabled={exportDisabled}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } ${exportDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiFileIcon size={14} /> Excel
              </button>
              <button
                onClick={handleHeaderPDF}
                disabled={exportDisabled}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } ${exportDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiDownload size={14} /> PDF
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition ${darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-gray-800'}`}
              >
                {darkMode ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            
            {activeMenu === 'all-data' && userRole !== 'employee' && (
              <div className="space-y-6">
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
                  <button
                    onClick={() => setShowCustomDate(!showCustomDate)}
                    className={pillClass(timeFilter === 'custom')}
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

                <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mr-4">
                    <FiBarChart2 className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Chart Type:</span>
                  </div>
                  {CHART_TYPES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setChartType(c.id)}
                      className={pillClass(chartType === c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <StatsCard 
                    title="Total Sales" 
                    value={`Rs. ${totalSales.toLocaleString()}`} 
                    subtitle=""
                    icon={FiDollarSign} 
                    color="from-red-500 to-red-600" 
                    darkMode={darkMode} 
                  />
                  <StatsCard 
                    title="Total Expenses" 
                    value={`Rs. ${totalExpensesSum.toLocaleString()}`} 
                    subtitle={`Salary: Rs. ${salaryPaymentsTotal.toLocaleString()} + Other: Rs. ${manualExpensesSum.toLocaleString()}`}
                    icon={FiShoppingCart} 
                    color="from-blue-500 to-blue-600" 
                    darkMode={darkMode} 
                  />
                  <StatsCard 
                    title="Total Discount" 
                    value={`Rs. ${totalDiscount.toLocaleString()}`} 
                    subtitle=""
                    icon={FiGift} 
                    color="from-sky-400 to-sky-500" 
                    darkMode={darkMode} 
                  />
                  <StatsCard 
                    title="Total Profit" 
                    value={`Rs. ${totalProfitCalc.toLocaleString()}`} 
                    subtitle="" 
                    icon={FiTrendingUp} 
                    color={totalProfitCalc >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"} 
                    darkMode={darkMode} 
                  />
                  <StatsCard 
                    title="Active Products" 
                    value={totalProductsCount} 
                    subtitle={`${totalStock} units in stock`} 
                    icon={FiPackage} 
                    color="from-purple-500 to-purple-600" 
                    darkMode={darkMode} 
                  />
                </div>

                <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2">
                    <FiDollarSign className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Employee Loan Summary
                    </span>
                    {!showLoanCards && (
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        (hidden)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleLoanCards}
                    disabled={loadingLoanStats}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 text-white shadow-md ${
                      showLoanCards ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    } ${loadingLoanStats ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loadingLoanStats ? (
                      <><FiLoader className="animate-spin" /> Loading...</>
                    ) : showLoanCards ? (
                      <><FiEyeOff /> Hide</>
                    ) : (
                      <><FiEye /> Show</>
                    )}
                  </button>
                </div>

                {showLoanCards && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard 
                      title="Total Loan Given" 
                      value={`Rs. ${loanStats.totalLoan.toLocaleString()}`} 
                      subtitle="Ab tak diya hua total loan"
                      icon={FiDollarSign} 
                      color="from-amber-500 to-amber-600" 
                      darkMode={darkMode} 
                    />
                    <StatsCard 
                      title="Loan Recovered" 
                      value={`Rs. ${loanStats.totalRepaid.toLocaleString()}`} 
                      subtitle="Ab tak wapas mila"
                      icon={FiCheckCircle} 
                      color="from-emerald-500 to-emerald-600" 
                      darkMode={darkMode} 
                    />
                    <StatsCard 
                      title="Loan Remaining" 
                      value={`Rs. ${loanStats.balance.toLocaleString()}`} 
                      subtitle="Abhi lena baqi hai"
                      icon={FiAlertCircle} 
                      color="from-rose-500 to-rose-600" 
                      darkMode={darkMode} 
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className={`lg:col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        <FiTrendingUp className="text-red-500" /> Monthly Sales, Profit, Expenses & Discount
                        <span className={`text-xs font-normal ml-2 px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {chartType.toUpperCase()}
                        </span>
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {getFilterLabel()}
                      </span>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        {renderChart(monthlyData, darkMode)}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {productSalesData.length > 0 && (
                    <div className={`lg:col-span-1 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        <FiBarChart2 className="text-red-500" /> Product Sales Distribution
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={productSalesData} 
                              cx="50%" 
                              cy="50%" 
                              labelLine={false} 
                              label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''} 
                              outerRadius={85} 
                              dataKey="value"
                            >
                              {productSalesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className={`mt-3 max-h-36 overflow-y-auto pr-1 space-y-1.5 border-t pt-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        {productSalesData.map((entry, index) => (
                          <div key={`legend-${index}`} className="flex items-center gap-2 text-xs">
                            <span 
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></span>
                            <span className={`truncate flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} title={entry.name}>
                              {entry.name}
                            </span>
                            <span className={`flex-shrink-0 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Rs. {entry.value.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiFileText className="text-red-500" /> Recent Invoices
                      <span className={`text-xs font-normal ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({getFilterLabel()})
                      </span>
                    </h3>
                    <button onClick={() => goToMenu('record')} className="text-red-500 text-sm hover:text-red-600 flex items-center gap-1">
                      View All <FiArrowRight className="text-xs" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className={`w-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase">Customer</th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase">Amount</th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {recentInvoices.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center">
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                No invoices found for {getFilterLabel().toLowerCase()}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          recentInvoices.map(inv => (
                            <tr key={inv.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                              <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{inv.invoice_no || inv.invoiceNo}</td>
                              <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{inv.customer_name || inv.customer?.name || 'Walk-in'}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-red-500 text-right">Rs. {(inv.total_amount || inv.total || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm text-center">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  inv.status === 'Paid' 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                    : inv.status === 'Partial' 
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {inv.status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div 
                    className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center cursor-pointer hover:opacity-80 transition`}
                    onClick={() => setIsLowStockOpen(!isLowStockOpen)}
                  >
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiAlertCircle className="text-red-500" /> Low Stock Alerts
                      <span className={`text-xs font-normal ml-2 ${lowStockProducts.length > 0 ? 'text-red-500 font-bold' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({lowStockProducts.length} products)
                      </span>
                    </h3>
                    <div className="flex items-center gap-3">
                      {lowStockProducts.length > 0 && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                          ⚠️ Needs Attention
                        </span>
                      )}
                      {isLowStockOpen ? (
                        <FiChevronUp className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      ) : (
                        <FiChevronDown className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      )}
                    </div>
                  </div>
                  {isLowStockOpen && (
                    <div className="p-4">
                      {lowStockProducts.length === 0 ? (
                        <div className="text-center py-8">
                          <FiCheckCircle className="text-5xl mx-auto text-green-500 mb-2" />
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            All active products have sufficient stock
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Each product uses its own threshold setting
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {lowStockProducts.map(p => {
                            const threshold = p.low_stock_threshold ?? 5;
                            return (
                              <div key={p.id} className={`flex justify-between items-center p-4 rounded-lg border-2 ${p.quantity <= 3 ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-700' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-700'}`}>
                                <div className="flex items-center gap-4">
                                  <div className={`w-2 h-12 rounded-full ${p.quantity <= 3 ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                  <div>
                                    <span className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {p.name}
                                    </span>
                                    <span className={`text-xs ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Stock: {p.quantity} units (Threshold: {threshold})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={`font-bold text-lg ${p.quantity <= 3 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    {p.quantity} left
                                  </span>
                                  <button 
                                    onClick={() => goToMenu('inventory')} 
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition font-medium shadow-md flex items-center gap-2"
                                  >
                                    <FiPackage className="text-sm" /> Restock Now
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button onClick={() => goToMenu('billing')} className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-md flex items-center justify-center gap-2">
                    <FiFileText /> New Bill
                  </button>
                  <button onClick={() => goToMenu('inventory')} className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                    <FiPackage /> Add Product
                  </button>
                  <button onClick={() => goToMenu('record')} className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                    <FiShoppingCart /> View Records
                  </button>
                  <button 
                    onClick={() => goToMenu('finance-expenses')} 
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <FiDollarSign /> Add Expense
                  </button>
                </div>
              </div>
            )}

            <Suspense key={refreshKey} fallback={<LoadingFallback darkMode={darkMode} />}>
              {activeMenu === 'inventory' && (
                <Inventory products={productsArray} darkMode={darkMode} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} />
              )}

              {activeMenu === 'product-record' && userRole === 'admin' && (
                <ProductRecord darkMode={darkMode} />
              )}

              {/* ✅ NEW: Inventory History - sirf admin */}
              {activeMenu === 'inventory-history' && userRole === 'admin' && (
                <InventoryHistory darkMode={darkMode} />
              )}

              {/* Cash in Hand - sirf admin */}
              {activeMenu === 'cash-in-hand' && userRole === 'admin' && (
                <CashInHand darkMode={darkMode} />
              )}
              
              {activeMenu === 'finance-overview' && userRole !== 'employee' && (
                <FinanceOverview darkMode={darkMode} />
              )}
              {activeMenu === 'finance-expenses' && userRole !== 'employee' && (
                <FinanceExpenses darkMode={darkMode} />
              )}
              {activeMenu === 'finance-charts' && userRole !== 'employee' && (
                <FinanceCharts darkMode={darkMode} />
              )}
              {activeMenu === 'finance-reports' && userRole !== 'employee' && (
                <FinanceReports darkMode={darkMode} />
              )}
              {activeMenu === 'finance-reminders' && userRole !== 'employee' && (
                <FinanceReminders darkMode={darkMode} />
              )}
              
              {activeMenu === 'finance-credit' && userRole !== 'employee' && (
                <Credit darkMode={darkMode} />
              )}
              
              {activeMenu === 'billing' && (
                <Billing 
                  darkMode={darkMode} 
                  services={servicesArray}
                  invoices={invoicesArray}
                  setInvoices={setInvoices}
                  products={productsArray}
                  setProducts={setProducts}
                />
              )}

              {activeMenu === 'estimate' && (
                <EstimatedBill darkMode={darkMode} />
              )}

              {activeMenu === 'estimate-records' && (
                <EstimateRecords darkMode={darkMode} />
              )}

              {activeMenu === 'battery' && (
                <BatteryPage darkMode={darkMode} />
              )}

              {activeMenu === 'battery-overview' && (
                <BatteryOverview darkMode={darkMode} />
              )}

              {activeMenu === 'battery-charts' && (
                <BatteryCharts darkMode={darkMode} />
              )}

              {activeMenu === 'old-batteries' && (
                <OldBatteries darkMode={darkMode} />
              )}

              {activeMenu === 'car-purchase' && (
                <CarPurchase darkMode={darkMode} />
              )}

              {activeMenu === 'car-sell' && (
                <CarSell darkMode={darkMode} />
              )}

              {activeMenu === 'car-records' && (
                <CarRecords darkMode={darkMode} />
              )}
              
              {activeMenu === 'record' && userRole !== 'employee' && (
                <Records darkMode={darkMode} />
              )}

              {activeMenu === 'reminders' && (
                <Reminders darkMode={darkMode} />
              )}

              {activeMenu === 'users' && userRole === 'admin' && (
                <Users darkMode={darkMode} />
              )}

              {activeMenu === 'discarded' && (
                <DiscardedBillsPage darkMode={darkMode} />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;