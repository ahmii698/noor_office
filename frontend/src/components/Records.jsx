// src/components/Records.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiFileText, FiDownload, FiEye, FiPrinter, FiX, FiUser, 
  FiPhone, FiTool, FiPackage, FiCalendar, FiDollarSign, 
  FiCheckCircle, FiAlertCircle, FiInbox, FiList, FiClock,
  FiSearch, FiChevronLeft, FiChevronRight, FiFilter
} from 'react-icons/fi';

const Records = ({ invoices, darkMode }) => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Search and Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter invoices based on search term and status
  const filteredInvoices = invoices.filter(inv => {
    const searchMatch = 
      (inv.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer?.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer?.carNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    let statusMatch = true;
    if (filterStatus === 'paid') {
      statusMatch = inv.status === 'Paid';
    } else if (filterStatus === 'partial') {
      statusMatch = inv.status === 'Partial';
    }
    
    return searchMatch && statusMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const exportToExcel = () => {
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
  };

  const exportToPDF = () => {
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
        inv.items.map(i => i.name).join(', ').substring(0, 30) + '...',
        `Rs. ${inv.total.toLocaleString()}`,
        inv.status || 'Paid'
      ]),
      startY: 20,
    });
    doc.save(`All_Records.pdf`);
    toast.success('Exported to PDF');
  };

  const viewInvoiceDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  const printSingleInvoice = () => {
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
              <thead><tr><th>#</th><th>Service</th><th>Category</th><th>Price (PKR)</th></tr></thead>
              <tbody>
                ${selectedInvoice.items.map((item, idx) => `<tr><td>${idx+1}</td><td>${item.name}</td><td>${item.category || 'Service'}</td><td>Rs. ${item.price.toLocaleString()}</td></tr>`).join('')}
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
  };

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
                filterStatus === 'all' 
                  ? 'bg-red-500 text-white' 
                  : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiList className="text-sm" /> All
            </button>
            <button
              onClick={() => handleFilterChange('paid')}
              className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                filterStatus === 'paid' 
                  ? 'bg-green-600 text-white' 
                  : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiCheckCircle className="text-sm" /> Paid
            </button>
            <button
              onClick={() => handleFilterChange('partial')}
              className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                filterStatus === 'partial' 
                  ? 'bg-yellow-500 text-white' 
                  : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiFileText className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Invoice #</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiCalendar className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Date</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiUser className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Customer</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiPhone className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Phone</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiTool className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Car Number</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiPackage className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Services</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiDollarSign className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Total</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiCheckCircle className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Status</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}><FiEye className={`inline mr-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {currentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <FiInbox className="text-6xl mx-auto text-gray-500" />
                    <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No invoices found</p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {searchTerm ? `No results for "${searchTerm}"` : 'Create your first invoice from the Billing section'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentInvoices.map(inv => (
                  <tr key={inv.id} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{inv.invoiceNo}</td>
                    <td className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{new Date(inv.date).toLocaleDateString()}</td>
                    <td className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{inv.customer?.name || 'Walk-in'}</td>
                    <td className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{inv.customer?.phone || 'N/A'}</td>
                    <td className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{inv.customer?.carNumber || 'N/A'}</td>
                    <td className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {inv.items.map(i => i.name).slice(0, 2).join(', ')}
                      {inv.items.length > 2 && ` +${inv.items.length - 2} more`}
                    </td>
                    <td className="px-6 py-4 font-semibold text-red-500">Rs. {inv.total.toLocaleString()}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                        inv.status === 'Paid' 
                          ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                          : inv.status === 'Partial'
                          ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                          : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {inv.status === 'Paid' ? <FiCheckCircle className="text-xs" /> : inv.status === 'Partial' ? <FiAlertCircle className="text-xs" /> : <FiClock className="text-xs" />}
                        {inv.status === 'Paid' ? 'Paid' : inv.status === 'Partial' ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewInvoiceDetails(inv)}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-1 shadow-md"
                      >
                        <FiEye className="text-sm" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredInvoices.length)} of {filteredInvoices.length} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-800'
                }`}
              >
                <FiChevronLeft className="text-lg" />
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm transition ${
                          currentPage === pageNum
                            ? 'bg-red-500 text-white'
                            : darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === currentPage - 2 && currentPage > 3) ||
                    (pageNum === currentPage + 2 && currentPage < totalPages - 2)
                  ) {
                    return <span key={pageNum} className="px-1 text-gray-500">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-800'
                }`}
              >
                <FiChevronRight className="text-lg" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`sticky top-0 flex justify-between items-center p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} rounded-t-2xl`}>
              <div>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiFileText className={`text-xl ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Invoice Details
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedInvoice.invoiceNo}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={printSingleInvoice} className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 shadow-md"><FiPrinter /> Print</button>
                <button onClick={closeModal} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"><FiX /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-red-50'} border ${darkMode ? 'border-gray-700' : 'border-red-200'}`}>
                <h3 className={`font-semibold text-lg mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiUser className={`text-lg ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><FiUser className="text-xs" /> Full Name</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedInvoice.customer?.name || 'Walk-in Customer'}</p></div>
                  <div><p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><FiPhone className="text-xs" /> Phone Number</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedInvoice.customer?.phone || 'N/A'}</p></div>
                  <div><p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><FiTool className="text-xs" /> Car Number Plate</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedInvoice.customer?.carNumber || 'N/A'}</p></div>
                  <div><p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><FiPackage className="text-xs" /> Car Model</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedInvoice.customer?.carModel || 'N/A'}</p></div>
                  <div><p className={`text-sm flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}><FiCalendar className="text-xs" /> Invoice Date</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(selectedInvoice.date).toLocaleString()}</p></div>
                </div>
              </div>
              <div>
                <h3 className={`font-semibold text-lg mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiTool className={`text-lg ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Services Provided
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                      <tr><th className="px-4 py-2 text-left text-sm">#</th><th className="px-4 py-2 text-left text-sm">Service Name</th><th className="px-4 py-2 text-left text-sm">Category</th><th className="px-4 py-2 text-right text-sm">Price</th></tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{idx + 1}</td>
                          <td className={`px-4 py-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</td>
                          <td className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.category || 'Service'}</td>
                          <td className="px-4 py-2 text-sm text-right font-semibold text-red-500">Rs. {item.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                      <tr><td colSpan="3" className="px-4 py-3 text-right font-bold">Total:</td><td className="px-4 py-3 text-right font-bold text-red-500">Rs. {selectedInvoice.total.toLocaleString()}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-green-50'} border ${darkMode ? 'border-gray-700' : 'border-green-200'}`}>
                <h3 className={`font-semibold text-lg mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiDollarSign className={`text-lg ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Amount</p><p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Rs. {selectedInvoice.total.toLocaleString()}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Paid Amount</p><p className={`text-xl font-bold text-green-500`}>Rs. {(selectedInvoice.paidAmount || selectedInvoice.total).toLocaleString()}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payment Method</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-1`}><FiDollarSign className="text-sm" /> {selectedInvoice.paymentMethod || 'Cash'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remaining Balance</p><p className={`text-xl font-bold ${(selectedInvoice.remainingAmount || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>Rs. {(selectedInvoice.remainingAmount || 0).toLocaleString()}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payment Status</p><span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 w-fit ${selectedInvoice.status === 'Paid' ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700' : selectedInvoice.status === 'Partial' ? darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700' : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>{selectedInvoice.status === 'Paid' ? <FiCheckCircle /> : selectedInvoice.status === 'Partial' ? <FiAlertCircle /> : <FiClock />}{selectedInvoice.status === 'Paid' ? 'FULLY PAID' : selectedInvoice.status === 'Partial' ? 'PARTIAL PAYMENT' : 'PENDING'}</span></div>
                </div>
              </div>
            </div>
            <div className={`sticky bottom-0 flex justify-end gap-3 p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} rounded-b-2xl`}>
              <button onClick={closeModal} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"><FiX /> Close</button>
              <button onClick={printSingleInvoice} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md"><FiPrinter /> Print Invoice</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Records;