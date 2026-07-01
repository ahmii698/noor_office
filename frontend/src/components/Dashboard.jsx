// src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiMenu, FiChevronLeft, FiSun, FiMoon, FiLogOut, 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiBell, FiTrendingUp, FiShoppingCart, FiCheckCircle, 
  FiAlertCircle, FiClock, FiArrowRight, FiLoader, FiUsers,
  FiCreditCard, FiCalendar, FiGift
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Sidebar from './Sidebar';
import api from '../services/api';

// Lazy load heavy components
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

// Loading fallback component
const LoadingFallback = ({ darkMode }) => (
  <div className={`flex items-center justify-center h-96 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
    <div className="text-center">
      <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
      <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading...</p>
    </div>
  </div>
);

// Memoized Stats Card Component
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

// ✅ Helper: Filter invoices by date range
const filterInvoicesByDate = (invoices, filter) => {
  if (filter === 'all') return invoices;
  const range = getDateRange(filter);
  if (!range) return invoices;
  
  return invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date);
    return invDate >= range.start && invDate <= range.end;
  });
};

// ✅ Helper: Filter expenses by date range
const filterExpensesByDate = (expenses, filter) => {
  if (filter === 'all') return expenses;
  const range = getDateRange(filter);
  if (!range) return expenses;
  
  return expenses.filter(exp => {
    const expDate = new Date(exp.date || exp.created_at);
    return expDate >= range.start && expDate <= range.end;
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  
  // Get default menu based on role
  const getDefaultMenu = () => {
    const user = localStorage.getItem('user');
    const role = user ? JSON.parse(user)?.role : null;
    return role === 'employee' ? 'billing' : 'all-data';
  };
  
  const [activeMenu, setActiveMenu] = useState(getDefaultMenu());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // ✅ Time filter state
  const [timeFilter, setTimeFilter] = useState('all');
  
  // ✅ Chart type state - default 'line'
  const [chartType, setChartType] = useState('line');

  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);

  // Check user role on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);
      
      if (userData.role === 'employee') {
        setActiveMenu('billing');
      } else {
        setActiveMenu('all-data');
      }
    }
  }, []);

  // ✅ Ensure products is always an array
  const productsArray = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const expensesArray = useMemo(() => Array.isArray(expenses) ? expenses : [], [expenses]);
  const invoicesArray = useMemo(() => Array.isArray(invoices) ? invoices : [], [invoices]);
  const servicesArray = useMemo(() => Array.isArray(services) ? services : [], [services]);

  // ✅ FILTERED DATA based on time filter
  const filteredInvoices = useMemo(() => 
    filterInvoicesByDate(invoicesArray, timeFilter),
    [invoicesArray, timeFilter]
  );

  const filteredExpenses = useMemo(() => 
    filterExpensesByDate(expensesArray, timeFilter),
    [expensesArray, timeFilter]
  );

  // ✅ Active products only (not hidden)
  const activeProducts = useMemo(() => {
    const filtered = productsArray.filter(p => {
      const isHidden = p.is_hidden === true || p.is_hidden === 1;
      return !isHidden;
    });
    return filtered;
  }, [productsArray]);

  // ✅ Total Sales - FILTERED
  const totalSales = useMemo(() => 
    filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
    [filteredInvoices]
  );

  // ✅ Total Expenses - FILTERED
  const totalExpensesSum = useMemo(() => 
    filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0),
    [filteredExpenses]
  );

  // ✅ Total Discount - FILTERED
  const totalDiscount = useMemo(() => 
    filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.discount) || 0), 0),
    [filteredInvoices]
  );

  // ✅ Total Profit - FILTERED
  const totalProfitCalc = useMemo(() => {
    let profit = 0;
    for (const inv of filteredInvoices) {
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          const product = activeProducts.find(p => p.name === item.service_name);
          if (product) {
            const itemProfit = (parseFloat(item.price) - parseFloat(product.purchase_price)) * parseInt(item.quantity || 1);
            profit += itemProfit;
          } else {
            profit += parseFloat(item.price) * parseInt(item.quantity || 1);
          }
        }
      }
    }
    return profit;
  }, [filteredInvoices, activeProducts]);

  const profitMargin = useMemo(() => 
    totalSales > 0 ? (totalProfitCalc / totalSales) * 100 : 0,
    [totalSales, totalProfitCalc]
  );

  const totalProductsCount = useMemo(() => activeProducts.length, [activeProducts]);
  const totalStock = useMemo(() => 
    activeProducts.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0),
    [activeProducts]
  );

  // ✅ Low stock products - ONLY active products with quantity < 10
  const lowStockProducts = useMemo(() => {
    return activeProducts.filter(p => (parseInt(p.quantity) || 0) < 10);
  }, [activeProducts]);

  const recentInvoices = useMemo(() => 
    [...filteredInvoices]
      .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
      .slice(0, 5),
    [filteredInvoices]
  );

  // ✅ Monthly data - FILTERED and DYNAMIC (with expenses)
  const monthlyData = useMemo(() => {
    const monthly = {};
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize all months with 0
    monthOrder.forEach(m => {
      monthly[m] = { sales: 0, profit: 0, expenses: 0, discount: 0 };
    });
    
    // Add invoice data
    filteredInvoices.forEach(inv => {
      if (inv.invoice_date) {
        const date = new Date(inv.invoice_date);
        const month = date.toLocaleString('default', { month: 'short' });
        if (monthly[month]) {
          monthly[month].sales += parseFloat(inv.total_amount) || 0;
          monthly[month].discount += parseFloat(inv.discount) || 0;
          
          if (inv.items && inv.items.length > 0) {
            inv.items.forEach(item => {
              const product = activeProducts.find(p => p.name === item.service_name);
              if (product) {
                monthly[month].profit += (parseFloat(item.price) - parseFloat(product.purchase_price)) * parseInt(item.quantity || 1);
              } else {
                monthly[month].profit += parseFloat(item.price) * parseInt(item.quantity || 1);
              }
            });
          }
        }
      }
    });
    
    // Add expense data
    filteredExpenses.forEach(exp => {
      if (exp.date || exp.created_at) {
        const date = new Date(exp.date || exp.created_at);
        const month = date.toLocaleString('default', { month: 'short' });
        if (monthly[month]) {
          monthly[month].expenses += parseFloat(exp.amount) || 0;
        }
      }
    });
    
    return monthOrder.map(month => ({
      month,
      sales: monthly[month]?.sales || 0,
      profit: monthly[month]?.profit || 0,
      expenses: monthly[month]?.expenses || 0,
      discount: monthly[month]?.discount || 0
    }));
  }, [filteredInvoices, filteredExpenses, activeProducts]);

  // Product sales data - only active products
  const productSalesData = useMemo(() => 
    activeProducts.map(p => ({
      name: p.name,
      value: (parseFloat(p.selling_price) || 0) * (parseInt(p.quantity) || 0)
    })).filter(p => p.value > 0),
    [activeProducts]
  );

  const COLORS = useMemo(() => ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'], []);

  // ✅ FIX: Ensure data is always array
  const fetchAllData = useCallback(async () => {
    const abortController = new AbortController();
    setLoading(true);
    try {
      const [productsRes, expensesRes, invoicesRes, servicesRes] = await Promise.all([
        api.get('/products', { signal: abortController.signal }),
        api.get('/expenses', { signal: abortController.signal }),
        api.get('/invoices', { signal: abortController.signal }),
        api.get('/services', { signal: abortController.signal })
      ]);
      
      let productsData = [];
      if (productsRes.data?.success && Array.isArray(productsRes.data.data)) {
        productsData = productsRes.data.data;
      } else if (Array.isArray(productsRes.data)) {
        productsData = productsRes.data;
      } else {
        productsData = [];
      }
      
      setProducts(productsData);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching data:', err);
        toast.error('Failed to load data');
        setProducts([]);
        setExpenses([]);
        setInvoices([]);
        setServices([]);
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
      'finance-overview': 'Finance Dashboard',
      'finance-expenses': 'Expenses Management',
      'finance-charts': 'Financial Charts & Analytics',
      'finance-reports': 'Finance Reports & Distribution',
      'finance-reminders': 'Upcoming Payments & Reminders',
      'finance-credit': 'Credit Management',
      billing: 'Billing System',
      record: 'Records Archive',
      reminders: 'Reminders',
      users: 'User Management'
    };
    return titles[activeMenu] || 'Dashboard';
  }, [activeMenu]);

  const getMenuDescription = useCallback(() => {
    const descriptions = {
      'all-data': 'Everything at a glance - Sales, Expenses, Products, Invoices',
      inventory: 'Manage products, track purchases and sales',
      'finance-overview': 'View daily, weekly and monthly financial overview',
      'finance-expenses': 'Add, edit and manage all expenses',
      'finance-charts': 'Visualize financial data with interactive charts',
      'finance-reports': 'Analyze expense distribution and generate reports',
      'finance-reminders': 'Track upcoming bills, salaries and payments',
      'finance-credit': 'Manage vendor credits, payments and history',
      billing: 'Create bills, print invoices, export data',
      record: 'View all transaction history',
      reminders: 'Birthday, Tuning & Oil Change reminders',
      users: 'Manage system users and employees'
    };
    return descriptions[activeMenu] || '';
  }, [activeMenu]);

  const getActiveIcon = useCallback(() => {
    const icons = {
      'all-data': <FiBarChart2 className="text-2xl" />,
      inventory: <FiPackage className="text-2xl" />,
      'finance-overview': <FiDollarSign className="text-2xl" />,
      'finance-expenses': <FiFileText className="text-2xl" />,
      'finance-charts': <FiBarChart2 className="text-2xl" />,
      'finance-reports': <FiBarChart2 className="text-2xl" />,
      'finance-reminders': <FiBell className="text-2xl" />,
      'finance-credit': <FiCreditCard className="text-2xl" />,
      billing: <FiFileText className="text-2xl" />,
      record: <FiBarChart2 className="text-2xl" />,
      reminders: <FiBell className="text-2xl" />,
      users: <FiUsers className="text-2xl" />
    };
    return icons[activeMenu] || <FiPackage className="text-2xl" />;
  }, [activeMenu]);

  // ✅ Get filter label
  const getFilterLabel = useCallback(() => {
    const labels = {
      all: 'All Time',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year'
    };
    return labels[timeFilter] || 'All Time';
  }, [timeFilter]);

  // ✅ Render chart based on selected type
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
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="flex h-screen">
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          darkMode={darkMode}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
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
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition ${darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-gray-800'}`}
              >
                {darkMode ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
              </button>
              <button onClick={handleLogout} className={`p-2 rounded-full transition ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}>
                <FiLogOut className="text-xl" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-y-auto p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            
            {/* ALL DATA VIEW - Admin only */}
            {activeMenu === 'all-data' && userRole !== 'employee' && (
              <div className="space-y-6">
                {/* ✅ FILTER BUTTONS */}
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

                {/* ✅ CHART TYPE BUTTONS - Line, Bar, Area, Composed */}
                <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 mr-4">
                    <FiBarChart2 className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Chart Type:</span>
                  </div>
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      chartType === 'line' 
                        ? 'bg-red-500 text-white shadow-md' 
                        : darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      chartType === 'bar' 
                        ? 'bg-red-500 text-white shadow-md' 
                        : darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      chartType === 'area' 
                        ? 'bg-red-500 text-white shadow-md' 
                        : darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setChartType('composed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      chartType === 'composed' 
                        ? 'bg-red-500 text-white shadow-md' 
                        : darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Composed
                  </button>
                </div>

                {/* ✅ 5 STATS CARDS - Sales, Profit, Expenses, Products, Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  <StatsCard 
                    title="Total Sales" 
                    value={`Rs. ${totalSales.toLocaleString()}`} 
                    icon={FiDollarSign} 
                    color="from-red-500 to-red-600" 
                    darkMode={darkMode} 
                  />
                  <StatsCard 
                    title="Total Profit" 
                    value={`Rs. ${totalProfitCalc.toLocaleString()}`} 
                    subtitle={`Margin: ${profitMargin.toFixed(1)}%`} 
                    icon={FiTrendingUp} 
                    color="from-green-500 to-green-600" 
                    darkMode={darkMode} 
                  />
                  <StatsCard 
                    title="Total Expenses" 
                    value={`Rs. ${totalExpensesSum.toLocaleString()}`} 
                    icon={FiShoppingCart} 
                    color="from-blue-500 to-blue-600" 
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
                  <StatsCard 
                    title="Total Discount" 
                    value={`Rs. ${totalDiscount.toLocaleString()}`} 
                    icon={FiGift} 
                    color="from-sky-400 to-sky-500" 
                    darkMode={darkMode} 
                  />
                </div>

                {/* ✅ CHARTS SECTION - SIDE BY SIDE (65% / 35%) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Chart - 65% space */}
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

                  {/* Product Sales Distribution (Pie Chart) - 35% space */}
                  {productSalesData.length > 0 && (
                    <div className={`lg:col-span-1 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        <FiBarChart2 className="text-red-500" /> Product Sales Distribution
                      </h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={productSalesData} 
                              cx="50%" 
                              cy="50%" 
                              labelLine={false} 
                              label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} 
                              outerRadius={100} 
                              dataKey="value"
                            >
                              {productSalesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }} />
                            <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Invoices - DYNAMIC based on filter */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiFileText className="text-red-500" /> Recent Invoices
                      <span className={`text-xs font-normal ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({getFilterLabel()})
                      </span>
                    </h3>
                    <button onClick={() => setActiveMenu('record')} className="text-red-500 text-sm hover:text-red-600 flex items-center gap-1">
                      View All <FiArrowRight className="text-xs" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
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
                              <td className="px-6 py-4 text-sm font-medium">{inv.invoice_no || inv.invoiceNo}</td>
                              <td className="px-6 py-4 text-sm">{inv.customer_name || inv.customer?.name || 'Walk-in'}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-red-500 text-right">Rs. {(inv.total_amount || inv.total || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm text-center">
                                <span className={`px-2 py-1 rounded-full text-xs ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
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

                {/* Low Stock Alerts - UNCHANGED */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiAlertCircle className="text-red-500" /> Low Stock Alerts
                      <span className={`text-xs font-normal ml-2 ${lowStockProducts.length > 0 ? 'text-red-500 font-bold' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({lowStockProducts.length} products)
                      </span>
                    </h3>
                    {lowStockProducts.length > 0 && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                        ⚠️ Needs Attention
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    {lowStockProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <FiCheckCircle className="text-5xl mx-auto text-green-500 mb-2" />
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>All active products have sufficient stock</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Only products with less than 10 units are shown</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lowStockProducts.map(p => (
                          <div key={p.id} className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                            p.quantity <= 3 
                              ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-700' 
                              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-700'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-2 h-12 rounded-full ${p.quantity <= 3 ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                              <div>
                                <span className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {p.name}
                                </span>
                                <span className={`text-xs ml-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Stock: {p.quantity} units
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-bold text-lg ${p.quantity <= 3 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {p.quantity} left
                              </span>
                              <button 
                                onClick={() => setActiveMenu('inventory')} 
                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition font-medium shadow-md flex items-center gap-2"
                              >
                                <FiPackage className="text-sm" /> Restock Now
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions - UNCHANGED */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button onClick={() => setActiveMenu('billing')} className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-md flex items-center justify-center gap-2">
                    <FiFileText /> New Bill
                  </button>
                  <button onClick={() => setActiveMenu('inventory')} className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                    <FiPackage /> Add Product
                  </button>
                  <button onClick={() => setActiveMenu('record')} className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                    <FiShoppingCart /> View Records
                  </button>
                  <button onClick={() => setActiveMenu('finance-overview')} className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                    <FiDollarSign /> Add Expense
                  </button>
                </div>
              </div>
            )}

            {/* Other Components with Suspense for lazy loading */}
            <Suspense fallback={<LoadingFallback darkMode={darkMode} />}>
              {activeMenu === 'inventory' && (
                <Inventory products={productsArray} darkMode={darkMode} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} />
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
                <Billing darkMode={darkMode} />
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
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;