// src/components/Dashboard.jsx (sirf relevant part - records wala section)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiMenu, FiChevronLeft, FiSun, FiMoon, FiLogOut, 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiBell, FiTrendingUp, FiShoppingCart, FiCheckCircle, 
  FiAlertCircle, FiClock, FiArrowRight, FiPieChart 
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('all-data');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  
  const [products, setProducts] = useState([
    { id: 1, name: 'AC Compressor', purchasePrice: 15000, sellingPrice: 22000, quantity: 10, dateAdded: new Date().toISOString() },
    { id: 2, name: 'Cooling Coil', purchasePrice: 5000, sellingPrice: 8500, quantity: 15, dateAdded: new Date().toISOString() },
    { id: 3, name: 'AC Gas (R134a)', purchasePrice: 1200, sellingPrice: 2500, quantity: 30, dateAdded: new Date().toISOString() },
    { id: 4, name: 'Blower Motor', purchasePrice: 3500, sellingPrice: 6000, quantity: 8, dateAdded: new Date().toISOString() },
  ]);
  
  const [services] = useState([
    { id: 1, name: 'AC Gas Refill', price: 2000, category: 'AC Service', icon: '🆒' },
    { id: 2, name: 'AC Compressor Repair', price: 5000, category: 'Repair', icon: '🔧' },
    { id: 3, name: 'Full AC Service', price: 8000, category: 'Service', icon: '🛠️' },
    { id: 4, name: 'Leak Detection', price: 1500, category: 'Diagnostic', icon: '🔍' },
    { id: 5, name: 'Condenser Cleaning', price: 2500, category: 'Maintenance', icon: '🧹' },
    { id: 6, name: 'AC Filter Change', price: 800, category: 'Replacement', icon: '🔄' },
    { id: 7, name: 'Engine Tuning', price: 3500, category: 'Tuning', icon: '⚡' },
    { id: 8, name: 'Performance Tuning', price: 7000, category: 'Tuning', icon: '🚀' },
  ]);
  
  const [cart, setCart] = useState([]);
  const [invoices, setInvoices] = useState([
    { id: 1, invoiceNo: 'INV-001', date: '2024-01-15', total: 22000, status: 'Paid', customer: { name: 'Ahmed Khan', phone: '03001234567', carNumber: 'ABC-123' }, items: [{ name: 'AC Compressor', price: 22000 }] },
    { id: 2, invoiceNo: 'INV-002', date: '2024-01-20', total: 8500, status: 'Paid', customer: { name: 'Sara Ali', phone: '03007654321', carNumber: 'XYZ-789' }, items: [{ name: 'Cooling Coil', price: 8500 }] },
    { id: 3, invoiceNo: 'INV-003', date: '2024-01-25', total: 5000, status: 'Partial', customer: { name: 'Bilal Shah', phone: '03111234567', carNumber: 'DEF-456' }, items: [{ name: 'AC Gas', price: 2500 }, { name: 'Service', price: 2500 }] },
    { id: 4, invoiceNo: 'INV-004', date: '2024-02-01', total: 12000, status: 'Paid', customer: { name: 'Fatima Zaidi', phone: '03331234567', carNumber: 'GHI-789' }, items: [{ name: 'AC Compressor', price: 12000 }] },
    { id: 5, invoiceNo: 'INV-005', date: '2024-02-10', total: 3000, status: 'Pending', customer: { name: 'Omar Farooq', phone: '03451234567', carNumber: 'JKL-012' }, items: [{ name: 'AC Gas', price: 3000 }] },
  ]);
  
  const [expenses, setExpenses] = useState([
    { id: 1, description: 'Shop Rent', amount: 25000, date: '2024-01-15', type: 'Monthly', category: 'Office' },
    { id: 2, description: 'Electricity Bill', amount: 8000, date: '2024-01-20', type: 'Monthly', category: 'Utilities' },
    { id: 3, description: 'Employee Salary', amount: 50000, date: '2024-01-25', type: 'Monthly', category: 'Staff' },
  ]);

  const handleAddProduct = (product) => {
    setProducts([...products, product]);
  };

  const handleUpdateProduct = (updatedProduct) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleAddExpense = (expense) => {
    setExpenses([...expenses, expense]);
  };

  const handleUpdateExpense = (updatedExpense) => {
    setExpenses(expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    toast.success('Logged out');
    navigate('/');
  };

  // Calculate Stats for All Data
  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpensesSum = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalProfit = totalSales - totalExpensesSum;
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const totalProductsCount = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
  const partialInvoices = invoices.filter(inv => inv.status === 'Partial').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
  const lowStockProducts = products.filter(p => p.quantity < 10);
  const recentInvoices = invoices.slice(-5).reverse();

  // Chart Data
  const monthlyData = [
    { month: 'Jan', sales: 35000, profit: 10000 },
    { month: 'Feb', sales: 42000, profit: 14000 },
    { month: 'Mar', sales: 38000, profit: 12000 },
    { month: 'Apr', sales: 45000, profit: 15000 },
    { month: 'May', sales: 48000, profit: 16000 },
    { month: 'Jun', sales: 52000, profit: 17000 },
  ];

  const productSalesData = products.map(p => ({
    name: p.name,
    value: p.sellingPrice * p.quantity
  }));

  const expenseData = expenses.reduce((acc, exp) => {
    acc[exp.type] = (acc[exp.type] || 0) + exp.amount;
    return acc;
  }, {});
  const expenseChartData = Object.entries(expenseData).map(([name, value]) => ({ name, value }));

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
                {/* Stats Cards */}
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

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      <FiPieChart className="text-red-500" /> Product Sales Distribution
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={productSalesData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                            {productSalesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }} />
                          <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Expense Distribution */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FiPieChart className="text-red-500" /> Expense Distribution by Type
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseChartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                          {expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }} />
                        <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Invoice Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-4`}>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <FiCheckCircle className="text-green-500 text-2xl" />
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Paid Invoices</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{paidInvoices}</p>
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-4`}>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <FiAlertCircle className="text-yellow-500 text-2xl" />
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Partial Payments</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{partialInvoices}</p>
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-4`}>
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <FiClock className="text-red-500 text-2xl" />
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending Invoices</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{pendingInvoices}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Invoices & Low Stock */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                          {recentInvoices.map(inv => (
                            <tr key={inv.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4 text-sm font-medium">{inv.invoiceNo}</td>
                              <td className="px-6 py-4 text-sm">{inv.customer?.name}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-red-500">Rs. {inv.total.toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

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
              <FinanceOverview products={products} expenses={expenses} darkMode={darkMode} />
            )}
            {activeMenu === 'finance-expenses' && (
              <FinanceExpenses expenses={expenses} onAddExpense={handleAddExpense} onUpdateExpense={handleUpdateExpense} darkMode={darkMode} />
            )}
            {activeMenu === 'finance-charts' && (
              <FinanceCharts products={products} expenses={expenses} darkMode={darkMode} />
            )}
            {activeMenu === 'finance-reports' && (
              <FinanceReports products={products} expenses={expenses} darkMode={darkMode} />
            )}
            {activeMenu === 'finance-reminders' && (
              <FinanceReminders darkMode={darkMode} />
            )}
            
            {activeMenu === 'billing' && (
              <Billing services={services} invoices={invoices} setInvoices={setInvoices} cart={cart} setCart={setCart} products={products} setProducts={setProducts} darkMode={darkMode} />
            )}
            
            {/* YAHAN FIX KIYA - invoices pass karo */}
            {activeMenu === 'record' && (
              <Records invoices={invoices} darkMode={darkMode} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;