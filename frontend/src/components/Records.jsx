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
  FiSearch, FiChevronLeft, FiChevronRight, FiLoader
} from 'react-icons/fi';
import api from '../services/api';

// Memoized Invoice Row Component
const InvoiceRow = React.memo(({ invoice, darkMode, onView }) => (
  <tr className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{invoice.invoiceNo}</td>
    <td className="text-gray-700 dark:text-gray-300 whitespace-nowrap">{new Date(invoice.date).toLocaleDateString()}</td>
    <td className="text-gray-700 dark:text-gray-300">{invoice.customer?.name || 'Walk-in'}</td>
    <td className="text-gray-700 dark:text-gray-300">{invoice.customer?.phone || 'N/A'}</td>
    <td className="text-gray-700 dark:text-gray-300">{invoice.customer?.carNumber || 'N/A'}</td>
    <td className="text-gray-700 dark:text-gray-300">
      {invoice.items.slice(0, 2).map(i => i.name).join(', ')}
      {invoice.items.length > 2 && ` +${invoice.items.length - 2} more`}
    </td>
    <td className="px-6 py-4 font-semibold text-red-500 whitespace-nowrap">Rs. {invoice.total.toLocaleString()}</td>
    <td className="px-6 py-4">
      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
        invoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
        invoice.status === 'Partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      }`}>
        {invoice.status === 'Paid' ? <FiCheckCircle className="text-xs" /> : invoice.status === 'Partial' ? <FiAlertCircle className="text-xs" /> : <FiClock className="text-xs" />}
        {invoice.status === 'Paid' ? 'Paid' : invoice.status === 'Partial' ? 'Partial' : 'Pending'}
      </span>
    </td>
    <td className="px-6 py-4">
      <button onClick={() => onView(invoice)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-1 shadow-md whitespace-nowrap">
        <FiEye className="text-sm" /> View
      </button>
    </td>
  </tr>
));

// Memoized Pagination Component
const Pagination = React.memo(({ currentPage, totalPages, onPageChange, totalItems, startIndex, endIndex, darkMode }) => {
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
      </div>
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1} 
          className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FiChevronLeft className="text-lg" />
        </button>
        {getPageNumbers().map((page, idx) => (
          page === '...' ? 
            <span key={`dots-${idx}`} className="px-2 py-1 text-gray-500">...</span> :
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-sm transition ${
                currentPage === page ? 'bg-red-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {page}
            </button>
        ))}
        <button 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages} 
          className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FiChevronRight className="text-lg" />
        </button>
      </div>
    </div>
  );
});

const Records = ({ darkMode }) => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch invoices from API - optimized with useCallback
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

  // Memoized filtered invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.customer?.name || '').toLowerCase().includes(term) ||
        (inv.customer?.phone || '').toLowerCase().includes(term) ||
        (inv.customer?.carNumber || '').toLowerCase().includes(term) ||
        inv.invoiceNo.toLowerCase().includes(term)
      );
    }
    
    if (filterStatus === 'paid') {
      filtered = filtered.filter(inv => inv.status === 'Paid');
    } else if (filterStatus === 'partial') {
      filtered = filtered.filter(inv => inv.status === 'Partial');
    }
    
    return filtered;
  }, [invoices, searchTerm, filterStatus]);

  // Memoized pagination values
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

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Memoized export functions
  const exportToExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(filteredInvoices.map(inv => ({
      'Invoice #': inv.invoiceNo,
      'Date': new Date(inv.date).toLocaleDateString(),
      'Customer Name': inv.customer?.name || 'Walk-in',
      'Phone': inv.customer?.phone || 'N/A',
      'Car Number': inv.customer?.carNumber || 'N/A',
      'Services': inv.items.map(i => i.name).join(', '),
      'Total': `Rs. ${inv.total.toLocaleString()}`,
      'Paid': `Rs. ${inv.paidAmount?.toLocaleString() || inv.total.toLocaleString()}`,
      'Remaining': `Rs. ${inv.remainingAmount?.toLocaleString() || 0}`,
      'Status': inv.status || 'Paid'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, `All_Records.xlsx`);
    toast.success('Exported to Excel');
  }, [filteredInvoices]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF('landscape');
    doc.text('All Invoice Records - Noorani Car AC', 14, 10);
    doc.autoTable({
      head: [['Invoice #', 'Date', 'Customer', 'Phone', 'Car No', 'Services', 'Total', 'Status']],
      body: filteredInvoices.map(inv => [
        inv.invoiceNo,
        new Date(inv.date).toLocaleDateString(),
        inv.customer?.name || 'Walk-in',
        inv.customer?.phone || 'N/A',
        inv.customer?.carNumber || 'N/A',
        inv.items.map(i => i.name).join(', ').substring(0, 30) + (inv.items.length > 2 ? '...' : ''),
        `Rs. ${inv.total.toLocaleString()}`,
        inv.status || 'Paid'
      ]),
      startY: 20,
    });
    doc.save(`All_Records.pdf`);
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

  const printSingleInvoice = useCallback(() => {
    if (!selectedInvoice) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${selectedInvoice.invoiceNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #fff; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1a1a2e; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #1a1a2e; }
            .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .customer-info { margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; }
            .customer-info h4 { margin-bottom: 10px; color: #1a1a2e; }
            .customer-info p { margin: 5px 0; font-size: 14px; }
            .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; padding: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #1a1a2e; color: white; }
            .payment-details { margin: 20px 0; padding: 15px; background: #e8f4f8; border-radius: 12px; }
            .total-row { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="logo">❄️ NOORANI CAR A/C & AUTOS</div>
              <p class="subtitle">Professional Auto Care Service</p>
              <p>123 Main Street, City | Phone: +92 300 1234567</p>
              <p>Email: info@nooraniac.com</p>
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
              <p><strong>Date:</strong> ${new Date(selectedInvoice.date).toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Service</th><th>Category</th><th>Price</th></tr>
              </thead>
              <tbody>
                ${selectedInvoice.items.map((item, idx) => `
                  <tr>
                    <td>${idx+1}</td>
                    <td>${item.name}</td>
                    <td>${item.category || 'Service'}</td>
                    <td>Rs. ${item.price.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="payment-details">
              <h4>PAYMENT DETAILS</h4>
              <p><strong>Total Amount:</strong> Rs. ${selectedInvoice.total.toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${(selectedInvoice.paidAmount || selectedInvoice.total).toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${selectedInvoice.paymentMethod || 'Cash'}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${(selectedInvoice.remainingAmount || 0).toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${selectedInvoice.status === 'Paid' ? 'FULLY PAID' : 'PARTIAL PAYMENT'}</p>
            </div>
            <div class="total-row">Total Amount: Rs. ${selectedInvoice.total.toLocaleString()}</div>
            <div class="signature">
              <p>Customer Signature: _________________</p>
              <p>Authorized Signature: _________________</p>
            </div>
            <div class="footer">Thank you for choosing Noorani Car AC & Autos! Drive Safe</div>
          </div>
        </body>
      </html>
    `);
    printWindow.print();
    printWindow.close();
    toast.success('Invoice sent to printer');
  }, [selectedInvoice]);

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
        
        {/* Search and Filter Bar */}
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
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                filterStatus === 'all' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiList className="text-sm" /> All
            </button>
            <button
              onClick={() => handleFilterChange('paid')}
              className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                filterStatus === 'paid' ? 'bg-green-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiCheckCircle className="text-sm" /> Paid
            </button>
            <button
              onClick={() => handleFilterChange('partial')}
              className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                filterStatus === 'partial' ? 'bg-yellow-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiAlertCircle className="text-sm" /> Partial
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Car Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Services</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {currentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <FiInbox className="text-6xl mx-auto text-gray-500" />
                    <p className="mt-2 text-gray-500">No invoices found</p>
                    <p className="text-sm mt-1 text-gray-400">
                      {searchTerm ? `No results for "${searchTerm}"` : 'Create your first invoice from the Billing section'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentInvoices.map(inv => (
                  <InvoiceRow key={inv.id} invoice={inv} darkMode={darkMode} onView={viewInvoiceDetails} />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={filteredInvoices.length}
          startIndex={indexOfFirstItem}
          endIndex={indexOfLastItem}
          darkMode={darkMode}
        />
      </div>

      {/* Invoice Details Modal */}
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
                  <div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiCalendar className="text-xs" /> Invoice Date</p><p className="font-semibold text-gray-900 dark:text-white">{new Date(selectedInvoice.date).toLocaleString()}</p></div>
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
                        <td colSpan="3" className="px-4 py-3 text-right font-bold">Total:</td>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p><p className="text-xl font-bold text-gray-900 dark:text-white">Rs. {selectedInvoice.total.toLocaleString()}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Paid Amount</p><p className="text-xl font-bold text-green-500">Rs. {(selectedInvoice.paidAmount || selectedInvoice.total).toLocaleString()}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p><p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1"><FiDollarSign className="text-sm" /> {selectedInvoice.paymentMethod || 'Cash'}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Remaining Balance</p><p className="text-xl font-bold text-red-500">Rs. {(selectedInvoice.remainingAmount || 0).toLocaleString()}</p></div>
                  <div><p className="text-sm text-gray-500 dark:text-gray-400">Payment Status</p><span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 w-fit ${
                    selectedInvoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {selectedInvoice.status === 'Paid' ? <FiCheckCircle /> : <FiAlertCircle />}
                    {selectedInvoice.status === 'Paid' ? 'FULLY PAID' : 'PARTIAL PAYMENT'}
                  </span></div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t rounded-b-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2">
                <FiX /> Close
              </button>
              <button onClick={printSingleInvoice} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md">
                <FiPrinter /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Records;