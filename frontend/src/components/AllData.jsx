// src/components/AllData.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiShoppingCart, FiTrendingUp, 
  FiAlertCircle, FiCheckCircle, FiClock, FiArrowRight,
  FiSun, FiMoon, FiLogOut, FiMenu, FiChevronLeft,
  FiLoader
} from 'react-icons/fi';
import api from '../services/api';

const AllData = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dynamic state variables
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [paidInvoices, setPaidInvoices] = useState(0);
  const [partialInvoices, setPartialInvoices] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard stats
      const statsRes = await api.get('/dashboard/stats');
      if (statsRes.data) {
        setTotalSales(statsRes.data.totalSales || 0);
        setTotalProfit(statsRes.data.totalProfit || 0);
        setTotalExpenses(statsRes.data.totalExpenses || 0);
        setTotalProducts(statsRes.data.totalProducts || 0);
        setProfitMargin(statsRes.data.profitMargin || 0);
        setPaidInvoices(statsRes.data.paidInvoices || 0);
        setPartialInvoices(statsRes.data.partialInvoices || 0);
        setPendingInvoices(statsRes.data.pendingInvoices || 0);
        setTotalStock(statsRes.data.totalStock || 0);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard data');
    }
  };

  // Fetch recent invoices
  const fetchRecentInvoices = async () => {
    try {
      const invoicesRes = await api.get('/dashboard/recent-invoices');
      if (invoicesRes.data && Array.isArray(invoicesRes.data)) {
        setRecentInvoices(invoicesRes.data);
      }
    } catch (err) {
      console.error('Error fetching recent invoices:', err);
    }
  };

  // Fetch low stock products
  const fetchLowStockProducts = async () => {
    try {
      const lowStockRes = await api.get('/dashboard/low-stock');
      if (lowStockRes.data && Array.isArray(lowStockRes.data)) {
        setLowStockProducts(lowStockRes.data);
      }
    } catch (err) {
      console.error('Error fetching low stock products:', err);
    }
  };

  // Fetch all data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchRecentInvoices(),
        fetchLowStockProducts()
      ]);
      setLoading(false);
    };
    
    loadAllData();
  }, []);

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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`fixed lg:relative z-40 bg-black shadow-2xl transition-all duration-300 h-full ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
          <div className="pt-6 pb-4 px-6 border-b border-gray-800 flex justify-center">
            <div className={`flex items-center justify-center overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-56 h-32 rounded-xl' : 'w-12 h-12 rounded-full'}`}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <div className="p-4">
            {[
              { id: 'all-data', label: 'All Data', icon: FiBarChart2, path: '/all-data' },
              { id: 'inventory', label: 'Inventory', icon: FiPackage, path: '/inventory' },
              { id: 'billing', label: 'Billing', icon: FiFileText, path: '/billing' },
              { id: 'records', label: 'Records', icon: FiShoppingCart, path: '/records' },
              { id: 'finance', label: 'Finance', icon: FiDollarSign, path: '/finance' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} to={item.path}>
                  <button className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-2 transition-all duration-300 ${!isSidebarOpen ? 'justify-center' : ''} text-gray-400 hover:bg-white/5 hover:text-white`}>
                    <Icon className="text-2xl shrink-0" />
                    {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                  </button>
                </Link>
              );
            })}
          </div>
          
          <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all duration-300 ${!isSidebarOpen ? 'justify-center' : ''}`}>
              <FiLogOut className="text-xl shrink-0" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm px-6 py-3 flex justify-between items-center border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}>
                {isSidebarOpen ? <FiChevronLeft className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
              <div className="text-2xl"><FiBarChart2 className="text-red-500 text-2xl" /></div>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Complete Business Overview</h2>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>All data at a glance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full transition ${darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-gray-800'}`}>
                {darkMode ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                    <p className="text-3xl font-bold mt-2">Rs. {totalExpenses.toLocaleString()}</p>
                  </div>
                  <FiShoppingCart className="text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-90">Total Products</p>
                    <p className="text-3xl font-bold mt-2">{totalProducts}</p>
                    <p className="text-xs opacity-75 mt-1">{totalStock} units in stock</p>
                  </div>
                  <FiPackage className="text-3xl opacity-50" />
                </div>
              </div>
            </div>

            {/* Invoice Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <FiCheckCircle className="text-green-500 text-2xl" />
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Paid Invoices</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{paidInvoices}</p>
                  </div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <FiAlertCircle className="text-yellow-500 text-2xl" />
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Partial Payments</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{partialInvoices}</p>
                  </div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <FiClock className="text-red-500 text-2xl" />
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending Invoices</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{pendingInvoices}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            {recentInvoices.length > 0 && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden mb-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FiFileText className="text-red-500" /> Recent Invoices
                  </h3>
                  <Link to="/records" className="text-red-500 text-sm hover:text-red-600 flex items-center gap-1">
                    View All <FiArrowRight className="text-xs" />
                  </Link>
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
                      {recentInvoices.map((inv) => (
                        <tr key={inv.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium">{inv.invoiceNo}</td>
                          <td className="px-6 py-4 text-sm">{inv.customer?.name || 'Walk-in'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-red-500">Rs. {inv.total_amount?.toLocaleString() || inv.total?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                              inv.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {inv.status}
                            </span>
                          <td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden mb-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="px-6 py-4 border-b">
                  <h3 className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FiAlertCircle className="text-yellow-500" /> Low Stock Alerts
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {lowStockProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 text-sm">{product.name}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-yellow-500">{product.quantity} units</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Low Stock</span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Link to="/inventory" className="text-red-500 hover:text-red-600 text-sm">Restock →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/billing">
                <button className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-md flex items-center justify-center gap-2">
                  <FiFileText /> New Bill
                </button>
              </Link>
              <Link to="/inventory">
                <button className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                  <FiPackage /> Add Product
                </button>
              </Link>
              <Link to="/records">
                <button className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                  <FiShoppingCart /> View Records
                </button>
              </Link>
              <Link to="/finance">
                <button className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-md flex items-center justify-center gap-2">
                  <FiDollarSign /> Add Expense
                </button>
              </Link>
            </div>

            {/* Error Message (if any) */}
            {error && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  ⚠️ {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllData;