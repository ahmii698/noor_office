// src/components/finance/FinancialCharts.jsx
import React, { useState } from 'react';
import { FiBarChart2, FiTrendingUp, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const FinancialCharts = ({ monthlyData, selectedYear, setSelectedYear, compareYear, setCompareYear, chartType, setChartType, darkMode }) => {
  const [showCharts, setShowCharts] = useState(true);

  const compareData = compareYear ? monthlyData.map((m, i) => ({
    month: m.month,
    current: m.expenses,
    previous: null
  })) : [];

  // Custom chart colors for theme
  const chartColors = {
    expenses: '#ef4444', // Red
    revenue: '#22c55e', // Green
    profit: '#3b82f6' // Blue
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <button
        onClick={() => setShowCharts(!showCharts)}
        className={`w-full px-6 py-4 flex justify-between items-center ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition`}
      >
        <div className="flex items-center gap-3">
          <FiBarChart2 className={`text-xl ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Financial Charts & Analytics</h3>
        </div>
        {showCharts ? <FiChevronUp className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} /> : <FiChevronDown className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />}
      </button>
      
      {showCharts && (
        <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <div className="flex gap-3">
              <button 
                onClick={() => setChartType('line')} 
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  chartType === 'line' 
                    ? 'bg-red-500 text-white' 
                    : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiTrendingUp className="text-sm" /> Line
              </button>
              <button 
                onClick={() => setChartType('bar')} 
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  chartType === 'bar' 
                    ? 'bg-red-500 text-white' 
                    : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiBarChart2 className="text-sm" /> Bar
              </button>
              <button 
                onClick={() => setChartType('area')} 
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  chartType === 'area' 
                    ? 'bg-red-500 text-white' 
                    : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiTrendingUp className="text-sm" /> Area
              </button>
              <button 
                onClick={() => setChartType('composed')} 
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  chartType === 'composed' 
                    ? 'bg-red-500 text-white' 
                    : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiBarChart2 className="text-sm" /> Composed
              </button>
            </div>
            <div className="flex gap-3">
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 focus:outline-none ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {[2022, 2023, 2024, 2025, 2026].map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <select 
                value={compareYear || ''} 
                onChange={(e) => setCompareYear(e.target.value ? parseInt(e.target.value) : null)} 
                className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 focus:outline-none ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">No Comparison</option>
                {[2022, 2023, 2024, 2025, 2026].filter(y => y !== selectedYear).map(year => <option key={year} value={year}>Compare with {year}</option>)}
              </select>
            </div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={monthlyData}>
                  <CartesianGrid stroke={darkMode ? '#374151' : '#e5e7eb'} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#ffffff' : '#000000' }} />
                  <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                  <Line type="monotone" dataKey="expenses" stroke={chartColors.expenses} name="Expenses" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke={chartColors.revenue} name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke={chartColors.profit} name="Profit" strokeWidth={2} />
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={monthlyData}>
                  <CartesianGrid stroke={darkMode ? '#374151' : '#e5e7eb'} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#ffffff' : '#000000' }} />
                  <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                  <Bar dataKey="expenses" fill={chartColors.expenses} name="Expenses" />
                  <Bar dataKey="revenue" fill={chartColors.revenue} name="Revenue" />
                  <Bar dataKey="profit" fill={chartColors.profit} name="Profit" />
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart data={monthlyData}>
                  <CartesianGrid stroke={darkMode ? '#374151' : '#e5e7eb'} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#ffffff' : '#000000' }} />
                  <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                  <Area type="monotone" dataKey="expenses" stackId="1" stroke={chartColors.expenses} fill={chartColors.expenses} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="revenue" stackId="1" stroke={chartColors.revenue} fill={chartColors.revenue} fillOpacity={0.6} />
                </AreaChart>
              ) : (
                <ComposedChart data={monthlyData}>
                  <CartesianGrid stroke={darkMode ? '#374151' : '#e5e7eb'} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#ffffff' : '#000000' }} />
                  <Legend wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }} />
                  <Bar dataKey="expenses" barSize={20} fill={chartColors.expenses} />
                  <Line type="monotone" dataKey="profit" stroke={chartColors.profit} strokeWidth={2} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialCharts;