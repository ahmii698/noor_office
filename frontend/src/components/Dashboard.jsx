// src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiMenu, FiChevronLeft, FiSun, FiMoon, FiLogOut, 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiBell, FiTrendingUp, FiShoppingCart, FiCheckCircle, 
  FiAlertCircle, FiClock, FiArrowRight, FiLoader, FiUsers
} from 'react-icons/fi';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  
  // ✅ Set default menu based on role
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

  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);

  // ✅ Check user role on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);
      
      // ✅ If employee, set default to billing
      if (userData.role === 'employee') {
        setActiveMenu('billing');
      } else {
        setActiveMenu('all-data');
      }
    }
  }, []);

  const totalSales = useMemo(() => 
    invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
    [invoices]
  );

  const totalExpensesSum = useMemo(() => 
    expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0),
    [expenses]
  );

  const totalProfitCalc = useMemo(() => {
    let profit = 0;
    for (const inv of invoices) {
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          const product = products.find(p => p.name === item.service_name);
          if (product) {
            const itemProfit = (parseFloat(item.price) - parseFloat(product.purchase_price)) * parseInt(item.quantity);
            profit += itemProfit;
          } else {
            profit += parseFloat(item.price) * parseInt(item.quantity);
          }
        }
      }
    }
    return profit;
  }, [invoices, products]);

  const profitMargin = useMemo(() => 
    totalSales > 0 ? (totalProfitCalc / totalSales) * 100 : 0,
    [totalSales, totalProfitCalc]
  );

  const totalProductsCount = useMemo(() => products.length, [products]);
  const totalStock = useMemo(() => 
    products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0),
    [products]
  );

  const lowStockProducts = useMemo(() => 
    products.filter(p => (p.quantity || 0) < 10),
    [products]
  );

  const recentInvoices = useMemo(() => 
    [...invoices]
      .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
      .slice(0, 5),
    [invoices]
  );

  const monthlyData = useMemo(() => {
    const monthly = {};
    invoices.forEach(inv => {
      if (inv.invoice_date) {
        const date = new Date(inv.invoice_date);
        const month = date.toLocaleString('default', { month: 'short' });
        if (!monthly[month]) {
          monthly[month] = { sales: 0, profit: 0 };
        }
        monthly[month].sales += parseFloat(inv.total_amount) || 0;
        
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(item => {
            const product = products.find(p => p.name === item.service_name);
            if (product) {
              monthly[month].profit += (parseFloat(item.price) - parseFloat(product.purchase_price)) * parseInt(item.quantity);
            } else {
              monthly[month].profit += parseFloat(item.price) * parseInt(item.quantity);
            }
          });
        }
      }
    });
    
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthOrder.map(month => ({
      month,
      sales: monthly[month]?.sales || 0,
      profit: monthly[month]?.profit || 0
    }));
  }, [invoices, products]);

  const productSalesData = useMemo(() => 
    products.map(p => ({
      name: p.name,
      value: (parseFloat(p.selling_price) || 0) * (parseInt(p.quantity) || 0)
    })).filter(p => p.value > 0),
    [products]
  );

  const COLORS = useMemo(() => ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4'], []);

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
      
      setProducts(productsRes.data || []);
      setExpenses(expensesRes.data || []);
      setInvoices(invoicesRes.data || []);
      setServices(servicesRes.data || []);
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching data:', err);
        toast.error('Failed to load data');
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
      billing: <FiFileText className="text-2xl" />,
      record: <FiBarChart2 className="text-2xl" />,
      reminders: <FiBell className="text-2xl" />,
      users: <FiUsers className="text-2xl" />
    };
    return icons[activeMenu] || <FiPackage className="text-2xl" />;
  }, [activeMenu]);

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
                {/* 4 Main Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatsCard title="Total Sales" value={`Rs. ${totalSales.toLocaleString()}`} icon={FiDollarSign} color="from-red-500 to-red-600" darkMode={darkMode} />
                  <StatsCard title="Total Profit" value={`Rs. ${totalProfitCalc.toLocaleString()}`} subtitle={`Margin: ${profitMargin.toFixed(1)}%`} icon={FiTrendingUp} color="from-green-500 to-green-600" darkMode={darkMode} />
                  <StatsCard title="Total Expenses" value={`Rs. ${totalExpensesSum.toLocaleString()}`} icon={FiShoppingCart} color="from-blue-500 to-blue-600" darkMode={darkMode} />
                  <StatsCard title="Total Products" value={totalProductsCount} subtitle={`${totalStock} units in stock`} icon={FiPackage} color="from-purple-500 to-purple-600" darkMode={darkMode} />
                </div>

                {/* Monthly Sales & Profit Chart */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FiTrendingUp className="text-red-500" /> Monthly Sales & Profit
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid stroke={darkMode ? '#374151' : '#e5e7eb'} strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                        <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }} />
                        <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                        <Line type="monotone" dataKey="sales" stroke="#ef4444" name="Sales" strokeWidth={2} />
                        <Line type="monotone" dataKey="profit" stroke="#22c55e" name="Profit" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Product Sales Distribution */}
                {productSalesData.length > 0 && (
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiBarChart2 className="text-red-500" /> Product Sales Distribution
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={productSalesData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} outerRadius={100} dataKey="value">
                            {productSalesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }} />
                          <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Recent Invoices */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiFileText className="text-red-500" /> Recent Invoices
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
                        {recentInvoices.map(inv => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Low Stock Alerts */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="px-6 py-4 border-b">
                    <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiAlertCircle className="text-yellow-500" /> Low Stock Alerts
                    </h3>
                  </div>
                  <div className="p-4">
                    {lowStockProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <FiCheckCircle className="text-5xl mx-auto text-green-500 mb-2" />
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>All products have sufficient stock</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lowStockProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-red-500 font-semibold">Only {p.quantity} left</span>
                            <button onClick={() => setActiveMenu('inventory')} className="text-red-500 text-sm hover:text-red-600">Restock</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
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
                <Inventory products={products} darkMode={darkMode} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} />
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
              
              {activeMenu === 'billing' && (
                <Billing darkMode={darkMode} />
              )}
              
              {activeMenu === 'record' && userRole !== 'employee' && (
                <Records darkMode={darkMode} />
              )}

              {activeMenu === 'reminders' && (
                <Reminders darkMode={darkMode} />
              )}

              {/* ✅ USERS PAGE - Admin only */}
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