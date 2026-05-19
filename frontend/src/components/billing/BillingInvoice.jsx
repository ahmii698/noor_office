// src/components/billing/BillingInvoice.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiUser, FiCalendar, FiClock, FiDollarSign, 
  FiPlus, FiX, FiPrinter, FiFileText, FiDownload, FiCheckCircle, 
  FiAlertCircle, FiTool, FiPackage, FiShoppingCart, FiCreditCard,
  FiChevronDown, FiChevronUp, FiTrash2, FiEdit2, FiSave,
  FiSearch, FiGrid, FiList as FiListIcon, FiTag, FiPercent
} from 'react-icons/fi';

const BillingInvoice = ({ services, products, setProducts, invoices, setInvoices, customerDetails, darkMode }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {});

  // Filter services by search
  const filteredServices = searchTerm ? 
    services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())) :
    services;

  const getProductStock = (serviceId) => {
    const product = products.find(p => p.id === serviceId);
    return product ? product.quantity : 0;
  };

  const addToBill = (service) => {
    const currentStock = getProductStock(service.id);
    if (currentStock <= 0) {
      toast.error(`${service.name} is out of stock!`);
      return;
    }
    
    const alreadyInCart = cart.find(item => item.id === service.id);
    if (alreadyInCart) {
      toast.error(`${service.name} already added to bill`);
      return;
    }
    
    setCart([...cart, { ...service, quantity: 1 }]);
    toast.success(`${service.name} added`, { icon: '✅' });
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromBill(id);
      return;
    }
    setCart(cart.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromBill = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Removed from bill');
  };

  const billTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const paidAmount = parseFloat(paymentAmount) || 0;
  const remainingAmount = billTotal - paidAmount;
  const isFullyPaid = remainingAmount <= 0;

  const printBill = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Noorani Car AC - Invoice</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', 'Poppins', Arial, sans-serif; 
              margin: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .invoice-container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .logo { font-size: 32px; font-weight: bold; }
            .subtitle { opacity: 0.8; margin-top: 5px; }
            .customer-info { 
              margin: 20px; 
              padding: 20px; 
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              border-radius: 15px;
            }
            .customer-info h4 { margin-bottom: 15px; color: #1a1a2e; }
            .invoice-details { display: flex; justify-content: space-between; margin: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px; width: calc(100% - 40px); }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #1a1a2e; color: white; }
            .payment-details { margin: 20px; padding: 20px; background: #e8f4f8; border-radius: 15px; }
            .total-row { font-size: 24px; font-weight: bold; text-align: right; margin: 20px; padding-top: 15px; border-top: 2px solid #333; }
            .footer { text-align: center; padding: 20px; background: #1a1a2e; color: white; }
            .signature { margin: 20px; display: flex; justify-content: space-between; padding-top: 40px; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="logo">❄️ NOORANI CAR A/C & AUTOS</div>
              <p class="subtitle">Professional Auto Care Service</p>
              <p>123 Main Street, City | Phone: +92 300 1234567</p>
            </div>
            <div class="customer-info">
              <h4>📋 CUSTOMER INFORMATION</h4>
              <p><strong>Name:</strong> ${customerDetails.name}</p>
              <p><strong>Phone:</strong> ${customerDetails.phone}</p>
              <p><strong>Car Number:</strong> ${customerDetails.carNumber}</p>
              <p><strong>Car Model:</strong> ${customerDetails.carModel || 'N/A'}</p>
            </div>
            <div class="invoice-details">
              <p><strong>Invoice #:</strong> INV-${Date.now()}</p>
              <p><strong>Date:</strong> ${customerDetails.date}</p>
            </div>
            <table>
              <thead><tr><th>#</th><th>Service</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>
                ${cart.map((item, idx) => `
                  <tr>
                    <td>${idx+1}</td>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>Rs. ${item.price.toLocaleString()}</td>
                    <td>Rs. ${(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="payment-details">
              <h4>💰 PAYMENT DETAILS</h4>
              <p><strong>Subtotal:</strong> Rs. ${billTotal.toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${paidAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${remainingAmount.toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${isFullyPaid ? '✅ FULLY PAID' : '⚠️ PENDING'}</p>
            </div>
            <div class="total-row">Total: Rs. ${billTotal.toLocaleString()}</div>
            <div class="signature">
              <p>Customer Signature: _________________</p>
              <p>Authorized Signature: _________________</p>
            </div>
            <div class="footer">Thank you for choosing Noorani Car AC & Autos! Drive Safe 🚗</div>
          </div>
        </body>
      </html>
    `);
    printWindow.print();
    printWindow.close();
    toast.success('Bill printed');
  };

  const exportToExcel = () => {
    const exportData = [
      {
        'Invoice #': `INV-${Date.now()}`,
        'Date': customerDetails.date,
        'Customer Name': customerDetails.name,
        'Phone': customerDetails.phone,
        'Car Number': customerDetails.carNumber,
        'Car Model': customerDetails.carModel || 'N/A',
        'Total Amount': `Rs. ${billTotal.toLocaleString()}`,
        'Paid Amount': `Rs. ${paidAmount.toLocaleString()}`,
        'Remaining': `Rs. ${remainingAmount.toLocaleString()}`,
        'Payment Method': paymentMethod.toUpperCase(),
        'Status': isFullyPaid ? 'FULLY PAID' : 'PENDING'
      },
      ...cart.map((item, idx) => ({
        'S.No': idx + 1,
        'Service': item.name,
        'Quantity': item.quantity,
        'Price': `Rs. ${item.price.toLocaleString()}`,
        'Total': `Rs. ${(item.price * item.quantity).toLocaleString()}`
      }))
    ];
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bill');
    XLSX.writeFile(wb, `Bill_${customerDetails.name}_${Date.now()}.xlsx`);
    toast.success('Exported to Excel');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 10;
    
    doc.setFontSize(20);
    doc.setTextColor(26, 26, 46);
    doc.text('NOORANI CAR AC & AUTOS', 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Professional Auto Care Service', 14, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Customer: ${customerDetails.name}`, 14, yPos);
    yPos += 7;
    doc.text(`Phone: ${customerDetails.phone}`, 14, yPos);
    yPos += 7;
    doc.text(`Car Number: ${customerDetails.carNumber}`, 14, yPos);
    yPos += 7;
    doc.text(`Date: ${customerDetails.date}`, 14, yPos);
    yPos += 15;
    
    doc.autoTable({
      startY: yPos,
      head: [['#', 'Service', 'Qty', 'Price', 'Total']],
      body: cart.map((item, idx) => [
        idx + 1,
        item.name,
        item.quantity,
        `Rs. ${item.price.toLocaleString()}`,
        `Rs. ${(item.price * item.quantity).toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 46] }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total Amount: Rs. ${billTotal.toLocaleString()}`, 14, finalY);
    doc.text(`Paid Amount: Rs. ${paidAmount.toLocaleString()}`, 14, finalY + 7);
    doc.text(`Remaining: Rs. ${remainingAmount.toLocaleString()}`, 14, finalY + 14);
    doc.text(`Status: ${isFullyPaid ? 'FULLY PAID' : 'PENDING'}`, 14, finalY + 21);
    
    doc.save(`Bill_${customerDetails.name}_${Date.now()}.pdf`);
    toast.success('Exported to PDF');
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error('No services in bill');
      return;
    }
    
    if (!paymentAmount || paidAmount <= 0) {
      toast.error('Please enter payment amount');
      return;
    }
    
    if (paidAmount > billTotal) {
      toast.error('Payment amount cannot exceed total amount');
      return;
    }
    
    const updatedProducts = products.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        const newQuantity = product.quantity - cartItem.quantity;
        return { ...product, quantity: newQuantity >= 0 ? newQuantity : 0 };
      }
      return product;
    });
    
    setProducts(updatedProducts);
    
    const newInvoice = {
      id: Date.now(),
      invoiceNo: `INV-${Date.now()}`,
      date: customerDetails.date,
      customer: { ...customerDetails },
      items: cart.map(item => ({ ...item })),
      total: billTotal,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      paymentMethod: paymentMethod,
      status: isFullyPaid ? 'Paid' : 'Partial'
    };
    setInvoices([...invoices, newInvoice]);
    
    setCart([]);
    setPaymentAmount('');
    setPaymentMethod('cash');
    
    toast.success(`Payment successful! ${isFullyPaid ? 'Bill fully paid' : 'Partial payment received'}`, { icon: '🎉' });
  };

  return (
    <div className="space-y-6">
      {/* Customer Summary Card */}
      <div className={`${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-white to-gray-50'} rounded-2xl shadow-xl p-5 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <FiUser className="text-white text-2xl" />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Billing For</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{customerDetails.name}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customerDetails.carNumber} • {customerDetails.carModel || 'No Model'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Invoice Date</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{customerDetails.date}</p>
            </div>
            <div className="w-px h-10 bg-gray-300 dark:bg-gray-700"></div>
            <div className="text-right">
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{customerDetails.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services and Bill Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Section */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FiTool className="text-white text-xl" />
                <h3 className="text-lg font-semibold text-white">Available Services</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                  <FiGrid className="text-white" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                  <FiListIcon className="text-white" />
                </button>
              </div>
            </div>
            <div className="relative mt-3">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
          
          <div className={`p-4 max-h-[500px] overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredServices.map(service => {
                  const stock = getProductStock(service.id);
                  const isOutOfStock = stock <= 0;
                  return (
                    <div
                      key={service.id}
                      onClick={() => !isOutOfStock && addToBill(service)}
                      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        isOutOfStock 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                          : darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-500' 
                            : 'bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{service.icon}</div>
                      <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{service.category}</p>
                      <p className="text-red-500 font-bold text-lg mt-2">Rs. {service.price.toLocaleString()}</p>
                      {stock < 5 && stock > 0 && (
                        <p className="text-xs text-yellow-500 mt-1">Only {stock} left</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredServices.map(service => {
                  const stock = getProductStock(service.id);
                  const isOutOfStock = stock <= 0;
                  return (
                    <div
                      key={service.id}
                      onClick={() => !isOutOfStock && addToBill(service)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                        isOutOfStock 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                          : darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-50 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{service.icon}</div>
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{service.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">Rs. {service.price.toLocaleString()}</p>
                        {stock < 5 && stock > 0 && (
                          <p className="text-xs text-yellow-500">{stock} left</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bill Section */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex items-center gap-2">
              <FiShoppingCart className="text-white text-xl" />
              <h3 className="text-lg font-semibold text-white">Current Bill</h3>
              <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm text-white">{cart.length} items</span>
            </div>
          </div>
          
          <div className="p-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center mb-4">
                  <FiShoppingCart className="text-4xl text-red-500" />
                </div>
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cart is empty</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Click on services to add</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[350px] overflow-y-auto mb-4 pr-2">
                  {cart.map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-500 font-bold text-sm">{idx + 1}</span>
                        </div>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rs. {item.price.toLocaleString()} each</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-lg px-2 py-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className={`w-8 text-center font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <p className={`font-bold text-red-500 min-w-[80px] text-right`}>
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </p>
                        <button 
                          onClick={() => removeFromBill(item.id)} 
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition flex items-center justify-center"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t-2 dark:border-gray-700 space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Items:</span>
                    <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t dark:border-gray-700">
                    <span className={`text-2xl font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Amount:</span>
                    <span className="text-3xl font-bold text-red-500">Rs. {billTotal.toLocaleString()}</span>
                  </div>

                  {/* Payment Section */}
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} mt-4`}>
                    <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FiCreditCard className="text-red-500" /> Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Amount (Rs.)</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none transition ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="cash">💵 Cash</option>
                          <option value="card">💳 Credit/Debit Card</option>
                          <option value="bank">🏦 Bank Transfer</option>
                          <option value="online">📱 Mobile Wallet</option>
                        </select>
                      </div>
                    </div>
                    
                    {paidAmount > 0 && (
                      <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        <div className="flex justify-between py-2">
                          <span>Paid Amount:</span>
                          <span className="text-green-600 font-semibold text-lg">Rs. {paidAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span>Remaining:</span>
                          <span className={`font-semibold text-lg ${remainingAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            Rs. {remainingAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span>Status:</span>
                          <span className={`font-semibold flex items-center gap-2 ${isFullyPaid ? 'text-green-600' : 'text-orange-500'}`}>
                            {isFullyPaid ? <FiCheckCircle /> : <FiAlertCircle />}
                            {isFullyPaid ? 'FULLY PAID' : 'PARTIAL PAYMENT'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={handlePayment} className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FiDollarSign /> PAY NOW
                    </button>
                    <button onClick={printBill} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FiPrinter /> PRINT
                    </button>
                    <button onClick={exportToExcel} className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FiFileText /> EXCEL
                    </button>
                    <button onClick={exportToPDF} className="px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2">
                      <FiDownload /> PDF
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingInvoice;