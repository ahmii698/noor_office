// src/components/finance/FinanceOverview.jsx
import React from 'react';
import StatsCards from './StatsCards';
import UpcomingPayments from './UpcomingPayments';

const FinanceOverview = ({ products, expenses, darkMode }) => {
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
    } else {
      filteredExpenses = expenses.filter(exp => new Date(exp.date).getFullYear() === now.getFullYear());
    }
    
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalRevenue = inventoryStats.totalSelling;
    const netProfit = totalRevenue - inventoryStats.totalPurchase - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return { totalExpenses, totalRevenue, netProfit, profitMargin, count: filteredExpenses.length };
  };

  const periodStats = {
    daily: getPeriodStats('daily'),
    weekly: getPeriodStats('weekly'),
    monthly: getPeriodStats('monthly'),
    yearly: getPeriodStats('yearly')
  };

  const reminders = [
    { id: 1, type: 'salary', date: '2026-05-25', description: 'Employee Salary - Week 4', amount: 50000 },
    { id: 2, type: 'bill', date: '2026-05-20', description: 'Electricity Bill', amount: 8000 },
    { id: 3, type: 'bill', date: '2026-05-22', description: 'Internet Bill', amount: 3000 },
    { id: 4, type: 'rent', date: '2026-05-28', description: 'Shop Rent', amount: 25000 }
  ];

  const getUpcomingReminders = () => {
    const today = new Date();
    const next30Days = new Date(today.setDate(today.getDate() + 30));
    return reminders.filter(r => new Date(r.date) <= next30Days);
  };

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <StatsCards periodStats={periodStats} darkMode={darkMode} />
      <UpcomingPayments upcomingReminders={getUpcomingReminders()} darkMode={darkMode} />
    </div>
  );
};

export default FinanceOverview;