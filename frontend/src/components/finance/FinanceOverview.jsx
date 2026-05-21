// src/components/finance/FinanceOverview.jsx
import React, { useState, useEffect } from 'react';
import StatsCards from './StatsCards';
import UpcomingPayments from './UpcomingPayments';
import { FiCalendar, FiTrendingUp, FiDollarSign, FiPackage, FiBarChart2, FiChevronDown, FiChevronUp, FiDownload, FiFileText, FiLoader } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FinanceOverview = ({ darkMode }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearlyReport, setShowYearlyReport] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for dynamic data
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalPurchase: 0,
    totalSelling: 0,
    totalProfit: 0
  });
  const [periodStats, setPeriodStats] = useState({
    daily: { totalExpenses: 0, totalRevenue: 0, netProfit: 0, profitMargin: 0, count: 0 },
    weekly: { totalExpenses: 0, totalRevenue: 0, netProfit: 0, profitMargin: 0, count: 0 },
    monthly: { totalExpenses: 0, totalRevenue: 0, netProfit: 0, profitMargin: 0, count: 0 },
    yearly: { totalExpenses: 0, totalRevenue: 0, netProfit: 0, profitMargin: 0, count: 0 }
  });
  
  const [todaySales, setTodaySales] = useState({ total: 0, items: 0, count: 0, profit: 0 });
  const [weeklySales, setWeeklySales] = useState({ total: 0, items: 0, count: 0, profit: 0 });
  const [monthlySales, setMonthlySales] = useState({ total: 0, items: 0, count: 0, profit: 0 });
  const [selectedYearData, setSelectedYearData] = useState({ total: 0, items: 0, count: 0, profit: 0 });
  const [yearProducts, setYearProducts] = useState([]);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  };

  // Fetch expenses from API
  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      if (response.data && Array.isArray(response.data)) {
        setExpenses(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching expenses:', err);
      return [];
    }
  };

  // Calculate inventory stats
  const calculateInventoryStats = (productsList) => {
    const stats = productsList.reduce((acc, product) => {
      acc.totalPurchase += product.purchase_price * product.quantity;
      acc.totalSelling += product.selling_price * product.quantity;
      acc.totalProfit += (product.selling_price - product.purchase_price) * product.quantity;
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
    
    setInventoryStats(stats);
    return stats;
  };

  // Get Today's Sales
  const calculateTodaySales = (productsList) => {
    const todayStr = new Date().toDateString();
    const todayProducts = productsList.filter(p => {
      const productDate = p.date_added ? new Date(p.date_added).toDateString() : false;
      return productDate === todayStr;
    });
    
    const todaySalesTotal = todayProducts.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
    const todayItems = todayProducts.reduce((sum, p) => sum + p.quantity, 0);
    const todayProfit = todayProducts.reduce((sum, p) => sum + ((p.selling_price - p.purchase_price) * p.quantity), 0);
    
    setTodaySales({
      total: todaySalesTotal,
      items: todayItems,
      count: todayProducts.length,
      profit: todayProfit
    });
  };

  // Get Weekly Sales
  const calculateWeeklySales = (productsList) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekProducts = productsList.filter(p => {
      if (!p.date_added) return false;
      return new Date(p.date_added) >= weekAgo;
    });
    
    const weeklySalesTotal = weekProducts.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
    const weeklyItems = weekProducts.reduce((sum, p) => sum + p.quantity, 0);
    const weeklyProfit = weekProducts.reduce((sum, p) => sum + ((p.selling_price - p.purchase_price) * p.quantity), 0);
    
    setWeeklySales({
      total: weeklySalesTotal,
      items: weeklyItems,
      count: weekProducts.length,
      profit: weeklyProfit
    });
  };

  // Get Monthly Sales
  const calculateMonthlySales = (productsList) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthProducts = productsList.filter(p => {
      if (!p.date_added) return false;
      const productDate = new Date(p.date_added);
      return productDate.getMonth() === currentMonth && productDate.getFullYear() === currentYear;
    });
    
    const monthlySalesTotal = monthProducts.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
    const monthlyItems = monthProducts.reduce((sum, p) => sum + p.quantity, 0);
    const monthlyProfit = monthProducts.reduce((sum, p) => sum + ((p.selling_price - p.purchase_price) * p.quantity), 0);
    
    setMonthlySales({
      total: monthlySalesTotal,
      items: monthlyItems,
      count: monthProducts.length,
      profit: monthlyProfit
    });
  };

  // Get Yearly Sales Data
  const calculateYearlySalesData = (productsList, year) => {
    const yearProductsList = productsList.filter(p => {
      if (!p.date_added) return false;
      return new Date(p.date_added).getFullYear() === year;
    });
    
    const yearlySales = yearProductsList.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
    const yearlyItems = yearProductsList.reduce((sum, p) => sum + p.quantity, 0);
    const yearlyProfit = yearProductsList.reduce((sum, p) => sum + ((p.selling_price - p.purchase_price) * p.quantity), 0);
    
    setSelectedYearData({
      total: yearlySales,
      items: yearlyItems,
      count: yearProductsList.length,
      profit: yearlyProfit
    });
    
    setYearProducts(yearProductsList);
  };

  // Calculate Period Stats (Expenses)
  const calculatePeriodStats = (expensesList) => {
    const now = new Date();
    
    const getFilteredExpenses = (period) => {
      if (period === 'daily') {
        return expensesList.filter(exp => new Date(exp.expense_date).toDateString() === now.toDateString());
      } else if (period === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return expensesList.filter(exp => new Date(exp.expense_date) >= weekAgo);
      } else if (period === 'monthly') {
        return expensesList.filter(exp => new Date(exp.expense_date).getMonth() === now.getMonth() && new Date(exp.expense_date).getFullYear() === now.getFullYear());
      } else {
        return expensesList.filter(exp => new Date(exp.expense_date).getFullYear() === now.getFullYear());
      }
    };
    
    const periods = ['daily', 'weekly', 'monthly', 'yearly'];
    const newPeriodStats = {};
    
    periods.forEach(period => {
      const filtered = getFilteredExpenses(period);
      const totalExpenses = filtered.reduce((sum, exp) => sum + exp.amount, 0);
      const totalRevenue = inventoryStats.totalSelling;
      const netProfit = totalRevenue - inventoryStats.totalPurchase - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      
      newPeriodStats[period] = {
        totalExpenses,
        totalRevenue,
        netProfit,
        profitMargin,
        count: filtered.length
      };
    });
    
    setPeriodStats(newPeriodStats);
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const productsList = await fetchProducts();
      const expensesList = await fetchExpenses();
      
      if (productsList.length === 0 && expensesList.length === 0) {
        setError('No data found. Please add products and expenses first.');
      }
      
      const stats = calculateInventoryStats(productsList);
      setInventoryStats(stats);
      
      calculateTodaySales(productsList);
      calculateWeeklySales(productsList);
      calculateMonthlySales(productsList);
      calculateYearlySalesData(productsList, selectedYear);
      calculatePeriodStats(expensesList);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load finance data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when selectedYear changes
  useEffect(() => {
    loadAllData();
  }, [selectedYear]);

  // Export to Excel for selected year
  const exportToExcel = () => {
    if (yearProducts.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }
    
    const exportData = yearProducts.map(p => ({
      'Product Name': p.name,
      'Purchase Price': `Rs. ${p.purchase_price?.toLocaleString() || 0}`,
      'Selling Price': `Rs. ${p.selling_price?.toLocaleString() || 0}`,
      'Quantity Sold': p.quantity || 0,
      'Total Purchase': `Rs. ${((p.purchase_price || 0) * (p.quantity || 0)).toLocaleString()}`,
      'Total Revenue': `Rs. ${((p.selling_price || 0) * (p.quantity || 0)).toLocaleString()}`,
      'Profit': `Rs. ${(((p.selling_price || 0) - (p.purchase_price || 0)) * (p.quantity || 0)).toLocaleString()}`,
      'Date Added': p.date_added ? new Date(p.date_added).toLocaleDateString() : 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Year_${selectedYear}_Report`);
    XLSX.writeFile(wb, `Year_${selectedYear}_Sales_Report.xlsx`);
    toast.success(`Exported to Excel for year ${selectedYear}`);
  };

  // Export to PDF for selected year
  const exportToPDF = () => {
    if (yearProducts.length === 0) {
      toast.error('No data available for the selected year');
      return;
    }
    
    const doc = new jsPDF('landscape');
    doc.text(`Sales Report for Year ${selectedYear}`, 14, 10);
    doc.autoTable({
      head: [['Product', 'Purchase Price', 'Selling Price', 'Quantity', 'Total Purchase', 'Total Revenue', 'Profit']],
      body: yearProducts.map(p => [
        p.name,
        `Rs. ${p.purchase_price?.toLocaleString() || 0}`,
        `Rs. ${p.selling_price?.toLocaleString() || 0}`,
        p.quantity || 0,
        `Rs. ${((p.purchase_price || 0) * (p.quantity || 0)).toLocaleString()}`,
        `Rs. ${((p.selling_price || 0) * (p.quantity || 0)).toLocaleString()}`,
        `Rs. ${(((p.selling_price || 0) - (p.purchase_price || 0)) * (p.quantity || 0)).toLocaleString()}`
      ]),
      startY: 20,
    });
    doc.save(`Year_${selectedYear}_Sales_Report.pdf`);
    toast.success(`Exported to PDF for year ${selectedYear}`);
  };

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
      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Today's Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {todaySales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{todaySales.items} items sold</p>
              <p className="text-xs opacity-75 mt-1">Profit: Rs. {todaySales.profit.toLocaleString()}</p>
            </div>
            <FiCalendar className="text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Week's Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {weeklySales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{weeklySales.items} items sold</p>
              <p className="text-xs opacity-75 mt-1">Profit: Rs. {weeklySales.profit.toLocaleString()}</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">This Month's Sales</p>
              <p className="text-3xl font-bold mt-2">Rs. {monthlySales.total.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">{monthlySales.items} items sold</p>
              <p className="text-xs opacity-75 mt-1">Profit: Rs. {monthlySales.profit.toLocaleString()}</p>
            </div>
            <FiDollarSign className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards periodStats={periodStats} darkMode={darkMode} />

      {/* Upcoming Payments Section */}
      <UpcomingPayments darkMode={darkMode} />

      {/* Yearly Report Section - OPEN BY DEFAULT */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setShowYearlyReport(!showYearlyReport)}
          className="w-full px-6 py-4 flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <div className="flex items-center gap-2">
            <FiBarChart2 className="text-red-500 text-xl" />
            <h3 className="text-lg font-semibold">📊 Yearly Sales Report</h3>
          </div>
          {showYearlyReport ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        
        {showYearlyReport && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            {/* Year Selector and Export Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex gap-3 items-center">
                <label className="text-sm font-medium">Select Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  {[2022, 2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <FiFileText /> Export Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                >
                  <FiDownload /> Export PDF
                </button>
              </div>
            </div>

            {/* Year Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm opacity-70">Total Sales</p>
                <p className="text-2xl font-bold text-red-500">Rs. {selectedYearData.total.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm opacity-70">Items Sold</p>
                <p className="text-2xl font-bold">{selectedYearData.items} units</p>
              </div>
              <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-sm opacity-70">Total Profit</p>
                <p className="text-2xl font-bold text-green-500">Rs. {selectedYearData.profit.toLocaleString()}</p>
              </div>
            </div>

            {/* Products Table for Selected Year */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Product Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Purchase Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Selling Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Total Purchase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Total Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Profit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {yearProducts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        No products found for year {selectedYear}
                      </td>
                    </tr>
                  ) : (
                    yearProducts.map((product) => (
                      <tr key={product.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3">Rs. {product.purchase_price?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3">Rs. {product.selling_price?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3">{product.quantity} units</td>
                        <td className="px-4 py-3">Rs. {((product.purchase_price || 0) * (product.quantity || 0)).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-red-500">Rs. {((product.selling_price || 0) * (product.quantity || 0)).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-green-500">Rs. {(((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0)).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{product.date_added ? new Date(product.date_added).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {yearProducts.length > 0 && (
                  <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-right font-bold">Total:</td>
                      <td className="px-4 py-3 font-bold">Rs. {(yearProducts.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0)).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-red-500">Rs. {selectedYearData.total.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-green-500">Rs. {selectedYearData.profit.toLocaleString()}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
};

export default FinanceOverview;