// src/components/Inventory.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FiSearch, FiX, FiPlus, FiFileText, FiDownload, 
  FiEdit2, FiPackage, FiDollarSign, FiTrendingUp,
  FiShoppingCart, FiBarChart2, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';

const Inventory = ({ products, darkMode, onAddProduct, onUpdateProduct }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: ''
  });
  
  const [editingCell, setEditingCell] = useState({ productId: null, field: null, value: '' });

  const getStartOfWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weeklyStats = products.reduce((acc, product) => {
    const isThisWeek = product.dateAdded ? new Date(product.dateAdded) >= getStartOfWeek() : true;
    
    if (isThisWeek) {
      acc.totalPurchase += product.purchasePrice * product.quantity;
      acc.totalSelling += product.sellingPrice * product.quantity;
      acc.totalProfit += (product.sellingPrice - product.purchasePrice) * product.quantity;
    }
    return acc;
  }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = (data, filename) => {
    const exportData = data.map(p => ({
      'Product': p.name,
      'Purchase Price': `Rs. ${p.purchasePrice.toLocaleString()}`,
      'Selling Price': `Rs. ${p.sellingPrice.toLocaleString()}`,
      'Stock': p.quantity
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Exported to Excel');
  };

  const exportToPDF = (data, title) => {
    const doc = new jsPDF('landscape');
    doc.text(title, 14, 10);
    doc.autoTable({
      head: [['Product', 'Purchase Price', 'Selling Price', 'Stock']],
      body: data.map(p => [
        p.name,
        `Rs. ${p.purchasePrice.toLocaleString()}`,
        `Rs. ${p.sellingPrice.toLocaleString()}`,
        p.quantity
      ]),
      startY: 20,
    });
    doc.save(`${title}.pdf`);
    toast.success('Exported to PDF');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const purchasePriceNum = parseFloat(formData.purchasePrice);
    const sellingPriceNum = parseFloat(formData.sellingPrice);
    const quantityNum = parseInt(formData.quantity);

    if (isNaN(purchasePriceNum) || isNaN(sellingPriceNum) || isNaN(quantityNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    if (purchasePriceNum < 0 || sellingPriceNum < 0 || quantityNum < 0) {
      toast.error('Values cannot be negative');
      return;
    }

    const newProduct = {
      id: Date.now(),
      name: formData.name,
      purchasePrice: purchasePriceNum,
      sellingPrice: sellingPriceNum,
      quantity: quantityNum,
      dateAdded: new Date().toISOString()
    };

    onAddProduct(newProduct);
    toast.success('Product added successfully!');
    
    setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
    setIsModalOpen(false);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity
    });
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const purchasePriceNum = parseFloat(formData.purchasePrice);
    const sellingPriceNum = parseFloat(formData.sellingPrice);
    const quantityNum = parseInt(formData.quantity);

    if (isNaN(purchasePriceNum) || isNaN(sellingPriceNum) || isNaN(quantityNum)) {
      toast.error('Please enter valid numbers');
      return;
    }

    const updatedProduct = {
      ...editingProduct,
      name: formData.name,
      purchasePrice: purchasePriceNum,
      sellingPrice: sellingPriceNum,
      quantity: quantityNum
    };

    onUpdateProduct(updatedProduct);
    toast.success('Product updated successfully!');
    
    setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' });
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const startInlineEdit = (productId, field, currentValue) => {
    setEditingCell({
      productId,
      field,
      value: currentValue
    });
  };

  const saveInlineEdit = (productId, field) => {
    let newValue;
    if (field === 'name') {
      newValue = editingCell.value.trim();
      if (!newValue) {
        toast.error('Product name cannot be empty');
        setEditingCell({ productId: null, field: null, value: '' });
        return;
      }
    } else if (field === 'quantity') {
      newValue = parseInt(editingCell.value);
      if (isNaN(newValue) || newValue < 0) {
        toast.error('Please enter a valid positive number');
        setEditingCell({ productId: null, field: null, value: '' });
        return;
      }
    } else {
      newValue = parseFloat(editingCell.value);
      if (isNaN(newValue) || newValue < 0) {
        toast.error('Please enter a valid positive number');
        setEditingCell({ productId: null, field: null, value: '' });
        return;
      }
    }

    const productToUpdate = products.find(p => p.id === productId);
    const updatedProduct = { ...productToUpdate, [field]: newValue };
    onUpdateProduct(updatedProduct);
    
    let successMessage = '';
    if (field === 'name') successMessage = 'Product name updated successfully!';
    else if (field === 'quantity') successMessage = 'Stock updated successfully!';
    else if (field === 'purchasePrice') successMessage = 'Purchase price updated successfully!';
    else if (field === 'sellingPrice') successMessage = 'Selling price updated successfully!';
    
    toast.success(successMessage);
    setEditingCell({ productId: null, field: null, value: '' });
  };

  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      saveInlineEdit(productId, field);
    } else if (e.key === 'Escape') {
      setEditingCell({ productId: null, field: null, value: '' });
    }
  };

  const formatPrice = (price) => {
    return `Rs. ${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Weekly Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Purchase Total - Blue */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Weekly Purchase Total</p>
              <p className="text-3xl font-bold mt-2">Rs. {weeklyStats.totalPurchase.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2">This week's purchases</p>
            </div>
            <FiShoppingCart className="text-3xl opacity-50" />
          </div>
        </div>
        
        {/* Selling Value - Red */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Weekly Selling Value</p>
              <p className="text-3xl font-bold mt-2">Rs. {weeklyStats.totalSelling.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2">This week's sales</p>
            </div>
            <FiDollarSign className="text-3xl opacity-50" />
          </div>
        </div>
        
        {/* Profit - Green */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">Weekly Profit</p>
              <p className="text-3xl font-bold mt-2">Rs. {weeklyStats.totalProfit.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2">This week's profit</p>
            </div>
            <FiTrendingUp className="text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <FiPackage className="text-xl text-red-500" />
              Products Inventory
            </h3>
            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`px-4 py-2 pl-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  style={{ width: '250px' }}
                />
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <FiX />
                  </button>
                )}
              </div>
              
              <button onClick={() => setIsModalOpen(true)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition flex items-center gap-2 shadow-md">
                <FiPlus className="text-sm" /> Add Product
              </button>
              <button onClick={() => exportToExcel(filteredProducts, 'Inventory_Report')} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-2 shadow-md">
                <FiFileText className="text-sm" /> Excel
              </button>
              <button onClick={() => exportToPDF(filteredProducts, 'Inventory_Report')} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2 shadow-md">
                <FiDownload className="text-sm" /> PDF
              </button>
            </div>
          </div>
          
          {searchTerm && (
            <div className={`mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Found {filteredProducts.length} product(s) for "{searchTerm}"
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Product</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Purchase Price</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Selling Price</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Stock</th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiPackage className="text-5xl text-gray-400" />
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {searchTerm ? `No products found matching "${searchTerm}"` : 'No products added yet. Click "Add Product" to get started!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className={darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                    {/* Product Name Cell */}
                    <td className="px-6 py-4">
                      {editingCell.productId === product.id && editingCell.field === 'name' ? (
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={() => saveInlineEdit(product.id, 'name')}
                          onKeyDown={(e) => handleKeyPress(e, product.id, 'name')}
                          className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          autoFocus
                        />
                      ) : (
                        <div onDoubleClick={() => startInlineEdit(product.id, 'name', product.name)} className={`cursor-pointer font-medium ${darkMode ? 'text-white' : 'text-gray-900'} hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition`} title="Double-click to edit product name">
                          {product.name}
                        </div>
                      )}
                    </td>
                    
                    {/* Purchase Price Cell */}
                    <td className="px-6 py-4">
                      {editingCell.productId === product.id && editingCell.field === 'purchasePrice' ? (
                        <input
                          type="number"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={() => saveInlineEdit(product.id, 'purchasePrice')}
                          onKeyDown={(e) => handleKeyPress(e, product.id, 'purchasePrice')}
                          className={`w-32 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          autoFocus
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <div onDoubleClick={() => startInlineEdit(product.id, 'purchasePrice', product.purchasePrice)} className={`cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition`} title="Double-click to edit purchase price">
                          {formatPrice(product.purchasePrice)}
                        </div>
                      )}
                    </td>
                    
                    {/* Selling Price Cell */}
                    <td className="px-6 py-4">
                      {editingCell.productId === product.id && editingCell.field === 'sellingPrice' ? (
                        <input
                          type="number"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={() => saveInlineEdit(product.id, 'sellingPrice')}
                          onKeyDown={(e) => handleKeyPress(e, product.id, 'sellingPrice')}
                          className={`w-32 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          autoFocus
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <div onDoubleClick={() => startInlineEdit(product.id, 'sellingPrice', product.sellingPrice)} className={`cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition`} title="Double-click to edit selling price">
                          {formatPrice(product.sellingPrice)}
                        </div>
                      )}
                    </td>
                    
                    {/* Stock Cell */}
                    <td className="px-6 py-4">
                      {editingCell.productId === product.id && editingCell.field === 'quantity' ? (
                        <input
                          type="number"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={() => saveInlineEdit(product.id, 'quantity')}
                          onKeyDown={(e) => handleKeyPress(e, product.id, 'quantity')}
                          className={`w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          autoFocus
                          min="0"
                        />
                      ) : (
                        <div onDoubleClick={() => startInlineEdit(product.id, 'quantity', product.quantity)} className={`cursor-pointer font-semibold flex items-center gap-1 ${
                          product.quantity < 5 && product.quantity > 0 ? 'text-yellow-500' : 
                          product.quantity === 0 ? 'text-red-500' : 
                          darkMode ? 'text-white' : 'text-gray-900'
                        } hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition`} title="Double-click to edit stock">
                          {product.quantity}
                          {product.quantity < 5 && product.quantity > 0 && <FiAlertCircle className="text-xs" />}
                          {product.quantity === 0 && <FiX className="text-xs" />}
                        </div>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <button onClick={() => handleEditProduct(product)} className="px-3 py-1 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition flex items-center gap-1 shadow-md">
                        <FiEdit2 className="text-xs" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-xl font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' }); }} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>
            
            <form onSubmit={editingProduct ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Product Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} placeholder="Enter product name" required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Purchase Price * (Rs.)</label>
                <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} placeholder="Enter purchase price" min="0" step="0.01" required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Selling Price * (Rs.)</label>
                <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} placeholder="Enter selling price" min="0" step="0.01" required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Stock Quantity *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`} placeholder="Enter stock quantity" min="0" required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingProduct(null); setFormData({ name: '', purchasePrice: '', sellingPrice: '', quantity: '' }); }} className={`flex-1 px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 shadow-md">
                  <FiCheckCircle className="text-sm" /> {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;