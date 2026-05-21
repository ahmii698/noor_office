// src/components/finance/ExpenseDistribution.jsx
import React, { useState, useEffect } from 'react';
import { FiPieChart, FiTrendingUp, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899'];

const ExpenseDistribution = ({ darkMode }) => {
  const [showPieCharts, setShowPieCharts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [typeData, setTypeData] = useState([]);

  // Fetch expenses from API
  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/expenses');
      console.log('Expenses fetched:', response.data);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        processExpenseData(response.data);
      } else {
        setCategoryData([]);
        setTypeData([]);
        setError('No expense data found. Please add expenses first.');
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expense data. Please check your connection.');
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  // Process expenses into category and type breakdown
  const processExpenseData = (expensesList) => {
    // Process by Category
    const categories = {};
    expensesList.forEach(exp => {
      const category = exp.category || 'Other';
      categories[category] = (categories[category] || 0) + (exp.amount || 0);
    });
    
    let categoryChartData = Object.entries(categories).map(([name, value]) => ({ name, value }));
    categoryChartData.sort((a, b) => b.value - a.value);
    console.log('Category Data:', categoryChartData);
    setCategoryData(categoryChartData);

    // Process by Type
    const types = {};
    expensesList.forEach(exp => {
      const type = exp.type || 'Other';
      types[type] = (types[type] || 0) + (exp.amount || 0);
    });
    
    let typeChartData = Object.entries(types).map(([name, value]) => ({ name, value }));
    typeChartData.sort((a, b) => b.value - a.value);
    console.log('Type Data:', typeChartData);
    setTypeData(typeChartData);
  };

  // Load expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Custom label renderer
  const renderLabel = (props) => {
    const { name, percent } = props;
    const percentage = (percent * 100).toFixed(0);
    return `${name}: ${percentage}%`;
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading expense distribution...</p>
        </div>
      </div>
    );
  }

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
          {error ? (
            <div className="text-center py-8">
              <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'} mb-3`}>{error}</p>
              <button
                onClick={fetchExpenses}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Retry
              </button>
            </div>
          ) : categoryData.length === 0 && typeData.length === 0 ? (
            <div className="text-center py-12">
              <FiPieChart className={`text-6xl mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No expense data available</p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Add expenses from the Expenses section to see distribution charts
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expenses by Category */}
              <div>
                <h3 className={`text-md font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiPieChart className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
                  Expenses by Category
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} font-normal ml-2`}>
                    ({categoryData.length} categories)
                  </span>
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryData} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={true} 
                        label={renderLabel}
                        outerRadius={100} 
                        innerRadius={40}
                        fill="#8884D8" 
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={darkMode ? '#1f2937' : '#ffffff'} strokeWidth={2} />
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
                      />
                      <Legend 
                        wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
                        formatter={(value) => <span style={{ color: darkMode ? '#ffffff' : '#333333' }}>{value}</span>}
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
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} font-normal ml-2`}>
                    ({typeData.length} types)
                  </span>
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={typeData} 
                        cx="50%" 
                        cy="50%" 
                        labelLine={true} 
                        label={renderLabel}
                        outerRadius={100} 
                        innerRadius={40}
                        fill="#8884D8" 
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={darkMode ? '#1f2937' : '#ffffff'} strokeWidth={2} />
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
                      />
                      <Legend 
                        wrapperStyle={{ color: darkMode ? '#ffffff' : '#000000' }}
                        formatter={(value) => <span style={{ color: darkMode ? '#ffffff' : '#333333' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseDistribution;