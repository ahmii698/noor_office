// src/components/Records.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiFileText, FiDownload, FiEye, FiPrinter, FiX, FiUser, 
  FiPhone, FiTool, FiPackage, FiCalendar, FiDollarSign, 
  FiCheckCircle, FiAlertCircle, FiInbox, FiList, FiClock,
  FiSearch, FiChevronLeft, FiChevronRight, FiLoader,
  FiFilter, FiEdit2, FiSave, FiGift, FiPercent
} from 'react-icons/fi';
import api from '../services/api';

import logo from '/logo.jpg';

// ✅ Helper: Format date in Pakistan Time (UTC+5)
const formatPakistanDateTime = (dateString) => {
  if (!dateString) return { date: 'N/A', time: '' };
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: '' };
    
    // ✅ Format date in Pakistan time
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
    
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
    
    return { date: formattedDate, time: formattedTime };
  } catch (e) {
    console.error('Date parse error:', e);
    return { date: 'N/A', time: '' };
  }
};

// Helper functions for date filtering
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getStartOfWeek = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getStartOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfYear = () => {
  const date = new Date();
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ✅ Helper: Round to 2 decimals - ONLY FOR DISPLAY/STORAGE
const roundToTwo = (num) => {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};

const Records = ({ darkMode }) => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editFormData, setEditFormData] = useState({
    discountType: 'fixed',
    discountValue: '',
    discountNote: '',
    additionalPayment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchInvoices = useCallback(async () => {
    const abortController = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/invoices', { signal: abortController.signal });
      
      if (response.data && Array.isArray(response.data)) {
        const transformedInvoices = response.data.map(inv => ({
          id: inv.id,
          invoiceNo: inv.invoice_no,
          date: inv.invoice_date,
          subtotal: inv.subtotal || inv.total_amount || 0,
          discount: inv.discount || 0,
          discountNote: inv.discount_note || '',
          total: inv.total_amount,
          paidAmount: inv.paid_amount,
          remainingAmount: inv.remaining_amount,
          paymentMethod: inv.payment_method,
          status: inv.status,
          customer: {
            name: inv.customer_name,
            phone: inv.customer_phone,
            carNumber: inv.customer_car_number,
            carModel: inv.customer_car_model
          },
          createdBy: inv.created_by,
          creatorName: inv.creator_name || 'System',
          creatorRole: inv.creator_role || 'system',
          items: inv.items?.map(item => ({
            id: item.id,
            name: item.service_name,
            category: item.service_category,
            price: item.price,
            quantity: item.quantity
          })) || []
        }));
        setInvoices(transformedInvoices);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching invoices:', err);
        setError('Failed to load invoices. Please check your connection.');
        toast.error('Failed to load invoices');
      }
    } finally {
      setLoading(false);
    }
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    const cleanup = fetchInvoices();
    return () => {
      if (cleanup && typeof cleanup === 'function') cleanup();
    };
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = getToday();
          break;
        case 'week':
          startDate = getStartOfWeek();
          break;
        case 'month':
          startDate = getStartOfMonth();
          break;
        case 'year':
          startDate = getStartOfYear();
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filtered = filtered.filter(inv => {
          const invDate = new Date(inv.date);
          return invDate >= startDate && invDate <= now;
        });
      }
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.customer?.name || '').toLowerCase().includes(term) ||
        (inv.customer?.phone || '').toLowerCase().includes(term) ||
        (inv.customer?.carNumber || '').toLowerCase().includes(term) ||
        inv.invoiceNo.toLowerCase().includes(term) ||
        (inv.creatorName || '').toLowerCase().includes(term)
      );
    }
    
    if (filterStatus === 'paid') {
      filtered = filtered.filter(inv => inv.status === 'Paid');
    } else if (filterStatus === 'partial') {
      filtered = filtered.filter(inv => inv.status === 'Partial');
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(inv => inv.status === 'Pending');
    }
    
    return filtered;
  }, [invoices, searchTerm, filterStatus, dateFilter]);

  const totalPages = useMemo(() => Math.ceil(filteredInvoices.length / itemsPerPage), [filteredInvoices.length, itemsPerPage]);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = useMemo(() => 
    filteredInvoices.slice(indexOfFirstItem, indexOfLastItem),
    [filteredInvoices, indexOfFirstItem, indexOfLastItem]
  );

  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  }, []);

  const handleDateFilterChange = useCallback((filter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getDateFilterLabel = () => {
    const labels = {
      all: 'All Time',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year'
    };
    return labels[dateFilter] || 'All Time';
  };

  // ✅ Open Edit Modal
  const openEditModal = useCallback((invoice) => {
    setEditingInvoice(invoice);
    setEditFormData({
      discountType: 'fixed',
      discountValue: invoice.discount > 0 ? invoice.discount.toString() : '',
      discountNote: invoice.discountNote || '',
      additionalPayment: ''
    });
    setIsEditModalOpen(true);
  }, []);

  // ✅ Close Edit Modal
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingInvoice(null);
    setEditFormData({
      discountType: 'fixed',
      discountValue: '',
      discountNote: '',
      additionalPayment: ''
    });
  }, []);

  // ✅ Handle Edit Form Change
  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    // ✅ Allow only numbers and decimal
    if (name === 'discountValue' || name === 'additionalPayment') {
      const val = value.replace(/[^0-9.]/g, '');
      setEditFormData(prev => ({ ...prev, [name]: val }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  // ✅ Submit Edit (Update Invoice) - FIXED: No rounding in calculations
  const handleEditSubmit = useCallback(async () => {
    if (!editingInvoice) return;
    
    setIsSubmitting(true);
    
    try {
      const { discountValue, discountNote, additionalPayment, discountType } = editFormData;
      
      // Calculate new totals - EXACT values, NO rounding in calculations
      const subtotal = editingInvoice.subtotal || editingInvoice.total;
      let discountAmount = 0;
      
      // ✅ FIX: Exact discount value, no rounding
      if (discountValue && parseFloat(discountValue) > 0) {
        const val = parseFloat(discountValue);
        if (discountType === 'percentage') {
          discountAmount = (subtotal * val) / 100;
        } else {
          discountAmount = val; // ✅ EXACT value, no rounding!
        }
      }
      
      const newTotal = subtotal - discountAmount;
      const existingPaid = editingInvoice.paidAmount || 0;
      const additionalPaid = parseFloat(additionalPayment) || 0;
      const newPaidAmount = existingPaid + additionalPaid;
      const newRemainingAmount = newTotal - newPaidAmount;
      const newStatus = newRemainingAmount <= 0.01 ? 'Paid' : (newPaidAmount > 0 ? 'Partial' : 'Pending');
      
      // ✅ Round ONLY for database storage
      const roundedDiscount = roundToTwo(discountAmount);
      const roundedNewTotal = roundToTwo(newTotal);
      const roundedPaidAmount = roundToTwo(newPaidAmount);
      const roundedRemaining = roundToTwo(newRemainingAmount);
      
      // Prepare update payload
      const payload = {
        subtotal: subtotal,
        discount: roundedDiscount,
        discount_note: discountNote || null,
        total_amount: roundedNewTotal,
        paid_amount: roundedPaidAmount,
        remaining_amount: roundedRemaining,
        status: newStatus,
        payment_method: editingInvoice.paymentMethod || 'cash'
      };
      
      // Send update to API
      const response = await api.put(`/invoices/${editingInvoice.id}`, payload);
      
      if (response.data) {
        toast.success('Invoice updated successfully!');
        
        // Refresh invoices list
        await fetchInvoices();
        closeEditModal();
        
        // If modal is open, update selected invoice
        if (isModalOpen && selectedInvoice?.id === editingInvoice.id) {
          const updatedInvoice = invoices.find(inv => inv.id === editingInvoice.id);
          if (updatedInvoice) {
            setSelectedInvoice(updatedInvoice);
          }
        }
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast.error('Failed to update invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  }, [editingInvoice, editFormData, fetchInvoices, closeEditModal, isModalOpen, selectedInvoice, invoices]);

  const exportToExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(filteredInvoices.map(inv => ({
      'Invoice #': inv.invoiceNo,
      'Date': new Date(inv.date).toLocaleDateString(),
      'Customer Name': inv.customer?.name || 'Walk-in',
      'Phone': inv.customer?.phone || 'N/A',
      'Car Number': inv.customer?.carNumber || 'N/A',
      'Services': inv.items.map(i => i.name).join(', '),
      'Subtotal': `Rs. ${(inv.subtotal || inv.total).toLocaleString()}`,
      'Discount': inv.discount > 0 ? `Rs. ${inv.discount.toLocaleString()}` : 'None',
      'Total': `Rs. ${inv.total.toLocaleString()}`,
      'Paid': `Rs. ${(inv.paidAmount || inv.total).toLocaleString()}`,
      'Remaining': `Rs. ${(inv.remainingAmount || 0).toLocaleString()}`,
      'Status': inv.status || 'Paid',
      'Created By': inv.creatorName || 'System'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, `All_Records.xlsx`);
    toast.success('Exported to Excel');
  }, [filteredInvoices]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF('landscape');
    doc.text(`All Invoice Records - ${getDateFilterLabel()}`, 14, 10);
    doc.autoTable({
      head: [['Invoice #', 'Date', 'Customer', 'Phone', 'Car No', 'Services', 'Subtotal', 'Discount', 'Total', 'Status', 'Created By']],
      body: filteredInvoices.map(inv => [
        inv.invoiceNo,
        new Date(inv.date).toLocaleDateString(),
        inv.customer?.name || 'Walk-in',
        inv.customer?.phone || 'N/A',
        inv.customer?.carNumber || 'N/A',
        inv.items.map(i => i.name).join(', ').substring(0, 30) + (inv.items.length > 2 ? '...' : ''),
        `Rs. ${(inv.subtotal || inv.total).toLocaleString()}`,
        inv.discount > 0 ? `Rs. ${inv.discount.toLocaleString()}` : 'None',
        `Rs. ${inv.total.toLocaleString()}`,
        inv.status || 'Paid',
        inv.creatorName || 'System'
      ]),
      startY: 20,
    });
    doc.save(`Records_${getDateFilterLabel()}.pdf`);
    toast.success('Exported to PDF');
  }, [filteredInvoices]);

  const viewInvoiceDetails = useCallback((invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  }, []);

  // ✅ Print Single Invoice with Dynamic Date & Time
  const printSingleInvoice = useCallback(() => {
    if (!selectedInvoice) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
      toast.error('Please allow popups to print invoice');
      return;
    }
    
    const cartItemsHtml = selectedInvoice.items.map((item, idx) => `
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${item.category || 'Service'}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${(item.price || 0).toLocaleString()}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
      </tr>
    `).join('');

    // ✅ Discount row HTML
    const discountRowHtml = selectedInvoice.discount > 0 ? `
      <tr>
        <td colspan="5" style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">Discount ${selectedInvoice.discountNote ? `(${selectedInvoice.discountNote})` : ''}</td>
        <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #dc2626;">- Rs. ${selectedInvoice.discount.toLocaleString()}</td>
      </tr>
    ` : '';

    const isFullyPaid = selectedInvoice.status === 'Paid';
    const remainingAmount = selectedInvoice.remainingAmount || 0;
    const paidAmount = selectedInvoice.paidAmount || selectedInvoice.total;
    const subtotal = selectedInvoice.subtotal || selectedInvoice.total;

    // ✅ FORMAT DATE & TIME DYNAMICALLY IN PAKISTAN TIME
    const invoiceDate = new Date(selectedInvoice.date);
    const formattedDate = invoiceDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
    const formattedTime = invoiceDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
    const fullDateTime = `${formattedDate}, ${formattedTime}`;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Noorani Car AC - Invoice ${selectedInvoice.invoiceNo}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f0f0f0; 
            }
            .invoice-container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 12px; 
              box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
              overflow: hidden; 
            }
            .header { 
              background: white; 
              padding: 20px; 
              border-bottom: 2px solid #e5e7eb; 
              display: flex; 
              align-items: center; 
              gap: 20px; 
            }
            .header-logo { 
              width: 80px; 
              height: 80px; 
              border-radius: 50%; 
              object-fit: cover; 
              border: 3px solid #dc2626; 
              flex-shrink: 0; 
            }
            .header-text { 
              flex: 1; 
              text-align: center; 
            }
            .header-text .shop-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #1f2937; 
              letter-spacing: 1px; 
            }
            .header-text .subtitle { 
              font-size: 14px; 
              color: #6b7280; 
              margin-top: 2px; 
            }
            .customer-info { 
              margin: 20px; 
              padding: 18px; 
              border: 1px solid #e5e7eb; 
              border-radius: 8px; 
            }
            .customer-info h4 { 
              margin-bottom: 10px; 
              color: #1f2937; 
              font-size: 14px; 
            }
            .customer-info p { 
              margin: 4px 0; 
              font-size: 13px; 
              color: #333; 
            }
            .invoice-details { 
              display: flex; 
              justify-content: space-between; 
              margin: 20px; 
              padding: 12px 15px; 
              background: #f8f9fa; 
              border-radius: 8px; 
              font-size: 13px; 
            }
            table { 
              width: calc(100% - 40px); 
              margin: 20px; 
              border-collapse: collapse; 
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 10px 12px; 
              text-align: left; 
              font-size: 13px; 
            }
            th { 
              background: #1f2937; 
              color: white; 
              font-weight: 600; 
            }
            .payment-details { 
              margin: 20px; 
              padding: 18px; 
              border: 1px solid #e5e7eb; 
              border-radius: 8px; 
            }
            .payment-details h4 { 
              margin-bottom: 10px; 
              color: #1f2937; 
              font-size: 14px; 
            }
            .payment-details p { 
              margin: 4px 0; 
              font-size: 13px; 
            }
            .total-row { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: right; 
              margin: 20px; 
              padding-top: 12px; 
              border-top: 2px solid #e5e7eb; 
              color: #dc2626; 
            }
            .signature { 
              margin: 20px; 
              display: flex; 
              justify-content: space-between; 
              padding-top: 30px; 
              border-top: 1px solid #e5e7eb; 
              margin-top: 20px;
              font-size: 12px; 
            }
            .signature p {
              font-size: 12px;
              color: #333;
            }
            .footer { 
              padding: 15px 20px; 
              background: #f8f9fa; 
              border-top: 1px solid #e5e7eb; 
              font-size: 12px; 
              color: #4b5563; 
              margin-top: 20px;
            }
            .footer .address { 
              margin-bottom: 4px; 
            }
            .footer .social { 
              margin-top: 6px; 
            }
            .footer .social span { 
              display: block; 
              margin: 2px 0; 
            }
            .print-actions { 
              text-align: center; 
              margin-top: 20px; 
              padding: 15px; 
              background: white; 
              border-radius: 12px; 
              max-width: 800px; 
              margin-left: auto; 
              margin-right: auto; 
            }
            .print-btn, .close-btn { 
              padding: 10px 24px; 
              border: none; 
              border-radius: 8px; 
              cursor: pointer; 
              font-size: 14px; 
              font-weight: 500; 
              margin: 0 8px; 
            }
            .print-btn { 
              background: #dc2626; 
              color: white; 
            }
            .close-btn { 
              background: #6b7280; 
              color: white; 
            }
            .discount-row { 
              color: #dc2626; 
              font-weight: bold; 
            }
            @media print { 
              body { 
                background: white; 
                padding: 0; 
              } 
              .print-actions { 
                display: none; 
              } 
              .invoice-container { 
                box-shadow: none; 
                border-radius: 0; 
              } 
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="${logo}" alt="Noorani Car AC Logo" class="header-logo" />
              <div class="header-text">
                <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
                <div class="subtitle">Professional Auto Care Service</div>
              </div>
            </div>
            <div class="customer-info">
              <h4>CUSTOMER INFORMATION</h4>
              <p><strong>Name:</strong> ${selectedInvoice.customer?.name || 'Walk-in Customer'}</p>
              <p><strong>Phone:</strong> ${selectedInvoice.customer?.phone || 'N/A'}</p>
              <p><strong>Car Number:</strong> ${selectedInvoice.customer?.carNumber || 'N/A'}</p>
              <p><strong>Car Model:</strong> ${selectedInvoice.customer?.carModel || 'N/A'}</p>
            </div>
            <div class="invoice-details">
              <p><strong>Invoice #:</strong> ${selectedInvoice.invoiceNo}</p>
              <p><strong>Date & Time:</strong> ${fullDateTime}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">#</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${cartItemsHtml}
                ${discountRowHtml}
              </tbody>
            </table>
            <div class="payment-details">
              <h4>PAYMENT DETAILS</h4>
              <p><strong>Subtotal:</strong> Rs. ${subtotal.toLocaleString()}</p>
              ${selectedInvoice.discount > 0 ? `<p><strong>Discount:</strong> - Rs. ${selectedInvoice.discount.toLocaleString()} ${selectedInvoice.discountNote ? `(${selectedInvoice.discountNote})` : ''}</p>` : ''}
              <p><strong>Total Amount:</strong> Rs. ${selectedInvoice.total.toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${paidAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${(selectedInvoice.paymentMethod || 'Cash').toUpperCase()}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${remainingAmount.toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${isFullyPaid ? 'FULLY PAID' : 'PENDING'}</p>
            </div>
            <div class="total-row">Total: Rs. ${selectedInvoice.total.toLocaleString()}</div>
            
            <div class="signature">
              <p>Customer Signature: _________________</p>
              <p>Authorized Signature: _________________</p>
            </div>
            
            <div class="footer">
              <div class="address">
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi
              </div>
              <div>
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                0337 3267363
              </div>
              <div class="social">
                <span>
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook: https://www.facebook.com/Noorani.Car.AC/
                </span>
                <span>
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Instagram: https://www.instagram.com/nooranicarac/
                </span>
              </div>
            </div>
          </div>
          
          <div class="print-actions">
            <button class="print-btn" onclick="window.print()">Print Bill</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
          <script>
            setTimeout(function() { 
              window.print(); 
            }, 500);
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    toast.success('Print preview opened');
  }, [selectedInvoice]);

  // ✅ Format date for modal display with time
  const formatInvoiceDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
  };

  // ✅ Format date for table display
  const formatTableDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    });
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="px-6 py-4 bg-red-500">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <FiList className="text-white text-xl" />
              <div>
                <h3 className="text-lg font-semibold text-white">All Invoices Records</h3>
                <p className="text-xs text-red-100 mt-1 flex items-center gap-1">
                  <FiFileText className="text-xs" /> Total Invoices: {invoices.length} | Showing: {filteredInvoices.length}
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {getDateFilterLabel()}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={exportToExcel} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1 shadow-md">
                <FiFileText className="text-sm" /> Excel
              </button>
              <button onClick={exportToPDF} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-1 shadow-md">
                <FiDownload className="text-sm" /> PDF
              </button>
            </div>
          </div>
        </div>
        
        {/* Search, Filter and Date Filter Bar */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-wrap justify-between items-center gap-4`}>
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search by Name, Phone, Car Number or Invoice #..."
              value={searchTerm}
              onChange={handleSearch}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleDateFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                dateFilter === 'all' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleDateFilterChange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                dateFilter === 'today' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateFilterChange('week')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                dateFilter === 'week' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleDateFilterChange('month')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                dateFilter === 'month' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handleDateFilterChange('year')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                dateFilter === 'year' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Year
            </button>
          </div>
          
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filterStatus === 'all' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                filterStatus === 'paid' ? 'bg-green-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiCheckCircle className="text-xs" /> Paid
            </button>
            <button
              onClick={() => handleFilterChange('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                filterStatus === 'partial' ? 'bg-yellow-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiAlertCircle className="text-xs" /> Partial
            </button>
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                filterStatus === 'pending' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiClock className="text-xs" /> Pending
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[120px]">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[100px]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[130px]">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[130px]">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[120px]">Car Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 min-w-[150px]">Services</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[80px]">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[80px]">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[100px]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[130px]">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[150px]">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {currentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center">
                    <FiInbox className="text-6xl mx-auto text-gray-500" />
                    <p className="mt-2 text-gray-500">No invoices found</p>
                    <p className="text-sm mt-1 text-gray-400">
                      {searchTerm ? `No results for "${searchTerm}"` : 'Create your first invoice from the Billing section'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentInvoices.map(inv => (
                  <tr key={inv.id} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatTableDate(inv.date)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{inv.customer?.name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{inv.customer?.phone || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{inv.customer?.carNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {inv.items.slice(0, 2).map(i => i.name).join(', ')}
                      {inv.items.length > 2 && ` +${inv.items.length - 2} more`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-500 whitespace-nowrap">Rs. {inv.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {inv.discount > 0 ? (
                        <span className="text-red-500 font-semibold">- Rs. {inv.discount.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                        inv.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        inv.status === 'Partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                        inv.status === 'Pending' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {inv.status === 'Paid' ? <FiCheckCircle className="text-xs" /> : 
                         inv.status === 'Partial' ? <FiAlertCircle className="text-xs" /> : 
                         inv.status === 'Pending' ? <FiClock className="text-xs" /> :
                         <FiClock className="text-xs" />}
                        {inv.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        inv.creatorRole === 'admin' 
                          ? 'bg-red-500/20 text-red-500' 
                          : inv.creatorRole === 'employee'
                            ? 'bg-blue-500/20 text-blue-500'
                            : 'bg-gray-500/20 text-gray-500'
                      }`}>
                        {inv.creatorName || 'System'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => viewInvoiceDetails(inv)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-1 shadow-md whitespace-nowrap">
                          <FiEye className="text-sm" /> View
                        </button>
                        <button onClick={() => openEditModal(inv)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-1 shadow-md whitespace-nowrap">
                          <FiEdit2 className="text-sm" /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredInvoices.length)} of {filteredInvoices.length} entries
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1} 
              className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FiChevronLeft className="text-lg" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
                if (i === 5) return <span key="dots1" className="px-2 py-1 text-gray-500">...</span>;
                if (i === 6) return <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="w-8 h-8 rounded-lg text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800">{totalPages}</button>;
              } else if (currentPage >= totalPages - 3) {
                if (i === 0) return <button key={1} onClick={() => handlePageChange(1)} className="w-8 h-8 rounded-lg text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800">1</button>;
                if (i === 1) return <span key="dots1" className="px-2 py-1 text-gray-500">...</span>;
                pageNum = totalPages - 5 + i;
              } else {
                if (i === 0) return <button key={1} onClick={() => handlePageChange(1)} className="w-8 h-8 rounded-lg text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800">1</button>;
                if (i === 1) return <span key="dots1" className="px-2 py-1 text-gray-500">...</span>;
                if (i === 5) return <span key="dots2" className="px-2 py-1 text-gray-500">...</span>;
                if (i === 6) return <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="w-8 h-8 rounded-lg text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800">{totalPages}</button>;
                pageNum = currentPage - 1 + (i - 2);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm transition ${
                    currentPage === pageNum ? 'bg-red-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages} 
              className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <FiChevronRight className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Details Modal - ✅ FIXED: Dynamic Date & Time */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="sticky top-0 flex justify-between items-center p-4 border-b rounded-t-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiFileText className="text-xl text-red-500" /> Invoice Details
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedInvoice.invoiceNo}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(selectedInvoice)} className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-md">
                  <FiEdit2 /> Edit
                </button>
                <button onClick={printSingleInvoice} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 shadow-md">
                  <FiPrinter /> Print
                </button>
                <button onClick={closeModal} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                  <FiX />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiUser className="text-lg text-red-500" /> Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiUser className="text-xs" /> Full Name</p><p className="font-semibold text-gray-900 dark:text-white">{selectedInvoice.customer?.name || 'Walk-in Customer'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiPhone className="text-xs" /> Phone Number</p><p className="font-semibold text-gray-900 dark:text-white">{selectedInvoice.customer?.phone || 'N/A'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiTool className="text-xs" /> Car Number Plate</p><p className="font-semibold text-gray-900 dark:text-white">{selectedInvoice.customer?.carNumber || 'N/A'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiPackage className="text-xs" /> Car Model</p><p className="font-semibold text-gray-900 dark:text-white">{selectedInvoice.customer?.carModel || 'N/A'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiCalendar className="text-xs" /> Invoice Date & Time</p><p className="font-semibold text-gray-900 dark:text-white">{formatInvoiceDate(selectedInvoice.date)}</p></div>
                </div>
              </div>
              
              {/* Services Table */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiTool className="text-lg text-red-500" /> Services Provided
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm">#</th>
                        <th className="px-4 py-2 text-left text-sm">Service Name</th>
                        <th className="px-4 py-2 text-left text-sm">Category</th>
                        <th className="px-4 py-2 text-right text-sm">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.category || 'Service'}</td>
                          <td className="px-4 py-2 text-sm text-right font-semibold text-red-500">Rs. {item.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right font-bold">Subtotal:</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">Rs. {(selectedInvoice.subtotal || selectedInvoice.total).toLocaleString()}</td>
                      </tr>
                      {selectedInvoice.discount > 0 && (
                        <tr>
                          <td colSpan="3" className="px-4 py-3 text-right font-bold text-red-500">Discount {selectedInvoice.discountNote ? `(${selectedInvoice.discountNote})` : ''}:</td>
                          <td className="px-4 py-3 text-right font-bold text-red-500">- Rs. {selectedInvoice.discount.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right font-bold text-red-500">Total:</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">Rs. {selectedInvoice.total.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiDollarSign className="text-lg text-red-500" /> Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p><p className="text-xl font-bold text-gray-900 dark:text-white">Rs. {selectedInvoice.total.toLocaleString()}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Paid Amount</p><p className="text-xl font-bold text-green-500">Rs. {(selectedInvoice.paidAmount || selectedInvoice.total).toLocaleString()}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Remaining Balance</p><p className="text-xl font-bold text-red-500">Rs. {(selectedInvoice.remainingAmount || 0).toLocaleString()}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p><p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1"><FiDollarSign className="text-sm" /> {selectedInvoice.paymentMethod || 'Cash'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Discount</p><p className="font-semibold text-red-500">{selectedInvoice.discount > 0 ? `Rs. ${selectedInvoice.discount.toLocaleString()}` : 'None'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Payment Status</p><span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 w-fit ${
                    selectedInvoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                    selectedInvoice.status === 'Partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {selectedInvoice.status === 'Paid' ? <FiCheckCircle /> : 
                     selectedInvoice.status === 'Partial' ? <FiAlertCircle /> : 
                     <FiClock />}
                    {selectedInvoice.status === 'Paid' ? 'FULLY PAID' : 
                     selectedInvoice.status === 'Partial' ? 'PARTIAL PAYMENT' : 
                     'PENDING'}
                  </span></div>
                </div>
                {selectedInvoice.discountNote && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Discount Note</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedInvoice.discountNote}</p>
                  </div>
                )}
              </div>

              {/* Created By */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-blue-50'} border ${darkMode ? 'border-gray-700' : 'border-blue-200'}`}>
                <h3 className={`font-semibold text-lg mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiUser className="text-lg text-blue-500" /> Created By
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedInvoice.creatorName || 'System'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Role</p>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedInvoice.creatorRole === 'admin' ? 'Admin' : 
                       selectedInvoice.creatorRole === 'employee' ? 'Employee' : 
                       'System'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t rounded-b-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2">
                <FiX /> Close
              </button>
              <button onClick={() => openEditModal(selectedInvoice)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-md">
                <FiEdit2 /> Edit Invoice
              </button>
              <button onClick={printSingleInvoice} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md">
                <FiPrinter /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ EDIT INVOICE MODAL */}
      {isEditModalOpen && editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="sticky top-0 flex justify-between items-center p-4 border-b rounded-t-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiEdit2 className="text-xl text-blue-500" /> Edit Invoice
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{editingInvoice.invoiceNo} - {editingInvoice.customer?.name}</p>
              </div>
              <button onClick={closeEditModal} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                <FiX />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Current Invoice Summary */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">Current Invoice Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                    <p className="font-bold text-gray-900 dark:text-white">Rs. {(editingInvoice.subtotal || editingInvoice.total).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Discount</p>
                    <p className="font-bold text-red-500">{editingInvoice.discount > 0 ? `Rs. ${editingInvoice.discount.toLocaleString()}` : 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="font-bold text-red-500">Rs. {editingInvoice.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
                    <p className="font-bold text-green-500">Rs. {(editingInvoice.paidAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                    <p className="font-bold text-red-500">Rs. {(editingInvoice.remainingAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      editingInvoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                      editingInvoice.status === 'Partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {editingInvoice.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount Section */}
              <div className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-red-200 bg-red-50'}`}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiGift className="text-lg text-red-500" /> Add / Update Discount
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Discount Type</label>
                    <select
                      name="discountType"
                      value={editFormData.discountType}
                      onChange={handleEditChange}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    >
                      <option value="fixed">Fixed Amount (Rs.)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {editFormData.discountType === 'percentage' ? 'Discount %' : 'Discount Amount (Rs.)'}
                    </label>
                    <input
                      type="text"
                      name="discountValue"
                      value={editFormData.discountValue}
                      onChange={handleEditChange}
                      placeholder={editFormData.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Discount Note (Optional)</label>
                  <input
                    type="text"
                    name="discountNote"
                    value={editFormData.discountNote}
                    onChange={handleEditChange}
                    placeholder="e.g. Premium Customer Discount"
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-400 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>

              {/* Additional Payment Section */}
              <div className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-blue-200 bg-blue-50'}`}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <FiDollarSign className="text-lg text-blue-500" /> Additional Payment
                </h3>
                <div>
                  <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Additional Payment Amount (Rs.)
                  </label>
                  <input
                    type="text"
                    name="additionalPayment"
                    value={editFormData.additionalPayment}
                    onChange={handleEditChange}
                    placeholder="e.g. 1000"
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current remaining: Rs. {(editingInvoice.remainingAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Preview Changes */}
              {(() => {
                const subtotal = editingInvoice.subtotal || editingInvoice.total;
                let discountAmount = 0;
                if (editFormData.discountValue && parseFloat(editFormData.discountValue) > 0) {
                  const val = parseFloat(editFormData.discountValue);
                  if (editFormData.discountType === 'percentage') {
                    discountAmount = (subtotal * val) / 100;
                  } else {
                    discountAmount = val;
                  }
                }
                const newTotal = subtotal - discountAmount;
                const existingPaid = editingInvoice.paidAmount || 0;
                const additionalPaid = parseFloat(editFormData.additionalPayment) || 0;
                const newPaidAmount = existingPaid + additionalPaid;
                const newRemaining = newTotal - newPaidAmount;
                const newStatus = newRemaining <= 0.01 ? 'Paid' : (newPaidAmount > 0 ? 'Partial' : 'Pending');

                return (
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">Preview Changes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                        <p className="font-bold text-gray-900 dark:text-white">Rs. {subtotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Discount</p>
                        <p className="font-bold text-red-500">{discountAmount > 0 ? `- Rs. ${discountAmount.toLocaleString()}` : 'None'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">New Total</p>
                        <p className="font-bold text-red-500">Rs. {newTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">New Remaining</p>
                        <p className="font-bold text-red-500">Rs. {newRemaining.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">New Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        newStatus === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        newStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {newStatus === 'Paid' ? '✅ FULLY PAID' : 
                         newStatus === 'Partial' ? '⚠️ PARTIAL PAYMENT' : 
                         '⏳ PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t rounded-b-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <button onClick={closeEditModal} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2">
                <FiX /> Cancel
              </button>
              <button onClick={handleEditSubmit} disabled={isSubmitting} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <FiLoader className="animate-spin" /> : <FiSave />} 
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Records;