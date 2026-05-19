// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMenu, FiChevronLeft, FiSun, FiMoon, FiLogOut, FiPackage, FiDollarSign, FiFileText, FiBarChart2, FiBell } from 'react-icons/fi';
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
  const [activeMenu, setActiveMenu] = useState('finance-overview');
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
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([
    { id: 1, description: 'Shop Rent', amount: 25000, date: '2024-01-15', type: 'Monthly', category: 'Office' },
    { id: 2, description: 'Electricity Bill', amount: 5000, date: '2024-01-20', type: 'Monthly', category: 'Utilities' },
    { id: 3, description: 'Tools Purchase', amount: 12000, date: '2024-01-10', type: 'One-time', category: 'Supplies' },
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

  const getMenuTitle = () => {
    const titles = {
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
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm px-6 py-3 flex justify-between items-center`}>
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
            {activeMenu === 'inventory' && (
              <Inventory products={products} darkMode={darkMode} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} />
            )}
            
            {/* Finance Submenu Pages */}
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