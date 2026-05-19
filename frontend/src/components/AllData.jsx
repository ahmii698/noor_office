// src/components/AllData.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiPackage, FiDollarSign, FiFileText, FiBarChart2, 
  FiShoppingCart, FiTrendingUp, 
  FiAlertCircle, FiCheckCircle, FiClock, FiArrowRight,
  FiSun, FiMoon, FiLogOut, FiMenu, FiChevronLeft,
  FiPieChart
} from 'react-icons/fi';

const AllData = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Sample Data
  const totalSales = 125000;
  const totalProfit = 45000;
  const totalExpenses = 80000;
  const totalProducts = 12;
  const paidInvoices = 8;
  const pendingInvoices = 4;

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    toast.success('Logged out');
    navigate('/');
  };

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
          <div className={`flex-1 overflow-y-auto p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            
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
                  </div>
                  <FiPackage className="text-3xl opacity-50" />
                </div>
              </div>
            </div>

            {/* Invoice Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
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
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <FiClock className="text-yellow-500 text-2xl" />
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending/Partial</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{pendingInvoices}</p>
                  </div>
                </div>
              </div>
            </div>

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

            {/* Demo Note */}
            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                This is demo data. Connect your backend to see real data from Inventory, Billing, Records, and Finance modules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllData;