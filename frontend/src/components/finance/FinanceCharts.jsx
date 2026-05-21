// src/components/finance/FinanceCharts.jsx
import React, { useState, useEffect } from 'react';
import FinancialCharts from './FinancialCharts';
import { FiLoader } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FinanceCharts = ({ darkMode }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(null);
  const [chartType, setChartType] = useState('line');
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
  const [monthlyData, setMonthlyData] = useState([]);

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
      acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
      acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
      acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
    
    setInventoryStats(stats);
    return stats;
  };

  // Get monthly data for charts
  const calculateMonthlyData = (year, productsList, expensesList, stats) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(year, i, 1);
      
      // Filter expenses for this month
      const monthExpenses = expensesList.filter(exp => {
        if (!exp.expense_date) return false;
        const expDate = new Date(exp.expense_date);
        return expDate.getMonth() === i && expDate.getFullYear() === year;
      });
      
      const totalExpenses = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
      // Filter products sold in this month (based on date_added)
      const monthProducts = productsList.filter(p => {
        if (!p.date_added) return false;
        const productDate = new Date(p.date_added);
        return productDate.getMonth() === i && productDate.getFullYear() === year;
      });
      
      const monthRevenue = monthProducts.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.quantity || 0)), 0);
      const monthPurchase = monthProducts.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0);
      const monthProfit = monthRevenue - monthPurchase - totalExpenses;
      
      months.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        expenses: totalExpenses,
        revenue: monthRevenue,
        profit: monthProfit,
        purchase: monthPurchase
      });
    }
    return months;
  };

  // Load all data and calculate monthly data
  const loadChartData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const productsList = await fetchProducts();
      const expensesList = await fetchExpenses();
      
      const stats = calculateInventoryStats(productsList);
      const monthlyChartData = calculateMonthlyData(selectedYear, productsList, expensesList, stats);
      
      setMonthlyData(monthlyChartData);
      
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data. Please try again.');
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  // Reload data when selected year changes
  useEffect(() => {
    loadChartData();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinancialCharts 
        monthlyData={monthlyData}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        compareYear={compareYear}
        setCompareYear={setCompareYear}
        chartType={chartType}
        setChartType={setChartType}
        darkMode={darkMode}
      />
      
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">⚠️ {error}</p>
          <button 
            onClick={loadChartData}
            className="mt-2 px-4 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
          >
            Retry
          </button>
        </div>
      )}
      
      {!loading && !error && monthlyData.length === 0 && (
        <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No data available for year {selectedYear}. Please add products and expenses first.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinanceCharts;