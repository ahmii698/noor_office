// src/components/finance/StatsCards.jsx
import React from 'react';
import { FiDollarSign, FiCalendar, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';

const StatsCards = ({ periodStats, darkMode }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90">Today's Expenses</p>
            <p className="text-3xl font-bold mt-2">Rs. {periodStats.daily.totalExpenses.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">{periodStats.daily.count} transactions</p>
          </div>
          <FiDollarSign className="text-3xl opacity-50" />
        </div>
      </div>
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90">This Week</p>
            <p className="text-3xl font-bold mt-2">Rs. {periodStats.weekly.totalExpenses.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">Weekly expenses</p>
          </div>
          <FiCalendar className="text-3xl opacity-50" />
        </div>
      </div>
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90">This Month</p>
            <p className="text-3xl font-bold mt-2">Rs. {periodStats.monthly.totalExpenses.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">Monthly expenses</p>
          </div>
          <FiTrendingUp className="text-3xl opacity-50" />
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90">Net Profit (Monthly)</p>
            <p className="text-3xl font-bold mt-2">Rs. {periodStats.monthly.netProfit.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">Margin: {periodStats.monthly.profitMargin.toFixed(1)}%</p>
          </div>
          <FiBarChart2 className="text-3xl opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default StatsCards;