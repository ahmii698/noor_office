// src/components/BatteryCharts.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiCalendar, FiBattery, FiDollarSign, FiPackage, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';

// ✅ CORRECT Karachi Timezone Helper Functions - NO MANUAL OFFSET
const getKarachiDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const karachiStr = date.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(karachiStr);
};

const getTodayKarachi = () => {
  const karachiStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(karachiStr);
};

// ✅ Get date parts in Karachi timezone
const getKarachiDateString = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
};

const getTodayKarachiStr = () => {
  return new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
};

const getWeekStartKarachi = () => {
  const today = getTodayKarachi();
  const day = today.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getMonthStartKarachi = () => {
  const today = getTodayKarachi();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getYearStartKarachi = () => {
  const today = getTodayKarachi();
  const start = new Date(today.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

// ✅ Format date in Karachi timezone
const formatDateKarachi = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi'
  });
};

const BatteryCharts = ({ darkMode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(getTodayKarachi().getFullYear());
  const [timeFilter, setTimeFilter] = useState('year');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [chartData, setChartData] = useState({
    monthlySales: [],
    topBatteries: [],
    dailyTrend: []
  });

  // ✅ Battery filter
  const isBatteryItem = (item) => {
    if (!item) return false;
    return item.service_category === 'Battery' || 
           item.service_name?.toLowerCase().includes('battery');
  };

  const getBatteryItems = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item => isBatteryItem(item));
  };

  // ✅ Get date range for custom filter - WITH KARACHI TIMEZONE
  const getDateRange = (filter, customDateValue = null) => {
    const now = getTodayKarachi();
    const start = new Date(now);
    
    if (filter === 'custom' && customDateValue) {
      const date = new Date(customDateValue);
      start.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    
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

  // ✅ Filter invoices by date - FIXED: Compare using normalized dates
  const filterInvoicesByDate = (invoices, filter, customDateValue = null) => {
    if (filter === 'all' || !invoices || invoices.length === 0) return invoices;
    const range = getDateRange(filter, customDateValue);
    if (!range) return invoices;
    
    return invoices.filter(inv => {
      if (!inv.invoice_date) return false;
      const invDate = getKarachiDate(inv.invoice_date);
      if (!invDate) return false;
      return invDate >= range.start && invDate <= range.end;
    });
  };

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [invoicesRes] = await Promise.all([
        api.get('/invoices')
      ]);

      // ✅ Invoices ko properly handle karo
      let invoices = [];
      if (Array.isArray(invoicesRes.data)) {
        invoices = invoicesRes.data;
      } else if (invoicesRes.data?.data && Array.isArray(invoicesRes.data.data)) {
        invoices = invoicesRes.data.data;
      } else if (invoicesRes.data?.success && Array.isArray(invoicesRes.data.data)) {
        invoices = invoicesRes.data.data;
      } else {
        invoices = [];
      }

      // ✅ Apply date filter with Karachi timezone
      let filteredInvoices = invoices;
      if (timeFilter !== 'year') {
        filteredInvoices = filterInvoicesByDate(invoices, timeFilter, customDate || null);
      }

      // Filter battery invoices
      const batteryInvoices = filteredInvoices.filter(inv => {
        if (!inv.items) return false;
        return inv.items.some(item => isBatteryItem(item));
      });

      // Monthly sales data (for selected year)
      const monthlyData = {};
      const batteryCount = {};
      const dailyData = {};

      batteryInvoices.forEach(inv => {
        if (!inv.invoice_date) return;
        
        // ✅ Convert to Karachi timezone
        const date = getKarachiDate(inv.invoice_date);
        if (!date) return;
        
        const year = date.getFullYear();
        
        // For year filter, only show selected year
        if (timeFilter === 'year' && year !== selectedYear) return;
        
        const month = date.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        // ✅ FIXED: Use proper Karachi date string for day key
        const dayKey = date.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
        
        const batteryItems = getBatteryItems(inv.items);
        if (batteryItems.length === 0) return;

        let invTotal = 0;
        let invCount = 0;

        batteryItems.forEach(item => {
          const qty = parseInt(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          invTotal += price * qty;
          invCount += qty;
          
          const name = item.service_name;
          if (!batteryCount[name]) batteryCount[name] = 0;
          batteryCount[name] += qty;
        });

        if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
        monthlyData[monthKey] += invTotal;

        if (!dailyData[dayKey]) dailyData[dayKey] = 0;
        dailyData[dayKey] += invTotal;
      });

      // Convert to arrays
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySales = monthNames.map((name, index) => {
        const key = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
        return {
          month: name,
          sales: monthlyData[key] || 0
        };
      });

      // Top batteries
      const topBatteries = Object.entries(batteryCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // ✅ Daily trend (last 30 days) - sorted by Karachi timezone
      const sortedDays = Object.keys(dailyData)
        .sort((a, b) => new Date(a) - new Date(b))
        .slice(-30);
      
      const dailyTrend = sortedDays.map(day => ({
        date: day,
        sales: dailyData[day]
      }));

      setChartData({
        monthlySales,
        topBatteries,
        dailyTrend
      });

    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to load chart data');
      toast.error('Failed to load charts');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, timeFilter, customDate]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // ✅ Simple bar chart component - FIXED: pixel-based height instead of %
  // (percentage height silently collapses because the flex column parent
  // has no explicit height, so bars must be sized in px against a known
  // pixel budget derived from the h-64 container instead)
  const BarChart = ({ data, label, color = '#ef4444', maxValue = null }) => {
    if (!data || data.length === 0) {
      return <div className="text-center py-8 text-gray-400">No data available</div>;
    }

    const max = maxValue || Math.max(...data.map(d => d.value || d.sales || 0), 1);
    const MAX_BAR_PX = 180; // usable pixel height for bars inside the 256px (h-64) container

    return (
      <div className="w-full">
        <div className="flex items-end h-64 gap-1">
          {data.map((item, index) => {
            const value = item.value || item.sales || 0;
            const barHeightPx = value > 0 ? Math.max((value / max) * MAX_BAR_PX, 4) : 0;
            const label_text = item.label || item.month || item.name || item.date || '';

            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-xs font-medium mb-1 text-green-500">
                  Rs. {value.toLocaleString()}
                </div>
                <div
                  className="w-6 md:w-8 max-w-full rounded-t transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${barHeightPx}px`,
                    backgroundColor: color
                  }}
                />
                <div className="text-xs mt-1 truncate w-full text-center">
                  {label_text}
                </div>
              </div>
            );
          })}
        </div>
        {label && <p className="text-center text-sm mt-2 opacity-70">{label}</p>}
      </div>
    );
  };

  // ✅ Horizontal bar chart for top batteries
  const HorizontalBarChart = ({ data, color = '#3b82f6' }) => {
    if (!data || data.length === 0) {
      return <div className="text-center py-8 text-gray-400">No data available</div>;
    }

    const max = Math.max(...data.map(d => d.count || 0), 1);

    return (
      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = (item.count / max) * 100;
          return (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm w-32 truncate text-right">{item.name}</span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 text-xs text-white font-medium"
                  style={{ 
                    width: `${Math.max(percentage, 5)}%`, 
                    backgroundColor: color,
                    minWidth: '20px'
                  }}
                >
                  {item.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ✅ Handle custom date change
  const handleCustomDateChange = (e) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      setTimeFilter('custom');
      setShowCustomDate(true);
    }
  };

  // ✅ Toggle custom date picker
  const toggleCustomDate = () => {
    setShowCustomDate(!showCustomDate);
  };

  // ✅ Clear custom date
  const clearCustomDate = () => {
    setCustomDate('');
    setTimeFilter('year');
    setShowCustomDate(false);
  };

  // ✅ Get filter label
  const getFilterLabel = () => {
    const labels = {
      year: `Year ${selectedYear}`,
      today: 'Today (Karachi Time)',
      week: 'This Week',
      month: 'This Month',
      custom: customDate ? `Custom: ${new Date(customDate).toLocaleDateString()}` : 'Custom Date'
    };
    return labels[timeFilter] || 'Year';
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading charts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header with Filters */}
      <div className={`flex flex-wrap justify-between items-center p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FiBarChart2 className="text-red-500 text-2xl" />
          <h2 className="text-xl font-bold">Battery Sales Charts</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {getFilterLabel()}
          </span>
          <span className="text-xs text-green-500">(Karachi Time)</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Buttons */}
          <button
            onClick={() => { setTimeFilter('year'); setShowCustomDate(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              timeFilter === 'year' 
                ? 'bg-red-500 text-white shadow-md' 
                : darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Year
          </button>
          <button
            onClick={() => { setTimeFilter('today'); setShowCustomDate(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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
            onClick={() => { setTimeFilter('week'); setShowCustomDate(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              timeFilter === 'week' 
                ? 'bg-red-500 text-white shadow-md' 
                : darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => { setTimeFilter('month'); setShowCustomDate(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              timeFilter === 'month' 
                ? 'bg-red-500 text-white shadow-md' 
                : darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          
          {/* Custom Date Button */}
          <button
            onClick={toggleCustomDate}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              timeFilter === 'custom' 
                ? 'bg-red-500 text-white shadow-md' 
                : darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Custom
          </button>

          {/* Year Selector - only show when year filter */}
          {timeFilter === 'year' && (
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={`px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-red-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}

          {/* Custom Date Input */}
          {showCustomDate && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={handleCustomDateChange}
                className={`px-3 py-1.5 rounded-lg text-sm border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
              />
              {customDate && (
                <button
                  onClick={clearCustomDate}
                  className="text-red-500 text-sm hover:text-red-600"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Sales Chart */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiTrendingUp className="text-blue-500" /> Monthly Battery Sales - {timeFilter === 'year' ? selectedYear : getFilterLabel()}
          <span className="text-xs text-green-500 font-normal">(Karachi Time)</span>
        </h3>
        <BarChart 
          data={chartData.monthlySales}
          color="#3b82f6"
          label="Monthly Sales (Rs.)"
        />
      </div>

      {/* Top Batteries & Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Batteries */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiPieChart className="text-green-500" /> Top Selling Batteries
            <span className={`text-xs font-normal ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ({chartData.topBatteries.reduce((sum, b) => sum + b.count, 0)} total)
            </span>
          </h3>
          {chartData.topBatteries.length > 0 ? (
            <HorizontalBarChart data={chartData.topBatteries} color="#22c55e" />
          ) : (
            <div className="text-center py-8 text-gray-400">No battery sales data</div>
          )}
        </div>

        {/* Daily Trend */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiBarChart2 className="text-purple-500" /> Daily Sales Trend (Last 30 Days)
            <span className="text-xs text-green-500 font-normal">(Karachi Time)</span>
          </h3>
          {chartData.dailyTrend.length > 0 ? (
            <BarChart 
              data={chartData.dailyTrend}
              color="#8b5cf6"
              label="Daily Sales (Rs.)"
            />
          ) : (
            <div className="text-center py-8 text-gray-400">No daily data available</div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiBattery className="text-red-500" /> Battery Sales Summary
          <span className={`text-xs font-normal ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ({getFilterLabel()})
          </span>
          <span className="text-xs text-green-500 font-normal">(Karachi Time)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} text-center`}>
            <p className="text-sm opacity-70">Total Batteries</p>
            <p className="text-2xl font-bold text-blue-500">
              {chartData.topBatteries.reduce((sum, b) => sum + b.count, 0)}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} text-center`}>
            <p className="text-sm opacity-70">Best Month</p>
            <p className="text-2xl font-bold text-green-500">
              {chartData.monthlySales.length > 0 ? 
                (() => {
                  const max = Math.max(...chartData.monthlySales.map(m => m.sales));
                  const best = chartData.monthlySales.find(m => m.sales === max);
                  return best && best.sales > 0 ? `${best.month} (Rs. ${best.sales.toLocaleString()})` : '-';
                })()
                : '-'
              }
            </p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} text-center`}>
            <p className="text-sm opacity-70">Total Revenue</p>
            <p className="text-2xl font-bold text-purple-500">
              Rs. {chartData.monthlySales.reduce((sum, m) => sum + m.sales, 0).toLocaleString()}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} text-center`}>
            <p className="text-sm opacity-70">Top Battery</p>
            <p className="text-2xl font-bold text-orange-500 truncate">
              {chartData.topBatteries.length > 0 ? chartData.topBatteries[0].name : '-'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
};

export default BatteryCharts;