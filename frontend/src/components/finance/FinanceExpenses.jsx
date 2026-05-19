// src/components/finance/FinanceExpenses.jsx
import React from 'react';
import ExpensesRecord from './ExpensesRecord';

const FinanceExpenses = ({ expenses, onAddExpense, onUpdateExpense, darkMode }) => {
  return (
    <div className="space-y-6">
      <ExpensesRecord 
        expenses={expenses} 
        onAddExpense={onAddExpense} 
        onUpdateExpense={onUpdateExpense} 
        darkMode={darkMode} 
      />
    </div>
  );
};

export default FinanceExpenses;