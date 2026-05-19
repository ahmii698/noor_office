// src/components/finance/ExpenseDistribution.jsx
import React, { useState } from 'react';
import { FiPieChart, FiTrendingUp, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899'];

const ExpenseDistribution = ({ categoryData = [], typeData = [], darkMode }) => {
  const [showPieCharts, setShowPieCharts] = useState(true);

  // Ensure data is array
  const safeCategoryData = Array.isArray(categoryData) ? categoryData : [];
  const safeTypeData = Array.isArray(typeData) ? typeData : [];

  const hasCategoryData = safeCategoryData.length > 0;
  const hasTypeData = safeTypeData.length > 0;

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <button
        onClick={() => setShowPieCharts(!showPieCharts)}
        className={`w-full px-6 py-4 flex justify-between items-center ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition`}
      >
        <div className="flex items-center gap-3">
          <FiPieChart className={`text-xl ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Expense Distribution</h3>
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
              </h3>
              <div className="h-80">
                {hasCategoryData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={safeCategoryData} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={false} 
                        label={(props) => {
                          const { name, percent } = props;
                          const percentage = (percent * 100).toFixed(0);
                          return `${name}: ${percentage}%`;
                        }} 
                        outerRadius={80} 
                        fill="#8884D8" 
                        dataKey="value"
                      >
                        {safeCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
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
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <FiPieChart className={`text-5xl ${darkMode ? 'text-gray-600' : 'text-gray-300'} mb-3`} />
                    <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No category data available
                    </p>
                    <p className={`text-sm text-center mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Add expenses with categories to see distribution
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Expenses by Type */}
            <div>
              <h3 className={`text-md font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <FiTrendingUp className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                Expenses by Type
              </h3>
              <div className="h-80">
                {hasTypeData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={safeTypeData} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={false} 
                        label={(props) => {
                          const { name, percent } = props;
                          const percentage = (percent * 100).toFixed(0);
                          return `${name}: ${percentage}%`;
                        }} 
                        outerRadius={80} 
                        fill="#8884D8" 
                        dataKey="value"
                      >
                        {safeTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
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
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <FiTrendingUp className={`text-5xl ${darkMode ? 'text-gray-600' : 'text-gray-300'} mb-3`} />
                    <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No type data available
                    </p>
                    <p className={`text-sm text-center mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Add expenses with types to see distribution
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDistribution;