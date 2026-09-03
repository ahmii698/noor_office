// src/components/CarPurchase.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiSave, FiUser, FiPhone, FiDollarSign, FiCalendar, 
  FiTruck, FiFileText, FiPrinter, FiRefreshCw, 
  FiMapPin, FiHash, FiTag, FiDownload, FiFileText as FiFileIcon
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import logo from '/logo.jpg';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CarPurchase = ({ darkMode }) => {
  const [formData, setFormData] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    customerName: '',
    phoneNo: '',
    sellingPrice: '',
    purchasePrice: '',
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
  const [savedPurchases, setSavedPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch saved purchases on mount
  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/car-purchases');
      if (response.data.success) {
        setSavedPurchases(response.data.data || []);
      } else {
        setSavedPurchases([]);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setSavedPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.make || !formData.model || !formData.purchasePrice) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        purchasePrice: parseFloat(formData.purchasePrice),
        running: parseFloat(formData.running) || 0,
      };

      const response = await api.post('/car-purchases', payload);

      if (response.data.success) {
        toast.success('✅ Car purchase saved to database!');
        await fetchPurchases(); // Refresh the list

        setFormData({
          purchaseDate: new Date().toISOString().split('T')[0],
          customerName: '',
          phoneNo: '',
          sellingPrice: '',
          purchasePrice: '',
          make: '',
          model: '',
          vin: '',
          engineNo: '',
          color: '',
          regNo: '',
          running: '',
          dent: ''
        });
      } else {
        toast.error(response.data.message || 'Failed to save purchase');
      }
      
    } catch (error) {
      console.error('Error saving purchase:', error);
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0][0];
        toast.error(firstError);
      } else {
        toast.error('Failed to save purchase. Check your connection.');
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
        <head><title>Car Purchase Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 15px; }
          .logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
          .shop-name { font-size: 22px; font-weight: bold; color: #1f2937; }
          .details { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total { font-size: 20px; font-weight: bold; color: #dc2626; text-align: right; margin-top: 15px; border-top: 2px solid #e5e7eb; padding-top: 15px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          .section-title { font-weight: bold; font-size: 14px; margin-top: 10px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo" />
            <div class="shop-name">NOORANI CAR A/C & AUTOS</div>
            <div style="font-size:13px;color:#6b7280;">🚗  Car Info Receipt</div>
          </div>
          <div class="details">
            <div class="section-title">CUSTOMER DETAILS</div>
            <div class="row"><strong>Name:</strong> ${formData.customerName || 'N/A'}</div>
            <div class="row"><strong>Phone:</strong> ${formData.phoneNo || 'N/A'}</div>
            <div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
              <strong>Selling Price:</strong> <span style="color:#16a34a;font-weight:bold;">Rs. ${(parseFloat(formData.sellingPrice) || 0).toLocaleString()}</span>
            </div>
            <div class="row"><strong>Purchase Price:</strong> <span style="color:#dc2626;font-weight:bold;">Rs. ${(parseFloat(formData.purchasePrice) || 0).toLocaleString()}</span></div>
            
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
              <strong>Date:</strong> ${formData.purchaseDate}</div>
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
    if (savedPurchases.length === 0) {
      toast.error('No saved purchases to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(savedPurchases.map(p => ({
      'Date': p.purchase_date ? new Date(p.purchase_date).toLocaleDateString() : 'N/A',
      'Customer Name': p.customer_name || 'N/A',
      'Phone': p.phone_no || 'N/A',
      'Make': p.make || 'N/A',
      'Model': p.model || 'N/A',
      'VIN': p.vin || 'N/A',
      'Engine No': p.engine_no || 'N/A',
      'Color': p.color || 'N/A',
      'Reg No': p.reg_no || 'N/A',
      'Running (km)': p.running || 'N/A',
      'Selling Price': `Rs. ${(p.selling_price || 0).toLocaleString()}`,
      'Purchase Price': `Rs. ${(p.purchase_price || 0).toLocaleString()}`,
      'Dent': p.dent || 'None'
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Car Purchases');
    XLSX.writeFile(wb, `Car_Purchases_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel!');
  };

  // ========== PDF EXPORT ==========
  const exportToPDF = () => {
    if (savedPurchases.length === 0) {
      toast.error('No saved purchases to export');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text('Car Purchases Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = savedPurchases.map(p => [
      p.purchase_date ? new Date(p.purchase_date).toLocaleDateString() : 'N/A',
      p.customer_name || 'N/A',
      p.phone_no || 'N/A',
      p.make || 'N/A',
      p.model || 'N/A',
      p.reg_no || 'N/A',
      p.color || 'N/A',
      p.running || 'N/A',
      `Rs. ${(p.selling_price || 0).toLocaleString()}`,
      `Rs. ${(p.purchase_price || 0).toLocaleString()}`
    ]);

    doc.autoTable({
      head: [['Date', 'Customer', 'Phone', 'Make', 'Model', 'Reg No', 'Color', 'Running', 'Selling', 'Purchase']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        8: { cellWidth: 22 },
        9: { cellWidth: 22 }
      }
    });

    doc.save(`Car_Purchases_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF!');
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-lg" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🚗 Car Info</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Record car purchase details</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* ✅ Excel & PDF Buttons */}
              <button
                onClick={exportToExcel}
                disabled={savedPurchases.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } ${savedPurchases.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiFileIcon size={14} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={savedPurchases.length === 0}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } ${savedPurchases.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiDownload size={14} /> PDF
              </button>
              <button
                onClick={fetchPurchases}
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

        {/* Saved Purchases Count */}
        {savedPurchases.length > 0 && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                📋 Total Purchases: <strong className={darkMode ? 'text-white' : 'text-gray-900'}>{savedPurchases.length}</strong>
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Click Excel or PDF to export all
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiCalendar className="inline mr-1" /> Date *
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiUser className="inline mr-1" /> Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Enter customer name"
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

              {/* Selling Price */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiDollarSign className="inline mr-1" /> Selling Price (Rs.)
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  placeholder="Enter selling price"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <FiTag className="inline mr-1" /> Purchase Price * (Rs.)
                </label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  placeholder="Enter purchase price"
                  className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
                  required
                />
              </div>

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

              {/* Reg No */}
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
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isSubmitting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave />}
                {isSubmitting ? 'Saving...' : '💾 Save Purchase'}
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
                onClick={() => {
                  setFormData({
                    purchaseDate: new Date().toISOString().split('T')[0],
                    customerName: '',
                    phoneNo: '',
                    sellingPrice: '',
                    purchasePrice: '',
                    make: '',
                    model: '',
                    vin: '',
                    engineNo: '',
                    color: '',
                    regNo: '',
                    running: '',
                    dent: ''
                  });
                  toast.success('Form reset');
                }}
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

export default CarPurchase;