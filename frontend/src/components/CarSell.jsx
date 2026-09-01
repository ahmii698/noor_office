// src/components/CarSell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FiSave, FiUser, FiPhone, FiMapPin, FiDollarSign, 
  FiCalendar, FiTruck, FiFileText, FiPrinter, FiRefreshCw, 
  FiHash, FiTag, FiSearch, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import logo from '/logo.jpg';
import api from '../services/api';

const CarSell = ({ darkMode }) => {
  const [formData, setFormData] = useState({
    sellDate: new Date().toISOString().split('T')[0],
    customerName: '',
    phoneNo: '',
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

  // ✅ Fetch all purchased cars on load
  useEffect(() => {
    fetchPurchasedCars();
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

  // ✅ Select a customer - Auto-fill form
  const selectCustomer = (car) => {
    setFormData({
      sellDate: new Date().toISOString().split('T')[0],
      customerName: car.customer_name || '',
      phoneNo: car.phone_no || '',
      sellingPrice: '', // Empty - user will enter sale price
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
        sellingPrice: parseFloat(formData.sellingPrice),
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
        
        setFormData({
          sellDate: new Date().toISOString().split('T')[0],
          customerName: '',
          phoneNo: '',
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
              <strong>Sale Price:</strong> <span style="color:#16a34a;font-weight:bold;">Rs. ${(parseFloat(formData.sellingPrice) || 0).toLocaleString()}</span>
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

  const resetForm = () => {
    setFormData({
      sellDate: new Date().toISOString().split('T')[0],
      customerName: '',
      phoneNo: '',
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
          <div className="flex items-center gap-4">
            <img src={logo} className="w-16 h-16 rounded-full object-cover border-2 border-green-500 shadow-lg" />
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🚘 Car Sell</h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Record car sale details</p>
            </div>
          </div>
        </div>

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