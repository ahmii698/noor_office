// src/components/finance/EmployeeSalary.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiPlus, FiSearch, FiEye, FiEdit, FiX, 
  FiUser, FiTrash2, FiLoader,
  FiChevronLeft, FiChevronRight, FiInbox,
  FiCreditCard, FiList, FiDollarSign, FiCalendar
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './EmployeeSalary.css';

// ✅ Helper function to format date in Pakistan Time (Karachi)
const formatPakistanTime = (dateString) => {
  if (!dateString) return { date: 'N/A', time: '' };
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: '' };
    
    const options = { timeZone: 'Asia/Karachi' };
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      ...options
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...options
    });
    return { date: formattedDate, time: formattedTime };
  } catch (e) {
    return { date: 'N/A', time: '' };
  }
};

// ✅ Format currency
const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// ✅ Get day suffix (st, nd, rd, th)
const getDaySuffix = (day) => {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// ✅ Check if salary is due (based on salary_date day of month)
const isSalaryDue = (salaryDate) => {
  if (!salaryDate) return true;
  
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  const lastDayOfMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
  const effectiveSalaryDate = Math.min(salaryDate, lastDayOfMonth);
  
  return todayDay >= effectiveSalaryDate;
};

// ✅ Get formatted salary date display
const getSalaryDateDisplay = (salaryDate) => {
  if (!salaryDate) return '-';
  
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  if (salaryDate > lastDayOfMonth) {
    return `${lastDayOfMonth}${getDaySuffix(lastDayOfMonth)} (${salaryDate}${getDaySuffix(salaryDate)} adjusted)`;
  }
  
  return `${salaryDate}${getDaySuffix(salaryDate)} of every month`;
};

const EmployeeSalary = ({ darkMode }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    monthly_salary: '',
    salary_date: ''
  });
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    note: ''
  });
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees');
      if (response.data.success) {
        setEmployees(response.data.data || []);
      } else {
        toast.error(response.data.message || 'Failed to load employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ✅ Fetch single employee with fresh data
  const fetchSingleEmployee = useCallback(async (id) => {
    try {
      const response = await api.get(`/employees/${id}`);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
    }
    return null;
  }, []);

  // Filter and pagination
  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);

  // Statistics
  const statistics = {
    totalEmployees: employees.length || 0,
    totalSalary: employees.reduce((sum, e) => sum + (parseFloat(e.monthly_salary) || 0), 0),
    totalPaid: employees.reduce((sum, e) => sum + (parseFloat(e.paid_amount) || 0), 0),
    totalBalance: employees.reduce((sum, e) => sum + (parseFloat(e.balance_amount) || 0), 0),
    pending: employees.filter(e => e.status === 'Pending').length || 0,
    partial: employees.filter(e => e.status === 'Partial').length || 0,
    paid: employees.filter(e => e.status === 'Paid').length || 0,
  };

  // Add Employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!formData.name || !formData.monthly_salary || !formData.salary_date) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/employees', {
        name: formData.name,
        monthly_salary: parseFloat(formData.monthly_salary),
        salary_date: parseInt(formData.salary_date)
      });
      
      if (response.data.success) {
        toast.success('Employee added successfully!');
        await fetchEmployees();
        setIsAddModalOpen(false);
        setFormData({ name: '', monthly_salary: '', salary_date: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Make Payment - FIXED
  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (isPaying) return;
    
    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > (parseFloat(selectedEmployee.balance_amount) || 0)) {
      toast.error('Payment amount cannot exceed balance amount!');
      return;
    }

    setIsPaying(true);
    try {
      const response = await api.post('/employee-payments', {
        employee_id: selectedEmployee.id,
        amount: amount,
        note: paymentData.note || 'Salary payment'
      });
      
      if (response.data.success) {
        toast.success(`✅ Payment of Rs. ${formatCurrency(amount)} recorded successfully!`);
        
        // ✅ Refresh employees list
        await fetchEmployees();
        
        // ✅ If view modal is open, refresh selected employee data
        if (isViewModalOpen && selectedEmployee) {
          const updatedEmployee = await fetchSingleEmployee(selectedEmployee.id);
          if (updatedEmployee) {
            setSelectedEmployee(updatedEmployee);
          }
        }
        
        setIsPayModalOpen(false);
        setPaymentData({ amount: '', note: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsPaying(false);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? All payment history will be deleted.')) return;
    try {
      const response = await api.delete(`/employees/${id}`);
      if (response.data.success) {
        toast.success('Employee deleted successfully!');
        await fetchEmployees();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    }
  };

  // ✅ Reset Salary
  const handleResetSalary = async (id) => {
    if (!window.confirm('⚠️ Are you sure you want to reset this employee\'s salary for new month?\n\nThis will:\n• Set balance = monthly salary\n• Set paid = 0\n• Save current month record')) return;
    
    try {
      const response = await api.post(`/employees/${id}/reset-salary`);
      if (response.data.success) {
        toast.success('✅ Salary reset successfully! New month started.');
        await fetchEmployees();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset salary');
    }
  };

  // ✅ Delete Payment - FIXED
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      const response = await api.delete(`/employee-payments/${paymentId}`);
      if (response.data.success) {
        toast.success('Payment deleted successfully!');
        await fetchEmployees();
        
        if (selectedEmployee) {
          const updatedEmployee = await fetchSingleEmployee(selectedEmployee.id);
          if (updatedEmployee) {
            setSelectedEmployee(updatedEmployee);
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete payment');
    }
  };

  // Update Employee
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await api.put(`/employees/${selectedEmployee.id}`, {
        name: formData.name || selectedEmployee.name,
        monthly_salary: parseFloat(formData.monthly_salary) || selectedEmployee.monthly_salary,
        salary_date: parseInt(formData.salary_date) || selectedEmployee.salary_date
      });
      
      if (response.data.success) {
        toast.success('Employee updated successfully!');
        await fetchEmployees();
        setIsEditModalOpen(false);
        setFormData({ name: '', monthly_salary: '', salary_date: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      'Paid': 'employee-salary-status-badge paid',
      'Partial': 'employee-salary-status-badge partial',
      'Pending': 'employee-salary-status-badge pending'
    };
    return styles[status] || styles['Pending'];
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-4xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`employee-salary-container ${darkMode ? 'dark' : ''}`}>
      <div className={`employee-salary-card ${darkMode ? 'dark' : ''}`}>
        {/* Header */}
        <div className="employee-salary-header">
          <div className="employee-salary-header-left">
            <FiList className="employee-salary-header-icon" />
            <div>
              <h3 className="employee-salary-header-title">Employee Salaries</h3>
              <p className="employee-salary-header-subtitle">
                Total Employees: {statistics.totalEmployees} | 
                Total Balance: Rs. {formatCurrency(statistics.totalBalance)} | 
                Total Paid: Rs. {formatCurrency(statistics.totalPaid)}
                {statistics.pending > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500/30 text-white rounded-full text-xs">
                    {statistics.pending} Pending
                  </span>
                )}
                {statistics.partial > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500/30 text-white rounded-full text-xs">
                    {statistics.partial} Partial
                  </span>
                )}
                {statistics.paid > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-green-500/30 text-white rounded-full text-xs">
                    {statistics.paid} Paid
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="employee-salary-btn-add">
            <FiPlus className="employee-salary-btn-icon" /> Add Employee
          </button>
        </div>

        {/* Search */}
        <div className="employee-salary-search-wrapper">
          <div className="employee-salary-search-container">
            <FiSearch className={`employee-salary-search-icon ${darkMode ? 'dark' : ''}`} />
            <input
              type="text"
              placeholder="Search by Employee Name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`employee-salary-search-input ${darkMode ? 'dark' : ''}`}
            />
          </div>
        </div>

        {/* Table */}
        <div className="employee-salary-table-wrapper">
          <table className="employee-salary-table">
            <thead className={darkMode ? 'dark' : ''}>
              <tr>
                <th>Employee</th>
                <th className="employee-salary-text-right">Monthly Salary</th>
                <th className="employee-salary-text-right">Paid</th>
                <th className="employee-salary-text-right">Balance</th>
                <th>Salary Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="employee-salary-empty">
                    <FiInbox className="employee-salary-empty-icon" />
                    <p>No employees found</p>
                    <p className="employee-salary-empty-sub">Click "Add Employee" to create your first record</p>
                  </td>
                </tr>
              ) : (
                currentEmployees.map(employee => {
                  const isDue = isSalaryDue(employee.salary_date);
                  // ✅ FIX: Pay Now button visible ALWAYS if balance > 0
                  const canPay = employee.balance_amount > 0;
                  
                  return (
                    <tr key={employee.id} className={darkMode ? 'dark' : ''}>
                      <td className="employee-salary-name">
                        <div className="flex items-center gap-2">
                          <FiUser className="text-red-500" />
                          {employee.name}
                        </div>
                      </td>
                      <td className="employee-salary-text-right employee-salary-amount-total">
                        Rs.{formatCurrency(employee.monthly_salary)}
                      </td>
                      <td className="employee-salary-text-right employee-salary-amount-paid">
                        Rs.{formatCurrency(employee.paid_amount)}
                      </td>
                      <td className="employee-salary-text-right">
                        <span className={`employee-salary-balance ${(parseFloat(employee.balance_amount) || 0) > 0 ? 'due' : 'paid'}`}>
                          Rs.{formatCurrency(employee.balance_amount)}
                        </span>
                      </td>
                      <td>
                        {employee.salary_date ? (
                          <span className="font-medium">
                            {getSalaryDateDisplay(employee.salary_date)}
                          </span>
                        ) : '-'}
                        {isDue && employee.balance_amount > 0 && (
                          <span className="ml-1 text-xs text-red-500 animate-pulse">🔴 Due</span>
                        )}
                      </td>
                      <td>
                        <span className={getStatusBadge(employee.status)}>
                          {employee.status}
                        </span>
                      </td>
                      <td>
                        <div className="employee-salary-actions">
                          {/* ✅ View History */}
                          <button 
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsViewModalOpen(true);
                            }} 
                            className="employee-salary-btn-view" 
                            title="View History"
                          >
                            <FiEye />
                          </button>
                          
                          {/* ✅ Edit Employee */}
                          <button 
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setFormData({
                                name: employee.name,
                                monthly_salary: employee.monthly_salary,
                                salary_date: employee.salary_date || ''
                              });
                              setIsEditModalOpen(true);
                            }} 
                            className="employee-salary-btn-edit" 
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          
                          {/* ✅ Delete Employee */}
                          <button 
                            onClick={() => handleDeleteEmployee(employee.id)} 
                            className="employee-salary-btn-delete" 
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                          
                          {/* ✅ Pay Now - ALWAYS SHOW if balance > 0 */}
                          {canPay && (
                            <button 
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setPaymentData({ amount: '', note: '' });
                                setIsPayModalOpen(true);
                              }} 
                              className="employee-salary-btn-pay"
                            >
                              Pay Now
                            </button>
                          )}
                          
                          {/* ✅ Reset Button */}
                          <button 
                            onClick={() => handleResetSalary(employee.id)} 
                            className="employee-salary-btn-reset"
                            title="Reset Salary for New Month"
                          >
                            <FiCalendar /> Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="employee-salary-pagination">
          <div className="employee-salary-pagination-info">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEmployees.length)} of {filteredEmployees.length} entries
          </div>
          <div className="employee-salary-pagination-buttons">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1} 
              className="employee-salary-pagination-btn"
            >
              <FiChevronLeft />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) pageNum = i + 1;
              else if (currentPage <= 4) {
                pageNum = i + 1;
                if (i === 5) return <span key="dots1" className="employee-salary-pagination-dots">...</span>;
                if (i === 6) return <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="employee-salary-pagination-btn">{totalPages}</button>;
              } else if (currentPage >= totalPages - 3) {
                if (i === 0) return <button key={1} onClick={() => handlePageChange(1)} className="employee-salary-pagination-btn">1</button>;
                if (i === 1) return <span key="dots1" className="employee-salary-pagination-dots">...</span>;
                pageNum = totalPages - 5 + i;
              } else {
                if (i === 0) return <button key={1} onClick={() => handlePageChange(1)} className="employee-salary-pagination-btn">1</button>;
                if (i === 1) return <span key="dots1" className="employee-salary-pagination-dots">...</span>;
                if (i === 5) return <span key="dots2" className="employee-salary-pagination-dots">...</span>;
                if (i === 6) return <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="employee-salary-pagination-btn">{totalPages}</button>;
                pageNum = currentPage - 1 + (i - 2);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`employee-salary-pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages} 
              className="employee-salary-pagination-btn"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* View History Modal */}
      {isViewModalOpen && selectedEmployee && (
        <div className="employee-salary-modal-overlay">
          <div className={`employee-salary-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`employee-salary-modal-header ${darkMode ? 'dark' : ''}`}>
              <div>
                <h2 className="employee-salary-modal-title">
                  <FiEye className="employee-salary-modal-title-icon" /> Employee History
                </h2>
                <p className="employee-salary-modal-subtitle">{selectedEmployee.name}</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="employee-salary-modal-close">
                <FiX />
              </button>
            </div>
            <div className="employee-salary-modal-body">
              {/* Summary */}
              <div className="employee-salary-summary">
                <div className="employee-salary-summary-item">
                  <p className="employee-salary-summary-label">Monthly Salary</p>
                  <p className="employee-salary-summary-value total">Rs.{formatCurrency(selectedEmployee.monthly_salary)}</p>
                </div>
                <div className="employee-salary-summary-item">
                  <p className="employee-salary-summary-label">Total Paid</p>
                  <p className="employee-salary-summary-value paid">Rs.{formatCurrency(selectedEmployee.paid_amount)}</p>
                </div>
                <div className="employee-salary-summary-item">
                  <p className="employee-salary-summary-label">Balance</p>
                  <p className="employee-salary-summary-value balance">Rs.{formatCurrency(selectedEmployee.balance_amount)}</p>
                </div>
                <div className="employee-salary-summary-item">
                  <p className="employee-salary-summary-label">Status</p>
                  <p className={`employee-salary-summary-value ${selectedEmployee.status === 'Paid' ? 'paid' : selectedEmployee.status === 'Partial' ? 'balance' : 'total'}`}>
                    {selectedEmployee.status}
                  </p>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="employee-salary-history-title">
                  <FiCreditCard className="employee-salary-history-icon text-green-500" /> Payment History
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedEmployee.payments?.length || 0} payments)
                  </span>
                </h3>
                {!selectedEmployee.payments || selectedEmployee.payments.length === 0 ? (
                  <div className="employee-salary-empty-history">
                    <FiInbox className="employee-salary-empty-history-icon" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="employee-salary-history-table-wrapper">
                    <table className="employee-salary-history-table">
                      <thead className={darkMode ? 'dark' : ''}>
                        <tr>
                          <th>#</th>
                          <th>Date & Time (Karachi)</th>
                          <th className="employee-salary-text-right">Amount (Rs.)</th>
                          <th>Note</th>
                          <th>Created By</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedEmployee.payments]
                          .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
                          .map((payment, idx) => {
                            const { date, time } = formatPakistanTime(payment.payment_date);
                            return (
                              <tr key={payment.id}>
                                <td>{idx + 1}</td>
                                <td>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{date}</span>
                                    <span className="text-xs text-gray-500">{time}</span>
                                  </div>
                                </td>
                                <td className="employee-salary-text-right employee-salary-amount-paid">
                                  Rs.{formatCurrency(payment.amount)}
                                </td>
                                <td>{payment.note || '-'}</td>
                                <td>{payment.created_by || 'System'}</td>
                                <td>
                                  <button 
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Delete Payment"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot className={darkMode ? 'dark' : ''}>
                        <tr>
                          <td colSpan="2" className="employee-salary-text-right employee-salary-total-label font-bold">
                            Total Paid:
                          </td>
                          <td className="employee-salary-text-right employee-salary-total-amount font-bold">
                            Rs.{formatCurrency(selectedEmployee.paid_amount)}
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Monthly History */}
              <div className="mt-4">
                <h3 className="employee-salary-history-title">
                  <FiCalendar className="employee-salary-history-icon text-blue-500" /> Monthly History
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({selectedEmployee.monthly_records?.length || 0} months)
                  </span>
                </h3>
                
                {!selectedEmployee.monthly_records || selectedEmployee.monthly_records.length === 0 ? (
                  <div className="employee-salary-empty-history">
                    <FiInbox className="employee-salary-empty-history-icon" />
                    <p>No monthly records found</p>
                  </div>
                ) : (
                  <div className="employee-salary-history-table-wrapper">
                    <table className="employee-salary-history-table">
                      <thead className={darkMode ? 'dark' : ''}>
                        <tr>
                          <th>#</th>
                          <th>Month</th>
                          <th className="employee-salary-text-right">Salary</th>
                          <th className="employee-salary-text-right">Paid</th>
                          <th className="employee-salary-text-right">Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedEmployee.monthly_records]
                          .sort((a, b) => b.month.localeCompare(a.month))
                          .map((record, idx) => {
                            const [year, month] = record.month.split('-');
                            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
                            const monthDisplay = `${monthName} ${year}`;
                            const isCurrentMonth = record.month === new Date().toISOString().slice(0, 7);
                            
                            return (
                              <tr key={record.id}>
                                <td>{idx + 1}</td>
                                <td>
                                  <span className="font-medium">{monthDisplay}</span>
                                  {isCurrentMonth && (
                                    <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Current</span>
                                  )}
                                </td>
                                <td className="employee-salary-text-right employee-salary-amount-total">
                                  Rs.{formatCurrency(record.monthly_salary)}
                                </td>
                                <td className="employee-salary-text-right employee-salary-amount-paid">
                                  Rs.{formatCurrency(record.paid_amount)}
                                </td>
                                <td className="employee-salary-text-right">
                                  <span className={`employee-salary-balance ${record.balance_amount > 0 ? 'due' : 'paid'}`}>
                                    Rs.{formatCurrency(record.balance_amount)}
                                  </span>
                                </td>
                                <td>
                                  <span className={getStatusBadge(record.status)}>
                                    {record.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot className={darkMode ? 'dark' : ''}>
                        <tr>
                          <td colSpan="2" className="employee-salary-text-right employee-salary-total-label font-bold">
                            Totals:
                          </td>
                          <td className="employee-salary-text-right employee-salary-total-amount font-bold">
                            Rs.{formatCurrency(selectedEmployee.monthly_salary)}
                          </td>
                          <td className="employee-salary-text-right employee-salary-total-amount font-bold">
                            Rs.{formatCurrency(selectedEmployee.paid_amount)}
                          </td>
                          <td className="employee-salary-text-right employee-salary-total-amount font-bold">
                            Rs.{formatCurrency(selectedEmployee.balance_amount)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className={`employee-salary-modal-footer ${darkMode ? 'dark' : ''}`}>
              <button onClick={() => setIsViewModalOpen(false)} className="employee-salary-btn-close">
                <FiX /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="employee-salary-modal-overlay">
          <div className={`employee-salary-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`employee-salary-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="employee-salary-modal-title">
                <FiPlus className="employee-salary-modal-title-icon" /> Add Employee
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="employee-salary-modal-close">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="employee-salary-modal-body">
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Employee Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter employee name"
                  required
                />
              </div>
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Monthly Salary (Rs.) *</label>
                <input
                  type="number"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter monthly salary"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Salary Date (Day of Month) *</label>
                <input
                  type="number"
                  value={formData.salary_date}
                  onChange={(e) => setFormData({ ...formData, salary_date: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter day of month (e.g., 10 for 10th)"
                  min="1"
                  max="31"
                  required
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Salary will be due on this day every month (adjusted for short months)
                </p>
              </div>
              <div className="employee-salary-form-actions">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="employee-salary-btn-cancel">Cancel</button>
                <button type="submit" className="employee-salary-btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? <><FiLoader className="animate-spin mr-2" /> Adding...</> : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && selectedEmployee && (
        <div className="employee-salary-modal-overlay">
          <div className={`employee-salary-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`employee-salary-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="employee-salary-modal-title">
                <FiEdit className="employee-salary-modal-title-icon" /> Edit Employee
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="employee-salary-modal-close">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="employee-salary-modal-body">
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Employee Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  required
                />
              </div>
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Monthly Salary (Rs.) *</label>
                <input
                  type="number"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  min="0"
                  step="0.01"
                  required
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Current paid: Rs. {formatCurrency(selectedEmployee.paid_amount)} | 
                  Balance: Rs. {formatCurrency(selectedEmployee.balance_amount)}
                </p>
              </div>
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Salary Date (Day of Month) *</label>
                <input
                  type="number"
                  value={formData.salary_date}
                  onChange={(e) => setFormData({ ...formData, salary_date: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  min="1"
                  max="31"
                  required
                />
              </div>
              <div className="employee-salary-form-actions">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="employee-salary-btn-cancel">Cancel</button>
                <button type="submit" className="employee-salary-btn-update" disabled={isSubmitting}>
                  {isSubmitting ? <><FiLoader className="animate-spin mr-2" /> Updating...</> : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Pay Now Modal - FIXED */}
      {isPayModalOpen && selectedEmployee && (
        <div className="employee-salary-modal-overlay">
          <div className={`employee-salary-modal ${darkMode ? 'dark' : ''}`}>
            <div className={`employee-salary-modal-header ${darkMode ? 'dark' : ''}`}>
              <h2 className="employee-salary-modal-title">
                <FiDollarSign className="employee-salary-modal-title-icon" /> Make Payment
              </h2>
              <button onClick={() => setIsPayModalOpen(false)} className="employee-salary-modal-close">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleMakePayment} className="employee-salary-modal-body">
              <div className="employee-salary-payment-summary">
                <p className="employee-salary-payment-label">Employee</p>
                <p className="employee-salary-payment-vendor">{selectedEmployee.name}</p>
                <p className="employee-salary-payment-label">Monthly Salary</p>
                <p className="employee-salary-payment-balance" style={{color: '#111827'}}>Rs.{formatCurrency(selectedEmployee.monthly_salary)}</p>
                <p className="employee-salary-payment-label">Already Paid</p>
                <p className="employee-salary-payment-balance" style={{color: '#16a34a'}}>Rs.{formatCurrency(selectedEmployee.paid_amount)}</p>
                <p className="employee-salary-payment-label">Remaining Balance</p>
                <p className="employee-salary-payment-balance" style={{color: '#dc2626', fontWeight: 'bold'}}>Rs.{formatCurrency(selectedEmployee.balance_amount)}</p>
              </div>
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Enter amount to pay"
                  min="1"
                  max={selectedEmployee.balance_amount || 0}
                  step="0.01"
                  required
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Maximum: Rs. {formatCurrency(selectedEmployee.balance_amount)}
                </p>
              </div>
              <div className="employee-salary-form-group">
                <label className={`employee-salary-form-label ${darkMode ? 'dark' : ''}`}>Note (Optional)</label>
                <input
                  type="text"
                  value={paymentData.note}
                  onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                  className={`employee-salary-form-input ${darkMode ? 'dark' : ''}`}
                  placeholder="Add a note for this payment"
                />
              </div>
              <div className="employee-salary-form-actions">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="employee-salary-btn-cancel">Cancel</button>
                <button type="submit" className="employee-salary-btn-pay-submit" disabled={isPaying}>
                  {isPaying ? <><FiLoader className="animate-spin mr-2" /> Processing...</> : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalary;