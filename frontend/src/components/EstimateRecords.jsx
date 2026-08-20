// src/components/EstimateRecords.jsx
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
  FiEdit2, FiSave, FiUsers, FiEyeOff, FiTrash2, FiAlertTriangle,
  FiRefreshCw, FiMapPin
} from 'react-icons/fi';
import api from '../services/api';
import logo from '/logo.jpg';

const EstimateRecords = ({ darkMode }) => {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [singleDate, setSingleDate] = useState('');
  const [showSingleDate, setShowSingleDate] = useState(false);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [visibilityFilter, setVisibilityFilter] = useState('active');

  // Load hidden IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('noorani_hidden_estimates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHiddenIds(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading hidden estimates:', e);
    }
  }, []);

  // Save hidden IDs to localStorage
  const saveHiddenIds = (ids) => {
    try {
      localStorage.setItem('noorani_hidden_estimates', JSON.stringify(ids));
    } catch (e) {
      console.error('Error saving hidden estimates:', e);
    }
  };

  // Get today, week, month, year start dates
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

  // Fetch estimates
  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/estimates');
      if (response.data?.success) {
        setEstimates(response.data.data || []);
      } else if (Array.isArray(response.data)) {
        setEstimates(response.data);
      } else {
        setEstimates([]);
      }
    } catch (err) {
      console.error('Error fetching estimates:', err);
      setError('Failed to load estimates');
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || 0}`;
  };

  // Get status badge
  const getStatusBadge = (validUntil) => {
    if (!validUntil) return 'bg-gray-100 text-gray-700';
    const now = new Date();
    const validDate = new Date(validUntil);
    return validDate < now ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
  };

  const getStatusText = (validUntil) => {
    if (!validUntil) return 'Unknown';
    const now = new Date();
    const validDate = new Date(validUntil);
    return validDate < now ? 'Expired' : 'Active';
  };

  // Toggle hide
  const toggleHideEstimate = (id) => {
    setHiddenIds(prev => {
      let updated;
      if (prev.includes(id)) {
        updated = prev.filter(pid => pid !== id);
        toast.success('Estimate unhidden');
      } else {
        updated = [...prev, id];
        toast.success('Estimate hidden from this page');
      }
      saveHiddenIds(updated);
      return updated;
    });
  };

  // Delete estimate
  const handleDeleteEstimate = async (id, estimateNo) => {
    if (!window.confirm(`Delete estimate ${estimateNo} permanently?`)) return;

    try {
      await api.delete(`/estimates/${id}`);
      toast.success('Estimate deleted successfully');
      setHiddenIds(prev => {
        const updated = prev.filter(pid => pid !== id);
        saveHiddenIds(updated);
        return updated;
      });
      await fetchEstimates();
      if (selectedEstimate?.id === id) {
        setIsModalOpen(false);
        setSelectedEstimate(null);
      }
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast.error('Failed to delete estimate');
    }
  };

  // View estimate details
  const viewEstimateDetails = (estimate) => {
    setSelectedEstimate(estimate);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEstimate(null);
  };

  // ✅ Print single estimate - FIXED: EST. NO. and watermark visible
  const printSingleEstimate = () => {
    if (!selectedEstimate) return;

    setIsPrinting(true);
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      if (!printWindow) {
        toast.error('Please allow popups');
        setIsPrinting(false);
        return;
      }

      // ✅ FIX: Use estimate's creation time, not current time
      const estimateTime = selectedEstimate.created_at 
        ? new Date(selectedEstimate.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Karachi'
          })
        : new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Karachi'
          });

      const itemsHtml = selectedEstimate.items?.map((item, idx) => `
        <tr>
          <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: right;">Rs. ${(item.price || 0).toLocaleString()}</td>
          <td style="padding: 8px 10px; border: 1px solid #e5e7eb; text-align: right; font-weight:600;">Rs. ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
        </tr>
      `).join('') || `
        <tr>
          <td colspan="5" style="text-align:center;padding:30px;color:#9ca3af;">No items</td>
        </tr>
      `;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Estimate ${selectedEstimate.estimate_no}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
              .estimate-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; position: relative; }
              /* ✅ WATERMARK - MORE VISIBLE & FULL PAGE */
              .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-35deg);
                font-size: 160px;
                font-weight: 900;
                color: rgba(220, 38, 38, 0.15);
                letter-spacing: 35px;
                pointer-events: none;
                white-space: nowrap;
                z-index: 0;
                font-family: 'Segoe UI', Arial, sans-serif;
                text-transform: uppercase;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .header { background: white; padding: 20px 30px; border-bottom: 3px solid #dc2626; display: flex; align-items: center; gap: 20px; position: relative; z-index: 1; }
              .header-logo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #dc2626; flex-shrink: 0; }
              .header-text { flex: 1; text-align: center; }
              .header-text .shop-name { font-size: 24px; font-weight: bold; color: #1f2937; letter-spacing: 1px; }
              .header-text .subtitle { font-size: 13px; color: #6b7280; }
              .content { padding: 30px; position: relative; z-index: 1; background: transparent; }
              .section-title { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #dc2626; text-transform: uppercase; letter-spacing: 1px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 40px; margin-bottom: 25px; padding: 15px 20px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb; }
              .info-item { display: flex; padding: 4px 0; font-size: 13px; }
              .info-item .label { font-weight: 600; color: #4b5563; min-width: 100px; }
              .info-item .value { color: #1f2937; font-weight: 500; }
              .invoice-details { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 25px; padding: 12px 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e5e7eb; }
              .invoice-details .detail-item { text-align: center; }
              .invoice-details .detail-item .label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
              .invoice-details .detail-item .value { font-size: 14px; font-weight: 600; color: #1f2937; margin-top: 2px; }
              .invoice-details .detail-item .value.red { color: #dc2626; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
              th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; font-size: 13px; }
              th { background: #1f2937; color: white; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
              th:nth-child(1) { text-align: center; width: 50px; }
              th:nth-child(3) { text-align: center; width: 70px; }
              th:nth-child(4) { text-align: right; width: 120px; }
              th:nth-child(5) { text-align: right; width: 120px; }
              td:nth-child(1) { text-align: center; }
              td:nth-child(3) { text-align: center; }
              td:nth-child(4) { text-align: right; }
              td:nth-child(5) { text-align: right; }
              .total-row { margin-top: 20px; padding-top: 15px; border-top: 2px solid #dc2626; text-align: right; font-size: 20px; font-weight: 800; color: #dc2626; background: white; }
              .company-footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #dc2626; text-align: center; font-size: 13px; color: #1f2937; background: white; }
              .company-footer .address { font-weight: 700; font-size: 14px; color: #1f2937; margin-bottom: 6px; }
              .company-footer .phone { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
              .company-footer .social { margin-top: 4px; font-weight: 500; font-size: 12px; color: #4b5563; }
              .print-actions { text-align: center; margin-top: 20px; padding: 15px; background: white; border-radius: 12px; max-width: 800px; margin-left: auto; margin-right: auto; }
              .print-btn, .close-btn { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; margin: 0 8px; }
              .print-btn { background: #dc2626; color: white; }
              .close-btn { background: #6b7280; color: white; }
              @media print { body { background: white; padding: 0; } .estimate-container { box-shadow: none; border-radius: 0; } .print-actions { display: none; } .watermark { color: rgba(220, 38, 38, 0.20) !important; } }
            </style>
          </head>
          <body>
            <div class="estimate-container">
              <div class="watermark">ESTIMATE</div>
              <div class="header">
                <img src="${logo}" alt="Noorani Logo" class="header-logo" />
                <div class="header-text">
                  <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
                  <div class="subtitle">Professional Auto Care Service</div>
                </div>
              </div>
              <div class="content">
                <div class="section-title">VEHICLE / POLICY INFORMATION</div>
                <div class="info-grid">
                  <div class="info-item"><span class="label">Company</span><span class="value">${selectedEstimate.company_name || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Policy Number</span><span class="value">${selectedEstimate.policy_number || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Vehicle</span><span class="value">${selectedEstimate.vehicle || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Color</span><span class="value">${selectedEstimate.color || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">VIN</span><span class="value">${selectedEstimate.vin || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Make</span><span class="value">${selectedEstimate.make || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Model</span><span class="value">${selectedEstimate.model || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Reg No</span><span class="value">${selectedEstimate.reg_no || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Engine No</span><span class="value">${selectedEstimate.engine_no || 'N/A'}</span></div>
                  <div class="info-item"><span class="label">Address</span><span class="value">${selectedEstimate.address || 'N/A'}</span></div>
                </div>
                <div class="invoice-details">
                  <div class="detail-item"><span class="label">EST. NO.</span><span class="value red">${selectedEstimate.estimate_no}</span></div>
                  <div class="detail-item"><span class="label">Date</span><span class="value">${formatDate(selectedEstimate.date)}</span></div>
                  <div class="detail-item"><span class="label">Valid Until</span><span class="value">${formatDate(selectedEstimate.valid_until)}</span></div>
                  <div class="detail-item"><span class="label">Time</span><span class="value">${estimateTime}</span></div>
                </div>
                <table>
                  <thead>
                    <tr><th style="text-align:center;">#</th><th style="text-align:left;">Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
                <div class="total-row">Total: ${formatCurrency(selectedEstimate.total_amount)}</div>
                ${selectedEstimate.notes ? `<div style="margin-top:20px;padding:12px 16px;background:#f8f9fa;border-radius:8px;border-left:4px solid #dc2626;"><strong style="font-size:12px;color:#6b7280;">Notes:</strong><p style="font-size:13px;color:#1f2937;margin-top:4px;">${selectedEstimate.notes}</p></div>` : ''}
                <div class="company-footer">
                  <div class="address">🏪 Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi</div>
                  <div class="phone">📞 0337 3267363</div>
                  <div class="social">📘 Facebook: Noorani.Car.Ac | 📷 Instagram: nooranicarac</div>
                </div>
              </div>
            </div>
            <div class="print-actions">
              <button class="print-btn" onclick="window.print()">🖨️ Print Bill</button>
              <button class="close-btn" onclick="window.close()">✖ Close</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setIsPrinting(false);
      }, 500);
    }, 300);
  };

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEstimates.map(est => ({
      'Estimate #': est.estimate_no,
      'Company': est.company_name || 'N/A',
      'Vehicle': est.vehicle || 'N/A',
      'Policy Number': est.policy_number || 'N/A',
      'Color': est.color || 'N/A',
      'Make': est.make || 'N/A',
      'VIN': est.vin || 'N/A',
      'Model': est.model || 'N/A',
      'Reg No': est.reg_no || 'N/A',
      'Engine No': est.engine_no || 'N/A',
      'Address': est.address || 'N/A',
      'Date': formatDate(est.date),
      'Valid Until': formatDate(est.valid_until),
      'Total Amount': est.total_amount || 0,
      'Status': getStatusText(est.valid_until),
      'Items': est.items?.map(i => i.name).join(', ') || 'None',
      'Created': formatDateTime(est.created_at)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estimates');
    XLSX.writeFile(wb, `Estimates_Records.xlsx`);
    toast.success('Exported to Excel');
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text(`Estimates Records - All`, 14, 10);
    doc.autoTable({
      head: [['Estimate #', 'Company', 'Vehicle', 'Date', 'Valid Until', 'Total', 'Status', 'Items']],
      body: filteredEstimates.map(est => [
        est.estimate_no,
        est.company_name || 'N/A',
        est.vehicle || 'N/A',
        formatDate(est.date),
        formatDate(est.valid_until),
        `Rs. ${(est.total_amount || 0).toLocaleString()}`,
        getStatusText(est.valid_until),
        est.items?.map(i => i.name).join(', ').substring(0, 30) || 'None'
      ]),
      startY: 20,
    });
    doc.save(`Estimates_Records.pdf`);
    toast.success('Exported to PDF');
  };

  // Filter estimates
  const filteredEstimates = useMemo(() => {
    let filtered = estimates;

    // Visibility filter
    if (visibilityFilter === 'active') {
      filtered = filtered.filter(est => !hiddenIds.includes(est.id));
    } else if (visibilityFilter === 'hidden') {
      filtered = filtered.filter(est => hiddenIds.includes(est.id));
    }

    // Date filter
    if (dateFilter === 'single' && singleDate) {
      const selectedDate = new Date(singleDate);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(est => {
        const estDate = new Date(est.date);
        return estDate >= startOfDay && estDate <= endOfDay;
      });
    } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
      const fromDate = new Date(customDateFrom);
      const toDate = new Date(customDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(est => {
        const estDate = new Date(est.date);
        return estDate >= fromDate && estDate <= toDate;
      });
    } else if (dateFilter !== 'all' && dateFilter !== 'custom' && dateFilter !== 'single') {
      const now = new Date();
      let startDate;
      switch (dateFilter) {
        case 'today': startDate = getToday(); break;
        case 'week': startDate = getStartOfWeek(); break;
        case 'month': startDate = getStartOfMonth(); break;
        case 'year': startDate = getStartOfYear(); break;
        default: startDate = null;
      }
      if (startDate) {
        filtered = filtered.filter(est => {
          const estDate = new Date(est.date);
          return estDate >= startDate && estDate <= now;
        });
      }
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(est =>
        (est.estimate_no || '').toLowerCase().includes(term) ||
        (est.company_name || '').toLowerCase().includes(term) ||
        (est.vehicle || '').toLowerCase().includes(term) ||
        (est.policy_number || '').toLowerCase().includes(term) ||
        (est.reg_no || '').toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(est => getStatusText(est.valid_until) === 'Active');
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(est => getStatusText(est.valid_until) === 'Expired');
    }

    return filtered;
  }, [estimates, searchTerm, filterStatus, dateFilter, hiddenIds, visibilityFilter, customDateFrom, customDateTo, singleDate]);

  // Pagination
  const totalPages = Math.ceil(filteredEstimates.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEstimates = filteredEstimates.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hiddenCount = estimates.filter(est => hiddenIds.includes(est.id)).length;

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading estimates...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen p-6`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <FiFileText className="text-3xl text-red-500" />
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Estimate Records</h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Total: {estimates.length} | Showing: {filteredEstimates.length} | Hidden: {hiddenCount}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md">
                  <FiFileText /> Excel
                </button>
                <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md">
                  <FiDownload /> PDF
                </button>
                <button onClick={fetchEstimates} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 shadow-md">
                  <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Search estimates..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                />
              </div>

              {/* Visibility */}
              <button
                onClick={() => { setVisibilityFilter('active'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm transition ${visibilityFilter === 'active' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Active ({estimates.length - hiddenCount})
              </button>
              <button
                onClick={() => { setVisibilityFilter('hidden'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm transition ${visibilityFilter === 'hidden' ? 'bg-gray-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <FiEyeOff className="inline mr-1" /> Hidden ({hiddenCount})
              </button>

              {/* Status */}
              <button
                onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm transition ${filterStatus === 'all' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All
              </button>
              <button
                onClick={() => { setFilterStatus('active'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm transition ${filterStatus === 'active' ? 'bg-green-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <FiCheckCircle className="inline mr-1" /> Active
              </button>
              <button
                onClick={() => { setFilterStatus('expired'); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm transition ${filterStatus === 'expired' ? 'bg-red-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <FiClock className="inline mr-1" /> Expired
              </button>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); setShowCustomDate(e.target.value === 'custom'); setShowSingleDate(e.target.value === 'single'); }}
                className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="single">Single Date</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Single Date */}
            {showSingleDate && (
              <div className="flex flex-wrap items-center gap-3 mt-3 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-lg">
                <FiCalendar className="text-teal-600 dark:text-teal-400" />
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-teal-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {singleDate ? `Showing: ${singleDate} (${filteredEstimates.length} records)` : 'Select a date'}
                </span>
              </div>
            )}

            {/* Custom Date Range */}
            {showCustomDate && (
              <div className="flex flex-wrap items-center gap-3 mt-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                <FiCalendar className="text-purple-600 dark:text-purple-400" />
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                {customDateFrom && customDateTo && (
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {filteredEstimates.length} records found
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estimate #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Vehicle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Valid Until</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Items</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400 min-w-[280px]">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {currentEstimates.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <FiInbox className="text-6xl mx-auto text-gray-400" />
                        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No estimates found</p>
                      </td>
                    </tr>
                  ) : (
                    currentEstimates.map((est, idx) => {
                      const isHidden = hiddenIds.includes(est.id);
                      const status = getStatusText(est.valid_until);
                      const statusColor = getStatusBadge(est.valid_until);

                      return (
                        <tr key={est.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${isHidden ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{indexOfFirstItem + idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{est.estimate_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{est.company_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{est.vehicle || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(est.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(est.valid_until)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-500 text-right">{formatCurrency(est.total_amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {est.items?.length || 0} items
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap justify-center">
                              <button
                                onClick={() => viewEstimateDetails(est)}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition flex items-center gap-1 shadow-md"
                              >
                                <FiEye className="text-xs" /> View
                              </button>
                              <button
                                onClick={() => toggleHideEstimate(est.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-md ${isHidden ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}`}
                                title={isHidden ? 'Unhide' : 'Hide'}
                              >
                                {isHidden ? <FiEye className="text-xs" /> : <FiEyeOff className="text-xs" />}
                                {isHidden ? 'Unhide' : 'Hide'}
                              </button>
                              <button
                                onClick={() => handleDeleteEstimate(est.id, est.estimate_no)}
                                className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs hover:bg-red-800 transition flex items-center gap-1 shadow-md"
                              >
                                <FiTrash2 className="text-xs" /> Delete
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
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEstimates.length)} of {filteredEstimates.length} entries
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiChevronLeft />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                    if (i === 4) pageNum = totalPages;
                  } else if (currentPage >= totalPages - 2) {
                    if (i === 0) pageNum = 1;
                    else if (i === 1) pageNum = totalPages - 3;
                    else if (i === 2) pageNum = totalPages - 2;
                    else if (i === 3) pageNum = totalPages - 1;
                    else pageNum = totalPages;
                  } else {
                    if (i === 0) pageNum = 1;
                    else if (i === 1) pageNum = currentPage - 1;
                    else if (i === 2) pageNum = currentPage;
                    else if (i === 3) pageNum = currentPage + 1;
                    else pageNum = totalPages;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm transition ${currentPage === pageNum ? 'bg-red-500 text-white' : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estimate Details Modal */}
      {isModalOpen && selectedEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`sticky top-0 flex justify-between items-center p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-white dark:bg-gray-900 rounded-t-2xl`}>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <FiFileText className="inline mr-2 text-red-500" /> Estimate Details
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{selectedEstimate.estimate_no}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={printSingleEstimate}
                  disabled={isPrinting}
                  className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 shadow-md"
                >
                  <FiPrinter /> Print
                </button>
                <button
                  onClick={closeModal}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  <FiX />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <h3 className={`font-semibold text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>VEHICLE / POLICY INFORMATION</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Company</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.company_name || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Policy Number</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.policy_number || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehicle</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.vehicle || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Color</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.color || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>VIN</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.vin || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Make</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.make || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Model</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.model || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reg No</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.reg_no || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Engine No</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.engine_no || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Address</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEstimate.address || 'N/A'}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(selectedEstimate.date)}</p></div>
                  <div><p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Valid Until</p><p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(selectedEstimate.valid_until)}</p></div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className={`font-semibold text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <th className="px-4 py-2 text-left text-sm">#</th>
                        <th className="px-4 py-2 text-left text-sm">Item</th>
                        <th className="px-4 py-2 text-center text-sm">Qty</th>
                        <th className="px-4 py-2 text-right text-sm">Price</th>
                        <th className="px-4 py-2 text-right text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {selectedEstimate.items?.length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No items</td></tr>
                      ) : (
                        selectedEstimate.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-center">{idx + 1}</td>
                            <td className="px-4 py-2 text-sm">{item.name}</td>
                            <td className="px-4 py-2 text-sm text-center">{item.quantity || 1}</td>
                            <td className="px-4 py-2 text-sm text-right">Rs. {(item.price || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <td colSpan="4" className="px-4 py-3 text-right font-bold">Total:</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">{formatCurrency(selectedEstimate.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedEstimate.notes && (
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notes</h3>
                  <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedEstimate.notes}</p>
                </div>
              )}
            </div>
            <div className={`sticky bottom-0 flex justify-end gap-3 p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-white dark:bg-gray-900 rounded-b-2xl`}>
              <button
                onClick={() => toggleHideEstimate(selectedEstimate.id)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 shadow-md"
              >
                {hiddenIds.includes(selectedEstimate.id) ? <FiEye /> : <FiEyeOff />}
                {hiddenIds.includes(selectedEstimate.id) ? 'Unhide' : 'Hide'}
              </button>
              <button
                onClick={() => handleDeleteEstimate(selectedEstimate.id, selectedEstimate.estimate_no)}
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition flex items-center gap-2 shadow-md"
              >
                <FiTrash2 /> Delete
              </button>
              <button
                onClick={printSingleEstimate}
                disabled={isPrinting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 shadow-md"
              >
                <FiPrinter /> Print
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
              >
                <FiX /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EstimateRecords;