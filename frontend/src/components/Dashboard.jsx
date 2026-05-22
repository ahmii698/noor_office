// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiMenu, FiChevronLeft, FiSun, FiMoon, FiLogOut, 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiBell, FiTrendingUp, FiShoppingCart, FiCheckCircle, 
  FiAlertCircle, FiClock, FiArrowRight, FiLoader
} from 'react-icons/fi';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from './Sidebar';
import Inventory from './Inventory';
import FinanceOverview from './finance/FinanceOverview';
import FinanceExpenses from './finance/FinanceExpenses';
import FinanceCharts from './finance/FinanceCharts';
import FinanceReports from './finance/FinanceReports';
import FinanceReminders from './finance/FinanceReminders';
import Billing from './Billing';
import Records from './Records';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('all-data');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // State for dynamic data
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);

  // Fetch all data from API
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [productsRes, expensesRes, invoicesRes, servicesRes] = await Promise.all([
        api.get('/products'),
        api.get('/expenses'),
        api.get('/invoices'),
        api.get('/services')
      ]);
      
      setProducts(productsRes.data || []);
      setExpenses(expensesRes.data || []);
      setInvoices(invoicesRes.data || []);
      setServices(servicesRes.data || []);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleAddProduct = async (product) => {
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
  };

  const handleUpdateProduct = async (updatedProduct) => {
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
  };

  const handleAddExpense = async (expense) => {
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
  };

  const handleUpdateExpense = async (updatedExpense) => {
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
  };

  const handleLogout = async () => {
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
  };

  // Calculate Stats for All Data
  const totalSales = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const totalExpensesSum = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  
  // Calculate total profit from invoices
  let totalProfitCalc = 0;
  for (const inv of invoices) {
    if (inv.items && inv.items.length > 0) {
      for (const item of inv.items) {
        const product = products.find(p => p.name === item.service_name);
        if (product) {
          const profit = (parseFloat(item.price) - parseFloat(product.purchase_price)) * parseInt(item.quantity);
          totalProfitCalc += profit;
        } else {
          totalProfitCalc += parseFloat(item.price) * parseInt(item.quantity);
        }
      }
    }
  }
  const totalProfit = totalProfitCalc;
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const totalProductsCount = products.length;
  const totalStock = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
  const lowStockProducts = products.filter(p => (p.quantity || 0) < 10);
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
    .slice(0, 5);

  // Chart Data
  const monthlyData = [
    { month: 'Jan', sales: totalSales * 0.1, profit: totalProfit * 0.08 },
    { month: 'Feb', sales: totalSales * 0.15, profit: totalProfit * 0.12 },
    { month: 'Mar', sales: totalSales * 0.12, profit: totalProfit * 0.1 },
    { month: 'Apr', sales: totalSales * 0.18, profit: totalProfit * 0.15 },
    { month: 'May', sales: totalSales * 0.2, profit: totalProfit * 0.18 },
    { month: 'Jun', sales: totalSales * 0.25, profit: totalProfit * 0.22 },
  ];

  const productSalesData = products.map(p => ({
    name: p.name,
    value: (parseFloat(p.selling_price) || 0) * (parseInt(p.quantity) || 0)
  }));

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4'];

  const getMenuTitle = () => {
    const titles = {
      'all-data': 'Complete Business Overview',
      inventory: 'Inventory Management',
      'finance-overview': 'Finance Dashboard',
      'finance-expenses': 'Expenses Management',
      'finance-charts': 'Financial Charts & Analytics',
      'finance-reports': 'Finance Reports & Distribution',
      'finance-reminders': 'Upcoming Payments & Reminders',
      billing: 'Billing System',
      record: 'Records Archive'
    };
    return titles[activeMenu] || 'Dashboard';
  };

  const getMenuDescription = () => {
    const descriptions = {
      'all-data': 'Everything at a glance - Sales, Expenses, Products, Invoices',
      inventory: 'Manage products, track purchases and sales',
      'finance-overview': 'View daily, weekly and monthly financial overview',
      'finance-expenses': 'Add, edit and manage all expenses',
      'finance-charts': 'Visualize financial data with interactive charts',
      'finance-reports': 'Analyze expense distribution and generate reports',
      'finance-reminders': 'Track upcoming bills, salaries and payments',
      billing: 'Create bills, print invoices, export data',
      record: 'View all transaction history'
    };
    return descriptions[activeMenu] || '';
  };

  const getActiveIcon = () => {
    const icons = {
      'all-data': <FiBarChart2 className="text-2xl" />,
      inventory: <FiPackage className="text-2xl" />,
      'finance-overview': <FiDollarSign className="text-2xl" />,
      'finance-expenses': <FiFileText className="text-2xl" />,
      'finance-charts': <FiBarChart2 className="text-2xl" />,
      'finance-reports': <FiBarChart2 className="text-2xl" />,
      'finance-reminders': <FiBell className="text-2xl" />,
      billing: <FiFileText className="text-2xl" />,
      record: <FiBarChart2 className="text-2xl" />
    };
    return icons[activeMenu] || <FiPackage className="text-2xl" />;
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
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
              </button>
              <button onClick={handleLogout} className={`p-2 rounded-full transition ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`} title="Logout">
                <FiLogOut className="text-xl" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-y-auto p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            
            {/* ALL DATA VIEW */}
            {activeMenu === 'all-data' && (
              <div className="space-y-6">
                {/* 4 Main Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm opacity-90">Total Sales</p>
                        <p className="text-3xl font-bold mt-2">Rs. {totalSales.toLocaleString()}</p>
                      </div>
                      <FiDollarSign className="text-3xl opacity-50" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm opacity-90">Total Profit</p>
                        <p className="text-3xl font-bold mt-2">Rs. {totalProfit.toLocaleString()}</p>
                        <p className="text-xs opacity-75 mt-1">Margin: {profitMargin.toFixed(1)}%</p>
                      </div>
                      <FiTrendingUp className="text-3xl opacity-50" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm opacity-90">Total Expenses</p>
                        <p className="text-3xl font-bold mt-2">Rs. {totalExpensesSum.toLocaleString()}</p>
                      </div>
                      <FiShoppingCart className="text-3xl opacity-50" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm opacity-90">Total Products</p>
                        <p className="text-3xl font-bold mt-2">{totalProductsCount}</p>
                        <p className="text-xs opacity-75 mt-1">{totalStock} units in stock</p>
                      </div>
                      <FiPackage className="text-3xl opacity-50" />
                    </div>
                  </div>
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
                          <Pie data={productSalesData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
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

            {/* Other Components */}
            {activeMenu === 'inventory' && (
              <Inventory products={products} darkMode={darkMode} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} />
            )}
            
            {activeMenu === 'finance-overview' && (
              <FinanceOverview darkMode={darkMode} />
            )}
            {activeMenu === 'finance-expenses' && (
              <FinanceExpenses darkMode={darkMode} />
            )}
            {activeMenu === 'finance-charts' && (
              <FinanceCharts darkMode={darkMode} />
            )}
            {activeMenu === 'finance-reports' && (
              <FinanceReports darkMode={darkMode} />
            )}
            {activeMenu === 'finance-reminders' && (
              <FinanceReminders darkMode={darkMode} />
            )}
            
            {activeMenu === 'billing' && (
              <Billing darkMode={darkMode} />
            )}
            
            {activeMenu === 'record' && (
              <Records darkMode={darkMode} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;