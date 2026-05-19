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
  FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const BillingInvoice = ({ services, products, setProducts, invoices, setInvoices, customerDetails, darkMode }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {});

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
    toast.success(`${service.name} added`);
  };

  const removeFromBill = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Removed from bill');
  };

  const billTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const paidAmount = parseFloat(paymentAmount) || 0;
  const remainingAmount = billTotal - paidAmount;
  const isFullyPaid = remainingAmount <= 0;

  const printBill = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Noorani Car AC - Invoice</title>
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
              <thead><tr><th>#</th><th>Service</th><th>Category</th><th>Price (PKR)</th></tr></thead>
              <tbody>
                ${cart.map((item, idx) => `<tr><td>${idx+1}</td><td>${item.name}</td><td>${item.category}</td><td>Rs. ${item.price.toLocaleString()}</td></tr>`).join('')}
              </tbody>
            </table>
            <div class="payment-details">
              <h4>PAYMENT DETAILS</h4>
              <p><strong>Total Amount:</strong> Rs. ${billTotal.toLocaleString()}</p>
              <p><strong>Paid Amount:</strong> Rs. ${paidAmount.toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
              <p><strong>Remaining Balance:</strong> Rs. ${remainingAmount.toLocaleString()}</p>
              <p><strong>Payment Status:</strong> ${isFullyPaid ? 'FULLY PAID' : 'PENDING'}</p>
            </div>
            <div class="total-row">Total Amount: Rs. ${billTotal.toLocaleString()}</div>
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
        'Category': item.category,
        'Price': `Rs. ${item.price.toLocaleString()}`
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
      head: [['#', 'Service', 'Category', 'Price']],
      body: cart.map((item, idx) => [idx + 1, item.name, item.category, `Rs. ${item.price.toLocaleString()}`]),
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
    
    // Stock minus karo
    const updatedProducts = products.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        const newQuantity = product.quantity - 1;
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
      items: [...cart],
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
    
    toast.success(`Payment successful! ${isFullyPaid ? 'Bill fully paid' : 'Partial payment received'}`);
  };

  return (
    <div className="space-y-6">
      {/* Customer Summary - Red/Black Theme */}
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <FiUser className="text-red-500 text-xl" />
          </div>
          <div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Billing for</p>
            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{customerDetails.name} - {customerDetails.carNumber}</p>
          </div>
        </div>
      </div>

      {/* Services and Bill Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Section - Red Theme Header */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-red-500">
            <div className="flex items-center gap-2">
              <FiTool className="text-white text-xl" />
              <h3 className="text-lg font-semibold text-white">Available Services</h3>
            </div>
            <p className="text-xs text-red-100 mt-1">Click on any service to add to bill</p>
          </div>
          <div className={`p-4 max-h-[500px] overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {Object.keys(groupedServices).map(category => (
              <div key={category} className="mb-3">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className={`w-full flex justify-between items-center p-3 rounded-xl transition ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <span className="font-semibold flex items-center gap-2">
                    <FiPackage className="text-sm" /> {category}
                  </span>
                  <span className="text-gray-500">{expandedCategory === category ? <FiChevronUp /> : <FiChevronDown />}</span>
                </button>
                {expandedCategory === category && (
                  <div className="mt-2 space-y-2 ml-4">
                    {groupedServices[category].map(service => {
                      const stock = getProductStock(service.id);
                      const isOutOfStock = stock <= 0;
                      return (
                        <div 
                          key={service.id} 
                          onClick={() => !isOutOfStock && addToBill(service)}
                          className={`flex justify-between items-center p-3 rounded-xl transition ${
                            isOutOfStock 
                              ? 'opacity-50 cursor-not-allowed'
                              : darkMode 
                                ? 'bg-gray-800 hover:bg-gray-700 cursor-pointer' 
                                : 'bg-gray-50 hover:bg-red-50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{service.icon}</div>
                            <div>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {service.name}
                              </span>
                              {isOutOfStock && (
                                <span className="ml-2 text-xs text-red-500 flex items-center gap-1">
                                  <FiAlertCircle className="text-xs" /> (Out of Stock)
                                </span>
                              )}
                              {stock < 5 && stock > 0 && (
                                <span className="ml-2 text-xs text-yellow-500">(Only {stock} left)</span>
                              )}
                            </div>
                          </div>
                          <span className="text-red-500 font-bold text-lg">Rs. {service.price.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bill Section - Red Theme Header */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="px-6 py-4 bg-red-500">
            <div className="flex items-center gap-2">
              <FiShoppingCart className="text-white text-xl" />
              <h3 className="text-lg font-semibold text-white">Current Bill</h3>
            </div>
            <p className="text-xs text-red-100 mt-1">{cart.length} service(s) added</p>
          </div>
          <div className="p-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <FiShoppingCart className="text-7xl mx-auto text-gray-400" />
                <p className={`mt-4 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No services added yet</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Click on any service to add to bill</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                  {cart.map((item, idx) => (
                    <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-300 text-gray-700'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Rs. {item.price.toLocaleString()}
                        </span>
                        <button 
                          onClick={() => removeFromBill(item.id)} 
                          className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white transition flex items-center justify-center"
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <FiPackage className="text-sm" /> Total Items:
                    </span>
                    <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cart.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <FiDollarSign className="text-xl" /> Total Amount:
                    </span>
                    <span className="text-2xl font-bold text-red-500">Rs. {billTotal.toLocaleString()}</span>
                  </div>

                  {/* Payment Section */}
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FiCreditCard className="text-sm text-red-500" /> Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Amount</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${
                            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none ${
                            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="online">Online Payment</option>
                        </select>
                      </div>
                    </div>
                    
                    {paidAmount > 0 && (
                      <div className="mt-3 pt-3 border-t dark:border-gray-700">
                        <div className="flex justify-between text-sm">
                          <span>Paid:</span>
                          <span className="text-green-500 font-semibold">Rs. {paidAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Remaining:</span>
                          <span className={`font-semibold ${remainingAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            Rs. {remainingAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Status:</span>
                          <span className={`font-semibold flex items-center gap-1 ${isFullyPaid ? 'text-green-500' : 'text-red-500'}`}>
                            {isFullyPaid ? <FiCheckCircle /> : <FiAlertCircle />}
                            {isFullyPaid ? 'FULLY PAID' : 'PARTIAL'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handlePayment} className="px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition shadow-lg flex items-center justify-center gap-2">
                      <FiDollarSign /> PAY NOW
                    </button>
                    <button onClick={printBill} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition shadow-lg flex items-center justify-center gap-2">
                      <FiPrinter /> PRINT BILL
                    </button>
                    <button onClick={exportToExcel} className="px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2">
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