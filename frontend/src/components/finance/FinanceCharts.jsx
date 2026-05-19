// src/components/finance/FinanceCharts.jsx
import React, { useState, useEffect } from 'react';
import FinancialCharts from './FinancialCharts';

const FinanceCharts = ({ products, expenses, darkMode }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(null);
  const [chartType, setChartType] = useState('line');

  const inventoryStats = products.reduce((acc, product) => {
    acc.totalPurchase += product.purchasePrice * product.quantity;
    acc.totalSelling += product.sellingPrice * product.quantity;
    acc.totalProfit += (product.sellingPrice - product.purchasePrice) * product.quantity;
    return acc;
  }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });

  const getMonthlyData = (year) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(year, i, 1);
      const monthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === i && expDate.getFullYear() === year;
      });
      const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const monthRevenue = inventoryStats.totalSelling / 12;
      const monthPurchase = inventoryStats.totalPurchase / 12;
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

  const monthlyData = getMonthlyData(selectedYear);

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
    </div>
  );
};

export default FinanceCharts;