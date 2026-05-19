// src/components/finance/FinanceReminders.jsx
import React from 'react';
import UpcomingPayments from './UpcomingPayments';

const FinanceReminders = ({ darkMode }) => {
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
    <div className="space-y-6">
      <UpcomingPayments upcomingReminders={getUpcomingReminders()} darkMode={darkMode} />
    </div>
  );
};

export default FinanceReminders;