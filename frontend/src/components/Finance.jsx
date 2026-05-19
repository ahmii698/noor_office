// src/components/Finance.jsx
import React, { useState, useEffect } from 'react';
import StatsCards from './finance/StatsCards';
import UpcomingPayments from './finance/UpcomingPayments';
import ExpensesRecord from './finance/ExpensesRecord';
import FinancialCharts from './finance/FinancialCharts';
import ExpenseDistribution from './finance/ExpenseDistribution';

const Finance = ({ products, expenses: initialExpenses, onAddExpense, onUpdateExpense, darkMode }) => {
  const [expenses, setExpenses] = useState(initialExpenses || []);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(null);
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  const inventoryStats = products.reduce((acc, product) => {
    acc.totalPurchase += product.purchasePrice * product.quantity;
    acc.totalSelling += product.sellingPrice * product.quantity;
    acc.totalProfit += (product.sellingPrice - product.purchasePrice) * product.quantity;
    return acc;
  }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });

  const getPeriodStats = (period) => {
    const now = new Date();
    let filteredExpenses = [];
    
    if (period === 'daily') {
      filteredExpenses = expenses.filter(exp => new Date(exp.date).toDateString() === now.toDateString());
    } else if (period === 'weekly') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      filteredExpenses = expenses.filter(exp => new Date(exp.date) >= weekAgo);
    } else if (period === 'monthly') {
      filteredExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === now.getMonth() && new Date(exp.date).getFullYear() === now.getFullYear());
    } else if (period === 'yearly') {
      filteredExpenses = expenses.filter(exp => new Date(exp.date).getFullYear() === now.getFullYear());
    }
    
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalRevenue = inventoryStats.totalSelling;
    const netProfit = totalRevenue - inventoryStats.totalPurchase - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return { totalExpenses, totalRevenue, netProfit, profitMargin, count: filteredExpenses.length };
  };

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

  const getCategoryBreakdown = () => {
    const categories = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Other';
      categories[category] = (categories[category] || 0) + exp.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  const getTypeBreakdown = () => {
    const types = {};
    expenses.forEach(exp => {
      types[exp.type] = (types[exp.type] || 0) + exp.amount;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  };

  const getUpcomingReminders = () => {
    const reminders = [
      { id: 1, type: 'salary', date: '2026-05-25', description: 'Employee Salary - Week 4', amount: 50000 },
      { id: 2, type: 'bill', date: '2026-05-20', description: 'Electricity Bill', amount: 8000 },
      { id: 3, type: 'bill', date: '2026-05-22', description: 'Internet Bill', amount: 3000 },
      { id: 4, type: 'rent', date: '2026-05-28', description: 'Shop Rent', amount: 25000 }
    ];
    const today = new Date();
    const next30Days = new Date(today.setDate(today.getDate() + 30));
    return reminders.filter(r => new Date(r.date) <= next30Days);
  };

  const periodStats = {
    daily: getPeriodStats('daily'),
    weekly: getPeriodStats('weekly'),
    monthly: getPeriodStats('monthly'),
    yearly: getPeriodStats('yearly')
  };

  const monthlyData = getMonthlyData(selectedYear);
  const categoryData = getCategoryBreakdown();
  const typeData = getTypeBreakdown();
  const upcomingReminders = getUpcomingReminders();

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <StatsCards periodStats={periodStats} darkMode={darkMode} />
      <UpcomingPayments upcomingReminders={upcomingReminders} darkMode={darkMode} />
      <ExpensesRecord expenses={expenses} onAddExpense={onAddExpense} onUpdateExpense={onUpdateExpense} darkMode={darkMode} />
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
      <ExpenseDistribution categoryData={categoryData} typeData={typeData} darkMode={darkMode} />
    </div>
  );
};

export default Finance;