// src/components/OldBatteries.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FiBattery, FiPackage, FiDollarSign, FiTrendingUp, FiTrash2, FiDownload, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const num = (v) => parseFloat(v) || 0;
const rs = (v) => `Rs. ${num(v).toLocaleString()}`;

const OldBatteries = ({ darkMode }) => {
  const [loading, setLoading] = useState(true);
  const [oldBatteries, setOldBatteries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all | in_stock | sold

  // ✅ Fetch all old batteries (in stock + sold)
  const fetchOldBatteries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/old-batteries', { params: { status: 'all' } });
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      setOldBatteries(data);
    } catch (error) {
      console.error('Error fetching old batteries:', error);
      toast.error('Failed to load old batteries data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOldBatteries();
  }, [fetchOldBatteries]);

  // ✅ Delete old battery record
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/old-batteries/${id}`);
      toast.success('Record deleted successfully');
      fetchOldBatteries();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  // ✅ Filtered list
  const filteredBatteries = oldBatteries.filter((item) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      item.battery_name?.toLowerCase().includes(search) ||
      item.customer_name?.toLowerCase().includes(search) ||
      item.customer_phone?.includes(search);
    const matchesFilter = filter === 'all' ? true : item.status === filter;
    return matchesSearch && matchesFilter;
  });

  // ✅ Stats (based on ALL records, not filtered)
  const inStock = oldBatteries.filter((b) => b.status !== 'sold');
  const sold = oldBatteries.filter((b) => b.status === 'sold');
  const stockValue = inStock.reduce((s, b) => s + num(b.trade_in_amount), 0);
  const soldRevenue = sold.reduce((s, b) => s + num(b.selling_price), 0);
  const totalProfit = sold.reduce((s, b) => s + num(b.profit), 0);

  // ✅ Filtered totals for footer
  const footPurchase = filteredBatteries.reduce((s, b) => s + num(b.trade_in_amount), 0);
  const footSelling = filteredBatteries.reduce((s, b) => s + (b.status === 'sold' ? num(b.selling_price) : 0), 0);
  const footProfit = filteredBatteries.reduce((s, b) => s + (b.status === 'sold' ? num(b.profit) : 0), 0);

  const buildRow = (item) => ({
    date: new Date(item.purchase_date || item.created_at).toLocaleDateString(),
    battery: item.battery_name || 'Unknown',
    purchase: rs(item.trade_in_amount),
    selling: item.status === 'sold' ? rs(item.selling_price) : '-',
    profit: item.status === 'sold' ? rs(item.profit) : '-',
    status: item.status === 'sold' ? 'Sold' : 'In Stock',
    customer: item.customer_name || 'Walk-in',
    phone: item.customer_phone || 'N/A',
    note: item.note || '-',
  });

  // ✅ Export to Excel
  const exportToExcel = () => {
    if (filteredBatteries.length === 0) {
      toast.error('No data available');
      return;
    }
    const exportData = filteredBatteries.map((item) => {
      const r = buildRow(item);
      return {
        'Date': r.date,
        'Battery': r.battery,
        'Purchase Price': r.purchase,
        'Selling Price': r.selling,
        'Profit': r.profit,
        'Status': r.status,
        'Customer': r.customer,
        'Phone': r.phone,
        'Note': r.note,
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Old_Batteries');
    XLSX.writeFile(wb, 'Old_Batteries_History.xlsx');
    toast.success('Exported to Excel successfully!');
  };

  // ✅ Export to PDF
  const exportToPDF = () => {
    if (filteredBatteries.length === 0) {
      toast.error('No data available');
      return;
    }
    const doc = new jsPDF('landscape');
    doc.text('Old Batteries History', 14, 10);

    const tableData = filteredBatteries.map((item) => {
      const r = buildRow(item);
      return [r.date, r.battery, r.purchase, r.selling, r.profit, r.status, r.customer, r.phone];
    });

    doc.autoTable({
      head: [['Date', 'Battery', 'Purchase', 'Selling', 'Profit', 'Status', 'Customer', 'Phone']],
      body: tableData,
      startY: 20,
    });
    doc.save('Old_Batteries_History.pdf');
    toast.success('Exported to PDF successfully!');
  };

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading old batteries data...</p>
        </div>
      </div>
    );
  }

  const filterBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        filter === key
          ? 'bg-red-500 text-white'
          : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`flex flex-wrap justify-between items-center p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FiBattery className="text-red-500 text-2xl" />
          <h2 className="text-xl font-bold">Old Batteries History</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {oldBatteries.length} records
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm">
            <FiFileText /> Excel
          </button>
          <button onClick={exportToPDF} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 text-sm">
            <FiDownload /> PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Stock Value (Purchase)</p>
              <p className="text-3xl font-bold mt-2">{rs(stockValue)}</p>
              <p className="text-xs opacity-75 mt-1">{inStock.length} in stock</p>
            </div>
            <FiDollarSign className="text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Batteries Sold</p>
              <p className="text-3xl font-bold mt-2">{sold.length}</p>
              <p className="text-xs opacity-75 mt-1">Units sold</p>
            </div>
            <FiPackage className="text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Sales Revenue</p>
              <p className="text-3xl font-bold mt-2">{rs(soldRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">Total selling price</p>
            </div>
            <FiBattery className="text-3xl opacity-50" />
          </div>
        </div>
        <div className={`rounded-2xl p-6 text-white shadow-lg bg-gradient-to-r ${totalProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Total Profit</p>
              <p className="text-3xl font-bold mt-2">{rs(totalProfit)}</p>
              <p className="text-xs opacity-75 mt-1">Selling − Purchase</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by battery, customer, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-red-500 outline-none transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300'}`}
            />
          </div>
          <div className="flex gap-2">
            {filterBtn('all', 'All')}
            {filterBtn('in_stock', 'In Stock')}
            {filterBtn('sold', 'Sold')}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Battery</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Purchase Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Selling Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Profit</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredBatteries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No old battery records found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatteries.map((item) => {
                  const isSold = item.status === 'sold';
                  const profit = num(item.profit);
                  return (
                    <tr key={item.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(item.purchase_date || item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.battery_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-500">
                        {rs(item.trade_in_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-purple-500">
                        {isSold ? rs(item.selling_price) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isSold ? (profit >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                        {isSold ? `${profit >= 0 ? '+' : '-'} ${rs(Math.abs(profit))}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isSold ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {isSold ? 'Sold' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-sm">{item.customer_phone || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition"
                          title="Delete Record"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
              <tr>
                <td colSpan="2" className="px-4 py-3 text-right font-bold">Total:</td>
                <td className="px-4 py-3 text-right font-bold text-blue-500">{rs(footPurchase)}</td>
                <td className="px-4 py-3 text-right font-bold text-purple-500">{rs(footSelling)}</td>
                <td className={`px-4 py-3 text-right font-bold ${footProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {rs(footProfit)}
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OldBatteries;