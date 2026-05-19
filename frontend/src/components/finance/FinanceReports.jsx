// src/components/finance/ExpenseDistribution.jsx
import React, { useState } from 'react';
import { FiPieChart, FiTrendingUp, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899'];

// Demo/Fake Data for testing
const demoCategoryData = [
  { name: 'Office', value: 25000 },
  { name: 'Staff', value: 50000 },
  { name: 'Infrastructure', value: 15000 },
  { name: 'Marketing', value: 10000 },
  { name: 'Supplies', value: 8000 },
  { name: 'Travel', value: 5000 },
  { name: 'Software', value: 3000 },
  { name: 'Other', value: 4000 }
];

const demoTypeData = [
  { name: 'Operational', value: 30000 },
  { name: 'Salary', value: 50000 },
  { name: 'Rent', value: 25000 },
  { name: 'Utilities', value: 8000 },
  { name: 'Marketing', value: 10000 },
  { name: 'Maintenance', value: 5000 },
  { name: 'Tax', value: 2000 },
  { name: 'Other', value: 3000 }
];

const ExpenseDistribution = ({ categoryData = [], typeData = [], darkMode, showDemo = true }) => {
  const [showPieCharts, setShowPieCharts] = useState(true);

  // Use demo data if no real data and showDemo is true
  let safeCategoryData = Array.isArray(categoryData) && categoryData.length > 0 ? categoryData : [];
  let safeTypeData = Array.isArray(typeData) && typeData.length > 0 ? typeData : [];

  // If no real data, use demo data
  if (safeCategoryData.length === 0 && showDemo) {
    safeCategoryData = demoCategoryData;
  }
  if (safeTypeData.length === 0 && showDemo) {
    safeTypeData = demoTypeData;
  }

  const hasCategoryData = safeCategoryData.length > 0;
  const hasTypeData = safeTypeData.length > 0;

  // Custom label renderer with dark mode support
  const renderLabel = (props) => {
    const { name, percent } = props;
    const percentage = (percent * 100).toFixed(0);
    return `${name}: ${percentage}%`;
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <button
        onClick={() => setShowPieCharts(!showPieCharts)}
        className={`w-full px-6 py-4 flex justify-between items-center ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition`}
      >
        <div className="flex items-center gap-3">
          <FiPieChart className={`text-xl ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
          <div className="text-left">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Expense Distribution</h3>
            {!hasCategoryData && showDemo && (
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                Showing demo data (Add real expenses to see your data)
              </p>
            )}
          </div>
        </div>
        {showPieCharts ? (
          <FiChevronUp className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        ) : (
          <FiChevronDown className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        )}
      </button>
      
      {showPieCharts && (
        <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expenses by Category */}
            <div>
              <h3 className={`text-md font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiPieChart className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                Expenses by Category
                {!hasCategoryData && showDemo && (
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} font-normal ml-2`}>
                    (Demo)
                  </span>
                )}
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={safeCategoryData} 
                      cx="50%" 
                      cy="50%" 
                      labelLine={false} 
                      label={renderLabel}
                      outerRadius={80} 
                      fill="#8884D8" 
                      dataKey="value"
                    >
                      {safeCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `Rs. ${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff', 
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '8px',
                        color: darkMode ? '#ffffff' : '#000000'
                      }} 
                      labelStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
                      itemStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Expenses by Type */}
            <div>
              <h3 className={`text-md font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiTrendingUp className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                Expenses by Type
                {!hasTypeData && showDemo && (
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} font-normal ml-2`}>
                    (Demo)
                  </span>
                )}
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={safeTypeData} 
                      cx="50%" 
                      cy="50%" 
                      labelLine={false} 
                      label={renderLabel}
                      outerRadius={80} 
                      fill="#8884D8" 
                      dataKey="value"
                    >
                      {safeTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `Rs. ${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff', 
                        borderColor: darkMode ? '#374151' : '#e5e7eb',
                        borderRadius: '8px',
                        color: darkMode ? '#ffffff' : '#000000'
                      }} 
                      labelStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
                      itemStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDistribution;