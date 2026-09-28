// src/components/CarSell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FiSave, FiUser, FiPhone, FiMapPin, FiDollarSign, 
  FiCalendar, FiTruck, FiFileText, FiPrinter, FiRefreshCw, 
  FiHash, FiTag, FiSearch, FiX, FiDownload, FiFileText as FiFileIcon,
  FiTrendingUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import logo from '/logo.jpg';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CarSell = ({ darkMode }) => {
  const [formData, setFormData] = useState({
    sellDate: new Date().toISOString().split('T')[0],
    customerName: '',
    phoneNo: '',
    purchasePrice: '',
    sellingPrice: '',
    make: '',
    model: '',
    vin: '',
    engineNo: '',
    color: '',
    regNo: '',
    running: '',
    dent: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ Search related states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [purchasedCars, setPurchasedCars] = useState([]);
  const searchRef = useRef(null);

  // ✅ Saved sales state
  const [savedSales, setSavedSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Fetch all purchased cars and sales on load
  useEffect(() => {
    fetchPurchasedCars();
    fetchSales();
  }, []);

  // ✅ Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Fetch purchased cars from API
  const fetchPurchasedCars = async () => {
    try {
      const response = await api.get('/car-purchases');
      if (response.data?.success) {
        setPurchasedCars(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  // ✅ Fetch saved sales from API
  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/car-sells');
      if (response.data?.success) {
        setSavedSales(response.data.data || []);
      } else {
        setSavedSales([]);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSavedSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Search function
  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    const searchLower = value.toLowerCase().trim();
    
    const results = purchasedCars.filter(car => {
      const nameMatch = car.customer_name?.toLowerCase().includes(searchLower);
      const phoneMatch = car.phone_no?.includes(searchLower);
      const makeMatch = car.make?.toLowerCase().includes(searchLower);
      const regMatch = car.reg_no?.toLowerCase().includes(searchLower);
      
      return nameMatch || phoneMatch || makeMatch || regMatch;
    });

    setSearchResults(results);
    setShowSuggestions(results.length > 0);
    setIsSearching(false);
  };

  // ✅ Select a customer - Auto-fill form (purchase price bhi auto-fill hoga)
  const selectCustomer = (car) => {
    setFormData({
      sellDate: new Date().toISOString().split('T')[0],
      customerName: car.customer_name || '',
      phoneNo: car.phone_no || '',
      purchasePrice: car.purchase_price ?? '',
      sellingPrice: '',
      make: car.make || '',
      model: car.model || '',
      vin: car.vin || '',
      engineNo: car.engine_no || '',
      color: car.color || '',
      regNo: car.reg_no || '',
      running: car.running || '',
      dent: car.dent || ''
    });
    
    setSearchTerm(car.customer_name || '');
    setShowSuggestions(false);
    toast.success(`✅ Loaded: ${car.customer_name} - ${car.make} ${car.model}`);
  };

  // ✅ Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ Profit = Selling Price - Purchase Price
  const profit = (parseFloat(formData.sellingPrice) || 0) - (parseFloat(formData.purchasePrice) || 0);
  const hasProfitInputs = formData.sellingPrice !== '' && formData.purchasePrice !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.make || !formData.model || !formData.sellingPrice) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sellDate: formData.sellDate,
        customerName: formData.customerName,
        phoneNo: formData.phoneNo,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice),
        profit: profit,
        make: formData.make,
        model: formData.model,
        vin: formData.vin,
        engineNo: formData.engineNo,
        color: formData.color,
        regNo: formData.regNo,
        running: parseFloat(formData.running) || 0,
        dent: formData.dent,
        type: 'sell'
      };

      const response = await api.post('/car-sells', payload);

      if (response.data?.success) {
        toast.success('✅ Car sold successfully!');
        await fetchSales(); // Refresh the list
        
        setFormData({
          sellDate: new Date().toISOString().split('T')[0],
          customerName: '',
          phoneNo: '',
          purchasePrice: '',
          sellingPrice: '',
          make: '',
          model: '',
          vin: '',
          engineNo: '',
          color: '',
          regNo: '',
          running: '',
          dent: ''
        });
        setSearchTerm('');
        clearSearch();
      } else {
        toast.error(response.data?.message || 'Failed to save sale');
      }
      
    } catch (error) {
      console.error('Error saving sell:', error);
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0][0];
        toast.error(firstError);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to save sale. Check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!formData.customerName || !formData.make || !formData.model) {
      toast.error('Please fill required fields first');
      return;
    }
    
    toast.success('Print preview opened');
    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      toast.error('Please allow popups');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Car Sale Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 15px; }
          .logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
          .shop-name { font-size: 22px; font-weight: bold; color: #1f2937; }
          .details { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total { font-size: 20px; font-weight: bold; color: #16a34a; text-align: right; margin-top: 15px; border-top: 2px solid #e5e7eb; padding-top: 15px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          .section-title { font-weight: bold; font-size: 14px; margin-top: 10px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo" />
            <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
            <div style="font-size:13px;color:#6b7280;">🚘 Car Sale Receipt</div>
          </div>
          <div class="details">
            <div class="section-title">CUSTOMER DETAILS</div>
            <div class="row"><strong>Name:</strong> ${formData.customerName || 'N/A'}</div>
            <div class="row"><strong>Phone:</strong> ${formData.phoneNo || 'N/A'}</div>
            <div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
              <strong>Purchase Price:</strong> <span>Rs. ${(parseFloat(formData.purchasePrice) || 0).toLocaleString()}</span>
            </div>
            <div class="row">
              <strong>Sale Price:</strong> <span style="color:#16a34a;font-weight:bold;">Rs. ${(parseFloat(formData.sellingPrice) || 0).toLocaleString()}</span>
            </div>
            <div class="row" style="margin-top:4px;">
              <strong>Profit:</strong> <span style="color:${profit >= 0 ? '#16a34a' : '#dc2626'};font-weight:bold;">Rs. ${profit.toLocaleString()}</span>
            </div>
            
            <div class="section-title" style="margin-top:15px;">VEHICLE DETAILS</div>
            <div class="row"><strong>Make:</strong> ${formData.make || 'N/A'}</div>
            <div class="row"><strong>Model:</strong> ${formData.model || 'N/A'}</div>
            <div class="row"><strong>Registration:</strong> ${formData.regNo || 'N/A'}</div>
            <div class="row"><strong>VIN:</strong> ${formData.vin || 'N/A'}</div>
            <div class="row"><strong>Engine No:</strong> ${formData.engineNo || 'N/A'}</div>
            <div class="row"><strong>Color:</strong> ${formData.color || 'N/A'}</div>
            <div class="row"><strong>Running:</strong> ${formData.running || 'N/A'} km</div>
            <div class="row"><strong>Dent:</strong> ${formData.dent || 'None'}</div>
            <div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
              <strong>Date:</strong> ${formData.sellDate}</div>
          </div>
          <div class="footer">Shop # 02, Gulshan-e-Iqbal, Karachi | 📞 0337 3267363</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // ========== EXCEL EXPORT ==========
  const exportToExcel = () => {
    if (savedSales.length === 0) {
      toast.error('No saved sales to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(savedSales.map(s => {
      const purchase = parseFloat(s.purchase_price) || 0;
      const sale = parseFloat(s.selling_price) || 0;
      return {
        'Date': s.sell_date ? new Date(s.sell_date).toLocaleDateString() : 'N/A',
        'Customer Name': s.customer_name || 'N/A',
        'Phone': s.phone_no || 'N/A',
        'Make': s.make || 'N/A',
        'Model': s.model || 'N/A',
        'VIN': s.vin || 'N/A',
        'Engine No': s.engine_no || 'N/A',
        'Color': s.color || 'N/A',
        'Reg No': s.reg_no || 'N/A',
        'Running (km)': s.running || 'N/A',
        'Purchase Price': `Rs. ${purchase.toLocaleString()}`,
        'Sale Price': `Rs. ${sale.toLocaleString()}`,
        'Profit': `Rs. ${(s.profit ?? (sale - purchase)).toLocaleString()}`,
        'Dent': s.dent || 'None'
      };
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Car Sales');
    XLSX.writeFile(wb, `Car_Sales_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel!');
  };

  // ========== PDF EXPORT ==========
  const exportToPDF = () => {
    if (savedSales.length === 0) {
      toast.error('No saved sales to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text('Car Sales Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = savedSales.map(s => {
      const purchase = parseFloat(s.purchase_price) || 0;
      const sale = parseFloat(s.selling_price) || 0;
      const rowProfit = s.profit ?? (sale - purchase);
      return [
        s.sell_date ? new Date(s.sell_date).toLocaleDateString() : 'N/A',
        s.customer_name || 'N/A',
        s.phone_no || 'N/A',
        s.make || 'N/A',
        s.model || 'N/A',
        s.reg_no || 'N/A',
        s.color || 'N/A',
        s.running || 'N/A',
        `Rs. ${purchase.toLocaleString()}`,
        `Rs. ${sale.toLocaleString()}`,
        `Rs. ${rowProfit.toLocaleString()}`
      ];
    });

    doc.autoTable({
      head: [['Date', 'Customer', 'Phone', 'Make', 'Model', 'Reg No', 'Color', 'Running', 'Purchase Price', 'Sale Price', 'Profit']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [22, 163, 74] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 22 },
        2: { cellWidth: 20 },
        8: { cellWidth: 24 },
        9: { cellWidth: 24 },
        10: { cellWidth: 24 }
      }
    });

    doc.save(`Car_Sales_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF!');
  };

  const resetForm = () => {
    setFormData({
      sellDate: new Date().toISOString().split('T')[0],
      customerName: '',
      phoneNo: '',
      purchasePrice: '',
      sellingPrice: '',
      make: '',
      model: '',
      vin: '',
      engineNo: '',
      color: '',
      regNo: '',
      running: '',
      dent: ''
    });
    setSearchTerm('');
    clearSearch();
    toast.success('Form reset');
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen p-6`}>
      <div className="max-w-4xl mx-auto">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} className="w-16 h-16 rounded-full object-cover border-2 border-green-500 shadow-lg" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🚘 Car Sell</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Record car sale details</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* ✅ Excel & PDF Buttons */}
              <button
                onClick={exportToExcel}
                disabled={savedSales.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } ${savedSales.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiFileIcon size={14} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={savedSales.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } ${savedSales.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiDownload size={14} /> PDF
              </button>
              <button
                onClick={fetchSales}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <FiRefreshCw className={isLoading ? 'animate-spin' : ''} size={14} /> 
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Saved Sales Count */}
        {savedSales.length > 0 && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                📋 Total Sales: <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{savedSales.length}</strong>
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Click Excel or PDF to export all
              </span>
            </div>
          </div>
        )}

        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          
          {/* ✅ SEARCH BAR - Customer Search */}
          <div className="mb-6" ref={searchRef}>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <FiSearch className="inline mr-1" /> Search Customer by Name or Phone
            </label>
            <div className="relative">
              <div className="relative">
                <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => {
                    if (searchTerm.trim().length >= 2 && searchResults.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Search by name, phone, make, or registration..."
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <FiX />
                  </button>
                )}
              </div>

              {/* ✅ Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className={`absolute z-50 w-full mt-1 rounded-xl shadow-2xl border max-h-80 overflow-y-auto ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  {searchResults.map((car) => (
                    <button
                      key={car.id}
                      onClick={() => selectCustomer(car)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition flex items-center justify-between ${darkMode ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-50 border-gray-100'}`}
                    >
                      <div>
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {car.customer_name}
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          📞 {car.phone_no || 'N/A'} | 🚗 {car.make} {car.model} | {car.reg_no || 'N/A'}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        Purchased: Rs. {car.purchase_price?.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
                <div className={`absolute z-50 w-full mt-1 rounded-xl shadow-2xl border p-4 text-center ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                  No customer found with "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          {/* ✅ Divider */}
          <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6 pt-4`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-center`}>
              {formData.customerName ? '✏️ Edit details below or continue' : '📝 Enter sale details below'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sale Date */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiCalendar className="inline mr-1" /> Date *
                </label>
                <input
                  type="date"
                  name="sellDate"
                  value={formData.sellDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

              {/* Customer Name (Buyer) */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiUser className="inline mr-1" /> Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Enter buyer name"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

              {/* Phone No */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiPhone className="inline mr-1" /> Phone No
                </label>
                <input
                  type="text"
                  name="phoneNo"
                  value={formData.phoneNo}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiDollarSign className="inline mr-1" /> Purchase Price (Rs.)
                </label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  placeholder="Cost at which car was bought"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiDollarSign className="inline mr-1" /> Sale Price * (Rs.)
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  placeholder="Enter sale price"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

              {/* Profit (auto-calculated, read-only) */}
              {hasProfitInputs && (
                <div className="md:col-span-2">
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
                    profit >= 0
                      ? (darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300')
                      : (darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300')
                  }`}>
                    <span className={`text-sm font-medium flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <FiTrendingUp /> Profit
                    </span>
                    <span className={`font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Rs. {profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Make */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiTruck className="inline mr-1" /> Make *
                </label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  placeholder="e.g., Toyota, Honda, Suzuki"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

              {/* Model */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Model *
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g., Civic, Corolla, Alto"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

              {/* VIN */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiHash className="inline mr-1" /> VIN
                </label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  placeholder="Vehicle Identification Number"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Engine No */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiHash className="inline mr-1" /> Engine No
                </label>
                <input
                  type="text"
                  name="engineNo"
                  value={formData.engineNo}
                  onChange={handleChange}
                  placeholder="Enter engine number"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Color */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="e.g., Black, White, Silver"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Registration No */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiMapPin className="inline mr-1" /> Registration No
                </label>
                <input
                  type="text"
                  name="regNo"
                  value={formData.regNo}
                  onChange={handleChange}
                  placeholder="e.g., ABC-1234"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Running (km) */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Running (km)
                </label>
                <input
                  type="number"
                  name="running"
                  value={formData.running}
                  onChange={handleChange}
                  placeholder="Enter mileage"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Dent - Full Width */}
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiFileText className="inline mr-1" /> Dent / Condition
                </label>
                <textarea
                  name="dent"
                  value={formData.dent}
                  onChange={handleChange}
                  placeholder="Describe any dents, scratches, or condition details..."
                  rows="3"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t dark:border-gray-700">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave />}
                {isSubmitting ? 'Saving...' : '💰 Sell Car'}
              </button>
              <button
                type="button"
                onClick={printReceipt}
                disabled={!formData.customerName || !formData.make || !formData.model}
                className={`py-3 px-6 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                  !formData.customerName || !formData.make || !formData.model ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                <FiPrinter /> Print
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="py-3 px-6 rounded-xl font-semibold transition flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
              >
                <FiRefreshCw /> Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CarSell;