// src/components/EstimatedBill.jsx
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  FiPrinter, FiPlus, FiTrash2, FiSave, FiRefreshCw, 
  FiList, FiEdit2, FiX, FiFileText, FiClock, FiMapPin,
  FiShield, FiUser, FiChevronDown, FiChevronUp,
  FiDownload
} from 'react-icons/fi';
import api from '../services/api';
import logo from '/logo.jpg';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const EstimatedBill = ({ darkMode }) => {
  const [estimateType, setEstimateType] = useState('customer');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [estimateData, setEstimateData] = useState({
    estimateNo: `EST-${Date.now().toString().slice(-8)}`,
    name: '',
    policyNumber: '',
    color: '',
    make: '',
    vin: '',
    model: '',
    engineNo: '',
    regNo: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    price: ''
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedEstimates, setSavedEstimates] = useState([]);
  const [showEstimatesList, setShowEstimatesList] = useState(false);
  const [editingEstimateId, setEditingEstimateId] = useState(null);
  
  const printRef = useRef(null);

  useEffect(() => {
    fetchEstimates();
  }, []);

  const total = estimateData.items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);

  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || 0}`;
  };

  const generateEstimateNo = () => {
    return `EST-${Date.now().toString().slice(-8)}`;
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi'
    });
  };

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/estimates');
      if (response.data?.success) {
        setSavedEstimates(response.data.data || []);
      } else if (Array.isArray(response.data)) {
        setSavedEstimates(response.data);
      } else {
        setSavedEstimates([]);
      }
    } catch (error) {
      console.log('📝 Estimates fetch error:', error);
      setSavedEstimates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEstimate = async () => {
    if (estimateData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        estimate_no: estimateData.estimateNo,
        estimate_type: estimateType,
        name: estimateData.name || 'N/A',
        policy_number: estimateData.policyNumber || null,
        color: estimateData.color || null,
        make: estimateData.make || null,
        vin: estimateData.vin || null,
        model: estimateData.model || null,
        engine_no: estimateData.engineNo || null,
        reg_no: estimateData.regNo || null,
        address: estimateData.address || null,
        date: estimateData.date,
        valid_until: estimateData.validUntil,
        total_amount: total,
        notes: estimateData.notes || null,
        items: estimateData.items.map(item => ({
          name: item.name,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0
        }))
      };

      let response;
      if (editingEstimateId) {
        response = await api.put(`/estimates/${editingEstimateId}`, payload);
      } else {
        response = await api.post('/estimates', payload);
      }

      if (response.data?.success) {
        toast.success(editingEstimateId ? 'Estimate updated!' : 'Estimate saved!');
        await fetchEstimates();
        
        setEstimateData({
          estimateNo: generateEstimateNo(),
          name: '',
          policyNumber: '',
          color: '',
          make: '',
          vin: '',
          model: '',
          engineNo: '',
          regNo: '',
          address: '',
          date: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [],
          notes: ''
        });
        setNewItem({ name: '', quantity: 1, price: '' });
        setEditingEstimateId(null);
        setShowEstimatesList(false);
        setEstimateType('customer');
      }
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const loadEstimate = (estimate) => {
    setEstimateType(estimate.estimate_type || 'customer');
    setEstimateData({
      estimateNo: estimate.estimate_no,
      name: estimate.name || '',
      policyNumber: estimate.policy_number || '',
      color: estimate.color || '',
      make: estimate.make || '',
      vin: estimate.vin || '',
      model: estimate.model || '',
      engineNo: estimate.engine_no || '',
      regNo: estimate.reg_no || '',
      address: estimate.address || '',
      date: estimate.date?.split('T')[0] || estimate.date,
      validUntil: estimate.valid_until?.split('T')[0] || estimate.valid_until,
      items: estimate.items?.map(item => ({
        id: item.id || Date.now() + Math.random(),
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || ''
      })) || [],
      notes: estimate.notes || ''
    });
    setEditingEstimateId(estimate.id);
    setShowEstimatesList(false);
    toast.success(`Loaded: ${estimate.estimate_no}`);
  };

  const deleteEstimate = async (id, estimateNo) => {
    if (!window.confirm(`Delete estimate ${estimateNo}?`)) return;
    
    try {
      const response = await api.delete(`/estimates/${id}`);
      if (response.data?.success) {
        toast.success('Deleted!');
        await fetchEstimates();
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  const addItem = () => {
    if (!newItem.name || !newItem.price || parseFloat(newItem.price) <= 0) {
      toast.error('Please fill item name and price');
      return;
    }
    const quantity = parseInt(newItem.quantity) || 1;
    setEstimateData(prev => ({
      ...prev,
      items: [...prev.items, { 
        ...newItem, 
        id: Date.now(),
        quantity: quantity
      }]
    }));
    setNewItem({ name: '', quantity: 1, price: '' });
    toast.success('Item added');
  };

  const removeItem = (id) => {
    setEstimateData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItemQuantity = (id, newQuantity) => {
    if (parseInt(newQuantity) < 1) return;
    setEstimateData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, quantity: parseInt(newQuantity) || 1 } : item
      )
    }));
  };

  const updateItemPrice = (id, newPrice) => {
    if (parseFloat(newPrice) < 0) return;
    setEstimateData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, price: newPrice } : item
      )
    }));
  };

  const getItemTotal = (item) => {
    return (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
  };

  // ========== EXCEL EXPORT ==========
  const exportToExcel = () => {
    if (savedEstimates.length === 0) {
      toast.error('No saved estimates to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(savedEstimates.map(est => ({
      'Estimate #': est.estimate_no,
      'Type': est.estimate_type === 'insurance' ? 'Insurance' : 'Customer',
      'Name': est.name || 'N/A',
      'Policy Number': est.policy_number || 'N/A',
      'Color': est.color || 'N/A',
      'Make': est.make || 'N/A',
      'VIN': est.vin || 'N/A',
      'Model': est.model || 'N/A',
      'Engine No': est.engine_no || 'N/A',
      'Reg No': est.reg_no || 'N/A',
      'Address': est.address || 'N/A',
      'Items Count': est.items?.length || 0,
      'Total Amount': `Rs. ${(est.total_amount || 0).toLocaleString()}`,
      'Date': est.date ? new Date(est.date).toLocaleDateString() : 'N/A',
      'Valid Until': est.valid_until ? new Date(est.valid_until).toLocaleDateString() : 'N/A',
      'Notes': est.notes || ''
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estimates');
    XLSX.writeFile(wb, `Estimates_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel!');
  };

  // ========== PDF EXPORT ==========
  const exportToPDF = () => {
    if (savedEstimates.length === 0) {
      toast.error('No saved estimates to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text('Estimates Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = savedEstimates.map(est => [
      est.estimate_no,
      est.estimate_type === 'insurance' ? 'Insurance' : 'Customer',
      est.name || 'N/A',
      est.color || 'N/A',
      est.make || 'N/A',
      est.model || 'N/A',
      est.reg_no || 'N/A',
      est.items?.length || 0,
      `Rs. ${(est.total_amount || 0).toLocaleString()}`,
      est.date ? new Date(est.date).toLocaleDateString() : 'N/A'
    ]);

    doc.autoTable({
      head: [['Estimate #', 'Type', 'Name', 'Color', 'Make', 'Model', 'Reg No', 'Items', 'Total', 'Date']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 18 },
        2: { cellWidth: 25 },
        8: { cellWidth: 25 },
        9: { cellWidth: 22 }
      }
    });

    doc.save(`Estimates_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF!');
  };

  // ✅ PRINT ESTIMATE
  const printEstimate = () => {
    if (estimateData.items.length === 0) {
      toast.error('No items to print');
      return;
    }

    setIsPrinting(true);
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      if (!printWindow) {
        toast.error('Please allow popups');
        setIsPrinting(false);
        return;
      }

      const currentTime = getCurrentTime();
      const formattedDate = new Date(estimateData.date).toLocaleDateString('en-GB');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Estimate</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f0f0f0; 
              }
              .print-actions { display: none !important; }
              .estimate-container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 12px; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
                overflow: hidden;
                position: relative;
              }
              .header { 
                background: white; 
                padding: 20px 30px; 
                border-bottom: 3px solid #dc2626; 
                display: flex; 
                align-items: center; 
                gap: 20px;
                position: relative;
                z-index: 1;
              }
              .header-logo { 
                width: 70px; 
                height: 70px; 
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
                font-size: 24px; 
                font-weight: bold; 
                color: #1f2937; 
                letter-spacing: 1px; 
              }
              .header-text .subtitle { 
                font-size: 13px; 
                color: #6b7280; 
              }
              .content { 
                padding: 30px; 
                position: relative; 
                z-index: 1;
                background: transparent;
              }
              
              .date-time-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 20px;
                margin-bottom: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                font-size: 15px;
                font-weight: 600;
              }
              .date-time-bar .label {
                color: #6b7280;
                font-weight: 400;
              }
              .date-time-bar .value {
                color: #1f2937;
              }
              
              .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 6px 20px; 
                margin-bottom: 25px;
                padding: 15px 20px;
                background: #fafafa;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              .info-item {
                display: flex;
                padding: 3px 0;
                font-size: 13px;
              }
              .info-item .label {
                font-weight: 600;
                color: #4b5563;
                min-width: 80px;
              }
              .info-item .value {
                color: #1f2937;
                font-weight: 500;
              }

              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                background: white;
              }
              th, td { 
                border: 1px solid #e5e7eb; 
                padding: 10px 14px; 
                text-align: left; 
                font-size: 13px; 
              }
              th { 
                background: #1f2937; 
                color: white; 
                font-weight: 600; 
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
              }
              th:nth-child(1) { text-align: center; width: 50px; }
              th:nth-child(2) { text-align: left; }
              th:nth-child(3) { text-align: center; width: 70px; }
              th:nth-child(4) { text-align: right; width: 120px; }
              th:nth-child(5) { text-align: right; width: 120px; }
              td:nth-child(1) { text-align: center; }
              td:nth-child(3) { text-align: center; }
              td:nth-child(4) { text-align: right; }
              td:nth-child(5) { text-align: right; }
              .total-row { 
                margin-top: 20px; 
                padding-top: 15px; 
                border-top: 2px solid #dc2626;
                text-align: right;
                font-size: 20px;
                font-weight: 800;
                color: #dc2626;
                background: white;
              }
              
              .company-footer { 
                margin-top: 30px; 
                padding-top: 15px; 
                border-top: 2px solid #dc2626;
                text-align: center;
                font-size: 13px;
                color: #1f2937;
                background: white;
              }
              .company-footer .address { 
                font-weight: 700; 
                font-size: 14px;
                color: #1f2937;
                margin-bottom: 6px;
              }
              .company-footer .phone {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 4px;
              }
              .company-footer .social { 
                margin-top: 4px;
                font-weight: 500;
                font-size: 12px;
                color: #4b5563;
              }
              .notes-section {
                margin-top: 20px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #dc2626;
              }
              .notes-section strong { font-size: 12px; color: #6b7280; }
              .notes-section p { font-size: 13px; color: #1f2937; margin-top: 4px; }
              @media print { 
                body { background: white; padding: 0; } 
                .estimate-container { box-shadow: none; border-radius: 0; }
                .no-print { display: none !important; }
                .info-grid { background: #fafafa; }
                .date-time-bar { background: #f8f9fa; }
              }
            </style>
          </head>
          <body>
            <div class="estimate-container">
              <div class="header">
                <img src="${logo}" alt="Noorani Logo" class="header-logo" />
                <div class="header-text">
                  <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
                  <div class="subtitle">Professional Auto Care Service</div>
                </div>
              </div>
              <div class="content">
                <div class="date-time-bar">
                  <span><span class="label"> DATE</span> <span class="value">${formattedDate}</span></span>
                  <span><span class="label"> TIME</span> <span class="value">${currentTime}</span></span>
                </div>

                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Name</span>
                    <span class="value">${estimateData.name || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Color</span>
                    <span class="value">${estimateData.color || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">VIN</span>
                    <span class="value">${estimateData.vin || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Make</span>
                    <span class="value">${estimateData.make || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Model</span>
                    <span class="value">${estimateData.model || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Reg No</span>
                    <span class="value">${estimateData.regNo || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Engine No</span>
                    <span class="value">${estimateData.engineNo || 'N/A'}</span>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="text-align:center;">#</th>
                      <th style="text-align:left;">Item</th>
                      <th style="text-align:center;">Qty</th>
                      <th style="text-align:right;">Price</th>
                      <th style="text-align:right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${estimateData.items.length === 0 ? `
                      <tr>
                        <td colspan="5" style="text-align:center;padding:30px;color:#9ca3af;">
                          No items added
                        </td>
                      </tr>
                    ` : estimateData.items.map((item, idx) => {
                      const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                      return `
                        <tr>
                          <td style="text-align:center;">${idx + 1}</td>
                          <td>${item.name}</td>
                          <td style="text-align:center;">${item.quantity || 1}</td>
                          <td style="text-align:right;">${formatCurrency(item.price)}</td>
                          <td style="text-align:right;font-weight:600;">${formatCurrency(itemTotal)}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>

                <div class="total-row">
                  Total: ${formatCurrency(total)}
                </div>

                ${estimateData.notes ? `
                  <div class="notes-section">
                    <strong>Notes:</strong>
                    <p>${estimateData.notes}</p>
                  </div>
                ` : ''}

                <div class="company-footer">
                  <div class="address">🏪 Shop # 02, Hospital, Gulshan Luxury Apartments, Near Al Mustafa St, Gulshan 13-B Block 13 B Gulshan-e-Iqbal, Karachi</div>
                  <div class="phone">📞 0337 3267363</div>
                  <div class="social">📘 Facebook: Noorani.Car.Ac | 📷 Instagram: nooranicarac</div>
                </div>
              </div>
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

  const resetForm = () => {
    if (estimateData.items.length > 0 && !window.confirm('Reset form?')) return;
    setEstimateData({
      estimateNo: generateEstimateNo(),
      name: '',
      policyNumber: '',
      color: '',
      make: '',
      vin: '',
      model: '',
      engineNo: '',
      regNo: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      notes: ''
    });
    setNewItem({ name: '', quantity: 1, price: '' });
    setEditingEstimateId(null);
    setEstimateType('customer');
    toast.success('Form reset');
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} min-h-screen p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Noorani Logo" className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-lg" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>NOORANI CAR A/C & AUTOS</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Professional Auto Care Service</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <div className="text-2xl font-bold text-red-500">ESTIMATE</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{estimateData.estimateNo}</div>
                {editingEstimateId && <span className="text-xs text-yellow-500">✏️ Editing</span>}
              </div>
              
              <button
                onClick={exportToExcel}
                disabled={savedEstimates.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } ${savedEstimates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiFileText size={14} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={savedEstimates.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } ${savedEstimates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiDownload size={14} /> PDF
              </button>

              <button
                onClick={() => setShowEstimatesList(!showEstimatesList)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1 text-sm shadow-md"
              >
                <FiList /> {showEstimatesList ? 'Hide' : 'Saved'}
              </button>
              <button
                onClick={resetForm}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-1 text-sm shadow-md"
              >
                <FiX /> New
              </button>
            </div>
          </div>
        </div>

        {/* Saved Estimates List */}
        {showEstimatesList && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Saved Estimates</h3>
              <button onClick={fetchEstimates} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
                <FiRefreshCw className={`${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            {isLoading ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
            ) : savedEstimates.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No saved estimates</div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Estimate #</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Name</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Valid Until</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {savedEstimates.map((est) => (
                      <tr key={est.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-3 py-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{est.estimate_no}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            est.estimate_type === 'insurance' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {est.estimate_type === 'insurance' ? 'Insurance' : 'Customer'}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{est.name}</td>
                        <td className="px-3 py-2 text-sm text-right font-semibold text-red-500">
                          Rs. {est.total_amount?.toLocaleString() || 0}
                        </td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(est.date).toLocaleDateString()}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(est.valid_until).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => loadEstimate(est)}
                              className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                              title="Load"
                            >
                              <FiEdit2 className="text-sm" />
                            </button>
                            <button
                              onClick={() => deleteEstimate(est.id, est.estimate_no)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                              title="Delete"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Estimate Type Selector */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select Estimate Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setEstimateType('customer');
                    setEstimateData(prev => ({
                      ...prev,
                      policyNumber: '',
                      address: ''
                    }));
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    estimateType === 'customer'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiUser className={`text-2xl ${estimateType === 'customer' ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <div className={`font-semibold ${estimateType === 'customer' ? 'text-green-600' : 'text-gray-500'}`}>
                        For Customer
                      </div>
                      <div className="text-xs text-gray-400">Basic vehicle info</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setEstimateType('insurance');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    estimateType === 'insurance'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiShield className={`text-2xl ${estimateType === 'insurance' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div>
                      <div className={`font-semibold ${estimateType === 'insurance' ? 'text-blue-600' : 'text-gray-500'}`}>
                        For Insurance
                      </div>
                      <div className="text-xs text-gray-400">Full insurance details</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Estimate Info */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Estimate Details
                <span className={`ml-3 text-xs font-normal px-3 py-1 rounded-full ${
                  estimateType === 'insurance' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {estimateType === 'insurance' ? '📋 FOR INSURANCE' : '👤 FOR CUSTOMER'}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={estimateData.name}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, name: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />

                {estimateType === 'insurance' && (
                  <input
                    type="text"
                    placeholder="Policy Number"
                    value={estimateData.policyNumber}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, policyNumber: e.target.value }))}
                    className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  />
                )}

                <input
                  type="text"
                  placeholder="Color"
                  value={estimateData.color}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, color: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />
                <input
                  type="text"
                  placeholder="Make (Brand)"
                  value={estimateData.make}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, make: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />
                <input
                  type="text"
                  placeholder="VIN (Vehicle Identification Number)"
                  value={estimateData.vin}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, vin: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={estimateData.model}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, model: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />
                <input
                  type="text"
                  placeholder="Engine No"
                  value={estimateData.engineNo}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, engineNo: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />
                <input
                  type="text"
                  placeholder="Reg No (Registration Number)"
                  value={estimateData.regNo}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, regNo: e.target.value }))}
                  className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />

                {estimateType === 'insurance' && (
                  <input
                    type="text"
                    placeholder="Address"
                    value={estimateData.address}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, address: e.target.value }))}
                    className={`px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  />
                )}

                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</label>
                  <input
                    type="date"
                    value={estimateData.date}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Items</h3>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{estimateData.items.length} items</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl">
                <input
                  type="text"
                  placeholder="Item Name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className={`md:col-span-2 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                  min="1"
                  step="1"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={addItem}
                  className="md:col-span-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1 shadow-md"
                >
                  <FiPlus className="text-sm" /> Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase w-[50px]">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase w-[70px]">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase w-[120px]">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase w-[120px]">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase w-[60px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {estimateData.items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className={`px-6 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          No items added yet
                        </td>
                      </tr>
                    ) : (
                      estimateData.items.map((item, idx) => {
                        const itemTotal = getItemTotal(item);
                        return (
                          <tr key={item.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                            <td className={`px-3 py-2 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{idx + 1}</td>
                            <td className={`px-3 py-2 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</td>
                            <td className="px-3 py-2 text-sm text-center">
                              <input
                                type="number"
                                value={item.quantity || 1}
                                onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                                className={`w-16 px-2 py-1 rounded border text-center ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                min="1"
                                step="1"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItemPrice(item.id, e.target.value)}
                                className={`w-28 px-2 py-1 rounded border text-right ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-right font-semibold text-red-500">
                              {formatCurrency(itemTotal)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                              >
                                <FiTrash2 className="text-sm" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Notes (Optional)</label>
                <textarea
                  value={estimateData.notes}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes..."
                  rows="2"
                  className={`w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Summary & Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} sticky top-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Type</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                    estimateType === 'insurance' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {estimateType === 'insurance' ? 'Insurance' : 'Customer'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Items</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{estimateData.items.length}</span>
                </div>
                <div className={`flex justify-between py-3 border-t-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <span className="text-xl font-bold text-red-500">Total</span>
                  <span className="text-2xl font-bold text-red-500">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={saveEstimate}
                  disabled={estimateData.items.length === 0 || isSaving}
                  className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                    estimateData.items.length === 0 || isSaving
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isSaving ? <FiClock className="animate-spin" /> : <FiSave />}
                  {isSaving ? 'Saving...' : editingEstimateId ? '💾 Update' : '💾 Save'}
                </button>

                <button
                  onClick={printEstimate}
                  disabled={estimateData.items.length === 0 || isPrinting}
                  className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                    estimateData.items.length === 0 || isPrinting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {isPrinting ? <FiClock className="animate-spin" /> : <FiPrinter />}
                  {isPrinting ? 'Printing...' : '🖨️ Print'}
                </button>
              </div>

              <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <p>Valid for 7 days from date of issue</p>
                {editingEstimateId && <p className="mt-1 text-yellow-500">✏️ Editing - Save to update</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatedBill;