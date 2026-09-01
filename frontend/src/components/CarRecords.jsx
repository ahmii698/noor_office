// src/components/CarRecords.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiFileText, FiCalendar, FiUser, 
  FiTruck, FiPrinter, FiEye, FiDownload, FiX, FiRefreshCw,
  FiClock, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logo from '/logo.jpg';
import api from '../services/api';

const CarRecords = ({ darkMode }) => {
  // ✅ State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [specificDate, setSpecificDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // ✅ Fetch records from API
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const purchaseRes = await api.get('/car-purchases');
      const purchases = purchaseRes.data?.data || [];
      
      let sales = [];
      try {
        const sellRes = await api.get('/car-sells');
        sales = sellRes.data?.data || [];
      } catch (e) {
        console.log('Car sales endpoint not available yet');
      }

      const allRecords = [
        ...purchases.map(p => ({
          id: p.id,
          type: 'purchase',
          date: p.purchase_date || p.created_at,
          name: p.customer_name,
          phone: p.phone_no,
          carMake: p.make,
          carModel: p.model,
          carYear: p.year || 'N/A',
          regNo: p.reg_no,
          color: p.color,
          mileage: p.running,
          price: parseFloat(p.purchase_price) || 0,
          sellingPrice: parseFloat(p.selling_price) || 0,
          engineNo: p.engine_no,
          vin: p.vin,
          notes: p.dent || p.notes
        })),
        ...sales.map(s => ({
          id: s.id,
          type: 'sell',
          date: s.sell_date || s.created_at,
          name: s.customer_name,
          phone: s.phone_no,
          carMake: s.make,
          carModel: s.model,
          carYear: s.year || 'N/A',
          regNo: s.reg_no,
          color: s.color,
          mileage: s.running,
          price: parseFloat(s.selling_price) || 0,
          purchasePrice: parseFloat(s.purchase_price) || 0,
          engineNo: s.engine_no,
          vin: s.vin,
          notes: s.dent || s.notes
        }))
      ];

      allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(allRecords);
    } catch (error) {
      console.error('Error fetching car records:', error);
      toast.error('Failed to load car records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // ✅ Date Filter Functions
  const getDateRange = (filter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from = new Date(today);
    let to = new Date(today);

    switch (filter) {
      case 'today':
        from = new Date(today);
        to = new Date(today);
        break;
      case 'week':
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        to = new Date(today);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(today);
        break;
      case 'year':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(today);
        break;
      case 'specific':
        if (specificDate) {
          const date = new Date(specificDate);
          from = new Date(date);
          to = new Date(date);
        }
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          from = new Date(customDateRange.from);
          to = new Date(customDateRange.to);
        }
        break;
      default:
        return null;
    }
    return { from, to };
  };

  const isDateInRange = (dateStr, filter) => {
    if (filter === 'all') return true;
    const date = new Date(dateStr);
    const range = getDateRange(filter);
    if (!range) return true;
    const { from, to } = range;
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    return dateStart >= fromStart && dateStart <= toEnd;
  };

  const getDateLabel = () => {
    const labels = {
      all: '📅 All Time',
      today: '📅 Today',
      week: '📅 This Week',
      month: '📅 This Month',
      year: '📅 This Year',
      specific: '📅 Specific Date',
      custom: '📅 Custom Range'
    };
    return labels[dateFilter] || '📅 All Time';
  };

  // ✅ Filter records
  const filteredRecords = records.filter(r => {
    const matchSearch = 
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.carMake?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.carModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.regNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone?.includes(searchTerm);
    
    const matchType = filterType === 'all' || r.type === filterType;
    const matchDate = isDateInRange(r.date, dateFilter);
    
    return matchSearch && matchType && matchDate;
  });

  // ✅ Stats
  const totalPurchases = records.filter(r => r.type === 'purchase').length;
  const totalSales = records.filter(r => r.type === 'sell').length;
  const totalPurchaseAmount = records.filter(r => r.type === 'purchase').reduce((sum, r) => sum + r.price, 0);
  const totalSaleAmount = records.filter(r => r.type === 'sell').reduce((sum, r) => sum + r.price, 0);
  const profit = totalSaleAmount - totalPurchaseAmount;

  // ✅ Filtered Stats (for display)
  const filteredTotal = filteredRecords.reduce((sum, r) => sum + r.price, 0);
  const filteredPurchases = filteredRecords.filter(r => r.type === 'purchase');
  const filteredSales = filteredRecords.filter(r => r.type === 'sell');
  const filteredPurchaseTotal = filteredPurchases.reduce((sum, r) => sum + r.price, 0);
  const filteredSaleTotal = filteredSales.reduce((sum, r) => sum + r.price, 0);
  const filteredProfit = filteredSaleTotal - filteredPurchaseTotal;

  // ✅ Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);

  // ✅ Format functions
  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // ✅ View record
  const viewRecord = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  // ✅ Export to Excel
  const exportToExcel = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }
    const data = records.map(r => ({
      'Type': r.type === 'purchase' ? 'Purchase' : 'Sell',
      'Date': formatDate(r.date),
      'Name': r.name,
      'Phone': r.phone || 'N/A',
      'Make': r.carMake,
      'Model': r.carModel,
      'Registration': r.regNo || 'N/A',
      'Color': r.color || 'N/A',
      'Mileage': r.mileage || 'N/A',
      'Price': r.price,
      'Notes': r.notes || 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Car Records');
    XLSX.writeFile(wb, 'Car_Records.xlsx');
    toast.success('Exported to Excel');
  };

  // ✅ Export to PDF
  const exportToPDF = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.text('Car Records', 14, 10);
    doc.autoTable({
      head: [['Type', 'Date', 'Name', 'Make', 'Model', 'Registration', 'Price']],
      body: records.map(r => [
        r.type === 'purchase' ? 'Purchase' : 'Sell',
        formatDate(r.date),
        r.name,
        r.carMake,
        r.carModel,
        r.regNo || 'N/A',
        `Rs. ${r.price.toLocaleString()}`
      ])
    });
    doc.save('Car_Records.pdf');
    toast.success('Exported to PDF');
  };

  // ✅ Print record
  const printRecord = (record) => {
    toast.success('Print preview opened');
    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      toast.error('Please allow popups');
      return;
    }
    const typeLabel = record.type === 'purchase' ? 'Purchase' : 'Sale';
    const color = record.type === 'purchase' ? '#dc2626' : '#16a34a';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Car ${typeLabel} Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid ${color}; padding-bottom: 15px; }
          .logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
          .shop-name { font-size: 22px; font-weight: bold; color: #1f2937; }
          .type-badge { display: inline-block; padding: 3px 15px; border-radius: 20px; color: white; background: ${color}; font-weight: bold; margin-top: 5px; }
          .details { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total { font-size: 20px; font-weight: bold; color: ${color}; text-align: right; margin-top: 15px; border-top: 2px solid #e5e7eb; padding-top: 15px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo" />
            <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
            <div class="type-badge">${typeLabel.toUpperCase()}</div>
          </div>
          <div class="details">
            <div class="row"><strong>Date:</strong> ${formatDate(record.date)}</div>
            <div class="row"><strong>${record.type === 'purchase' ? 'Seller' : 'Buyer'}:</strong> ${record.name}</div>
            <div class="row"><strong>Phone:</strong> ${record.phone || 'N/A'}</div>
            <div class="row"><strong>Make:</strong> ${record.carMake}</div>
            <div class="row"><strong>Model:</strong> ${record.carModel}</div>
            <div class="row"><strong>Registration:</strong> ${record.regNo || 'N/A'}</div>
            <div class="row"><strong>VIN:</strong> ${record.vin || 'N/A'}</div>
            <div class="row"><strong>Color:</strong> ${record.color || 'N/A'}</div>
            <div class="row"><strong>Mileage:</strong> ${record.mileage || 'N/A'} km</div>
            <div class="row"><strong>Engine No:</strong> ${record.engineNo || 'N/A'}</div>
          </div>
          <div class="total">${typeLabel} Price: Rs. ${record.price.toLocaleString()}</div>
          ${record.notes ? `<div style="margin-top:10px;padding:10px;background:#fef3c7;border-radius:5px;"><strong>Notes:</strong> ${record.notes}</div>` : ''}
          <div class="footer">Shop # 02, Gulshan-e-Iqbal, Karachi | 📞 0337 3267363</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // ✅ Refresh data
  const refreshData = () => {
    fetchRecords();
    toast.success('Refreshed!');
  };

  // ✅ Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setDateFilter('all');
    setCustomDateRange({ from: '', to: '' });
    setSpecificDate('');
    setCurrentPage(1);
    toast.success('Filters reset');
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-lg" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🚗 Car Records</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Complete history of car purchases and sales</p>
              </div>
            </div>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 shadow-md"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ✅ Stats Cards - 6 Cards only */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Records</p>
            <p className="text-2xl font-bold text-blue-500">{records.length}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purchases</p>
            <p className="text-2xl font-bold text-green-500">{totalPurchases}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sales</p>
            <p className="text-2xl font-bold text-red-500">{totalSales}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Purchase</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalPurchaseAmount)}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Sale</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalSaleAmount)}</p>
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Profit/Loss</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
        </div>

        {/* ✅ Filters - Directly after stats */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search by name, make, registration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
            >
              <option value="all">All Types</option>
              <option value="purchase">📥 Purchases</option>
              <option value="sell">📤 Sales</option>
            </select>

            {/* ✅ Date Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className={`px-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition flex items-center gap-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
              >
                <FiCalendar /> {getDateLabel()} {showDateDropdown ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {showDateDropdown && (
                <div className={`absolute top-full left-0 mt-1 rounded-xl shadow-2xl border z-50 min-w-[220px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button
                    onClick={() => {
                      setDateFilter('all');
                      setShowDateDropdown(false);
                      setSpecificDate('');
                      setCustomDateRange({ from: '', to: '' });
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 ${
                      dateFilter === 'all' ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
                    }`}
                  >
                    📅 All Time
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('today');
                      setShowDateDropdown(false);
                      setSpecificDate('');
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 ${
                      dateFilter === 'today' ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
                    }`}
                  >
                    📅 Today
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('week');
                      setShowDateDropdown(false);
                      setSpecificDate('');
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 ${
                      dateFilter === 'week' ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
                    }`}
                  >
                    📅 This Week
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('month');
                      setShowDateDropdown(false);
                      setSpecificDate('');
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 ${
                      dateFilter === 'month' ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
                    }`}
                  >
                    📅 This Month
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('year');
                      setShowDateDropdown(false);
                      setSpecificDate('');
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 ${
                      dateFilter === 'year' ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''
                    }`}
                  >
                    📅 This Year
                  </button>
                  
                  {/* Specific Date */}
                  <div className="px-4 py-3 border-t dark:border-gray-700">
                    <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>📅 Specific Date</p>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className={`flex-1 px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (specificDate) {
                          setDateFilter('specific');
                          setShowDateDropdown(false);
                          toast.success(`Showing records for ${formatDate(specificDate)}`);
                        } else {
                          toast.error('Please select a date');
                        }
                      }}
                      className="w-full mt-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                    >
                      Apply Date
                    </button>
                  </div>
                  
                  {/* Custom Range */}
                  <div className="px-4 py-3 border-t dark:border-gray-700">
                    <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>📅 Custom Range</p>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDateRange.from}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className={`flex-1 px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                      />
                      <input
                        type="date"
                        value={customDateRange.to}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className={`flex-1 px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (customDateRange.from && customDateRange.to) {
                          setDateFilter('custom');
                          setShowDateDropdown(false);
                          toast.success('Custom date range applied');
                        } else {
                          toast.error('Please select both dates');
                        }
                      }}
                      className="w-full mt-2 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                    >
                      Apply Range
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2 shadow-md">
              <FiFileText /> Excel
            </button>
            <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center gap-2 shadow-md">
              <FiDownload /> PDF
            </button>
            <button 
              onClick={resetFilters} 
              className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition flex items-center gap-2"
            >
              <FiRefreshCw /> Reset
            </button>
          </div>
          
          {/* ✅ Filter Summary */}
          {filteredRecords.length !== records.length && (
            <div className={`mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {filteredRecords.length} of {records.length} records • 
              Purchases: {filteredPurchases.length} • 
              Sales: {filteredSales.length} • 
              Total: {formatCurrency(filteredTotal)} • 
              {filteredProfit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(filteredProfit)}
            </div>
          )}
        </div>

        {/* ✅ Table */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Make</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Reg No</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="text-6xl mb-4">🚗</div>
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No car records found</p>
                    </td>
                  </tr>
                ) : (
                  currentRecords.map((record) => (
                    <tr key={record.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.type === 'purchase' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {record.type === 'purchase' ? '📥 Purchase' : '📤 Sell'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 font-medium">{record.name}</td>
                      <td className="px-4 py-3 text-sm">{record.carMake}</td>
                      <td className="px-4 py-3 text-sm">{record.carModel}</td>
                      <td className="px-4 py-3 text-sm">{record.regNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">
                        {formatCurrency(record.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => viewRecord(record)}
                            className="p-1.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
                            title="View Details"
                          >
                            <FiEye size={14} />
                          </button>
                          <button
                            onClick={() => printRecord(record)}
                            className="p-1.5 rounded bg-gray-800 text-white hover:bg-gray-700 transition"
                            title="Print"
                          >
                            <FiPrinter size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && records.length > 0 && (
                <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <td colSpan="6" className="px-4 py-3 text-right font-bold">Total:</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">
                      {formatCurrency(currentRecords.reduce((sum, r) => sum + r.price, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t flex justify-between items-center flex-wrap gap-3">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRecords.length)} of {filteredRecords.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ◀
                </button>
                <span className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium">{currentPage}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center sticky top-0 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedRecord.type === 'purchase' ? '📥 Purchase' : '📤 Sale'} Details
              </h3>
              <button onClick={() => { setIsModalOpen(false); setSelectedRecord(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type</p>
                  <p className={`font-semibold ${selectedRecord.type === 'purchase' ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedRecord.type === 'purchase' ? 'Purchase' : 'Sale'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</p>
                  <p className="font-semibold">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedRecord.type === 'purchase' ? 'Seller' : 'Buyer'}
                  </p>
                  <p className="font-semibold">{selectedRecord.name}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                  <p className="font-semibold">{selectedRecord.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Make</p>
                  <p className="font-semibold">{selectedRecord.carMake}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Model</p>
                  <p className="font-semibold">{selectedRecord.carModel}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Registration</p>
                  <p className="font-semibold">{selectedRecord.regNo || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>VIN</p>
                  <p className="font-semibold">{selectedRecord.vin || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Color</p>
                  <p className="font-semibold">{selectedRecord.color || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mileage</p>
                  <p className="font-semibold">{selectedRecord.mileage || 'N/A'} km</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Engine No</p>
                  <p className="font-semibold">{selectedRecord.engineNo || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Price</p>
                  <p className={`text-2xl font-bold ${selectedRecord.type === 'purchase' ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(selectedRecord.price)}
                  </p>
                </div>
                {selectedRecord.notes && (
                  <div className="col-span-2">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notes</p>
                    <p className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => printRecord(selectedRecord)}
                  className="flex-1 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition flex items-center justify-center gap-2"
                >
                  <FiPrinter /> Print
                </button>
                <button
                  onClick={() => { setIsModalOpen(false); setSelectedRecord(null); }}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <FiX /> Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarRecords;