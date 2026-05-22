// src/components/finance/FinanceCharts.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  
  // State for dynamic data from API
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalPurchase: 0,
    totalSelling: 0,
    totalProfit: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyOverview, setYearlyOverview] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    profitMargin: 0
  });

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
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
  }, []);

  // Fetch expenses from API
  const fetchExpenses = useCallback(async () => {
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
  }, []);

  // Fetch invoices from API for sales data
  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.get('/invoices');
      if (response.data && Array.isArray(response.data)) {
        setInvoices(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching invoices:', err);
      return [];
    }
  }, []);

  // Calculate inventory stats from real product data
  const calculateInventoryStats = useCallback((productsList) => {
    const stats = productsList.reduce((acc, product) => {
      acc.totalPurchase += (parseFloat(product.purchase_price) || 0) * (parseInt(product.quantity) || 0);
      acc.totalSelling += (parseFloat(product.selling_price) || 0) * (parseInt(product.quantity) || 0);
      acc.totalProfit += ((parseFloat(product.selling_price) || 0) - (parseFloat(product.purchase_price) || 0)) * (parseInt(product.quantity) || 0);
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
    
    setInventoryStats(stats);
    return stats;
  }, []);

  // Get monthly data from actual invoices and expenses
  const calculateMonthlyData = useCallback((year, productsList, expensesList, invoicesList) => {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create a map for quick product lookup
    const productsMap = new Map();
    productsList.forEach(p => {
      productsMap.set(p.name, p);
    });
    
    for (let i = 0; i < 12; i++) {
      // Filter invoices for this month (sales data)
      const monthInvoices = invoicesList.filter(inv => {
        if (!inv.invoice_date) return false;
        const invDate = new Date(inv.invoice_date);
        return invDate.getMonth() === i && invDate.getFullYear() === year;
      });
      
      // Calculate revenue and profit from invoices
      let monthRevenue = 0;
      let monthProfit = 0;
      let monthItemsSold = 0;
      
      monthInvoices.forEach(inv => {
        const invTotal = parseFloat(inv.total_amount) || 0;
        monthRevenue += invTotal;
        
        // Calculate profit from items
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(item => {
            const itemQty = parseInt(item.quantity) || 0;
            const itemPrice = parseFloat(item.price) || 0;
            monthItemsSold += itemQty;
            
            const product = productsMap.get(item.service_name);
            if (product) {
              const purchasePrice = parseFloat(product.purchase_price) || 0;
              monthProfit += (itemPrice - purchasePrice) * itemQty;
            } else {
              // Service item (no purchase price)
              monthProfit += itemPrice * itemQty;
            }
          });
        }
      });
      
      // Filter expenses for this month
      const monthExpenses = expensesList.filter(exp => {
        if (!exp.expense_date) return false;
        const expDate = new Date(exp.expense_date);
        return expDate.getMonth() === i && expDate.getFullYear() === year;
      });
      
      const totalExpenses = monthExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      
      // Net profit after expenses
      const netProfit = monthProfit - totalExpenses;
      
      // Calculate purchase cost (products added this month)
      const monthProducts = productsList.filter(p => {
        if (!p.date_added) return false;
        const productDate = new Date(p.date_added);
        return productDate.getMonth() === i && productDate.getFullYear() === year;
      });
      
      const monthPurchase = monthProducts.reduce((sum, p) => sum + ((parseFloat(p.purchase_price) || 0) * (parseInt(p.quantity) || 0)), 0);
      
      months.push({
        month: monthNames[i],
        monthIndex: i,
        expenses: totalExpenses,
        revenue: monthRevenue,
        profit: monthProfit,
        netProfit: netProfit,
        purchase: monthPurchase,
        itemsSold: monthItemsSold,
        invoiceCount: monthInvoices.length
      });
    }
    
    return months;
  }, []);

  // Calculate yearly overview from monthly data
  const calculateYearlyOverview = useCallback((monthlyData) => {
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
    const totalProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0);
    const totalNetProfit = monthlyData.reduce((sum, m) => sum + m.netProfit, 0);
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    
    setYearlyOverview({
      totalRevenue,
      totalExpenses,
      totalProfit,
      totalNetProfit,
      profitMargin
    });
  }, []);

  // Load all data and calculate monthly data
  const loadChartData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [productsList, expensesList, invoicesList] = await Promise.all([
        fetchProducts(),
        fetchExpenses(),
        fetchInvoices()
      ]);
      
      // Calculate inventory stats from real product data
      calculateInventoryStats(productsList);
      
      // Calculate monthly data from real invoices and expenses
      const monthlyChartData = calculateMonthlyData(selectedYear, productsList, expensesList, invoicesList);
      setMonthlyData(monthlyChartData);
      
      // Calculate yearly overview
      calculateYearlyOverview(monthlyChartData);
      
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data. Please try again.');
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, fetchProducts, fetchExpenses, fetchInvoices, calculateInventoryStats, calculateMonthlyData, calculateYearlyOverview]);

  // Reload data when selected year changes
  useEffect(() => {
    loadChartData();
  }, [selectedYear, loadChartData]);

  // Get available years for comparison from invoices and expenses
  const availableYears = useMemo(() => {
    const years = new Set();
    
    invoices.forEach(inv => {
      if (inv.invoice_date) {
        years.add(new Date(inv.invoice_date).getFullYear());
      }
    });
    
    expenses.forEach(exp => {
      if (exp.expense_date) {
        years.add(new Date(exp.expense_date).getFullYear());
      }
    });
    
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, expenses]);

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
      {/* Yearly Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-500">Rs. {yearlyOverview.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Year {selectedYear}</p>
        </div>
        
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">Rs. {yearlyOverview.totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Year {selectedYear}</p>
        </div>
        
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className="text-sm text-gray-500">Gross Profit</p>
          <p className="text-2xl font-bold text-blue-500">Rs. {yearlyOverview.totalProfit.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Before expenses</p>
        </div>
        
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className="text-sm text-gray-500">Net Profit Margin</p>
          <p className="text-2xl font-bold text-purple-500">{yearlyOverview.profitMargin.toFixed(1)}%</p>
          <p className="text-xs text-gray-400">After expenses</p>
        </div>
      </div>

      <FinancialCharts 
        monthlyData={monthlyData}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        compareYear={compareYear}
        setCompareYear={setCompareYear}
        chartType={chartType}
        setChartType={setChartType}
        darkMode={darkMode}
        availableYears={availableYears}
        yearlyOverview={yearlyOverview}
        inventoryStats={inventoryStats}
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
      
      {!loading && !error && monthlyData.every(m => m.revenue === 0 && m.expenses === 0) && (
        <div className="p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No data available for year {selectedYear}. Please add invoices/sales and expenses first.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinanceCharts;