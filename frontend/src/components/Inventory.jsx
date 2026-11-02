// src/components/Inventory.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  FiSearch, FiX, FiPlus, FiFileText, FiDownload,
  FiEdit2, FiPackage, FiDollarSign, FiTrendingUp,
  FiShoppingCart, FiBarChart2, FiCheckCircle, FiAlertCircle,
  FiLoader, FiUser, FiTrash2, FiEye, FiEyeOff,
  FiCalendar, FiArrowUp, FiArrowDown,
  FiBriefcase, FiCreditCard, FiBox
} from 'react-icons/fi';
import api from '../services/api';
// Cash in hand / owner capital / vendor payable calculations now live in one shared hook
import useInventoryCash from '../hooks/useInventoryCash';

// Category options for the dropdown (Battery only)
const CATEGORY_OPTIONS = ['Battery'];

// Statistics cards: one single style for all cards (white in light mode, dark in dark mode).
// Icons use one accent color (amber) on every card.

// Filter / sort options
const TIME_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' }
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Default', icon: null },
  { key: 'name-asc', label: 'A → Z', icon: FiArrowUp },
  { key: 'name-desc', label: 'Z → A', icon: FiArrowDown },
  { key: 'price-asc', label: 'Price: Low → High', icon: null },
  { key: 'price-desc', label: 'Price: High → Low', icon: null }
];

// Helper: get date range for a filter (with custom date support)
const getDateRange = (filter, customDate = null) => {
  const now = new Date();
  const start = new Date();

  if (filter === 'custom' && customDate) {
    const date = new Date(customDate);
    start.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const day = now.getDay();
      const diff = (day === 0 ? 6 : day - 1);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return { start, end: now };
};

const filterProductsByDate = (products, filter, customDate = null) => {
  if (filter === 'all' || !products || products.length === 0) return products;
  const range = getDateRange(filter, customDate);
  if (!range) return products;

  return products.filter(product => {
    if (product.is_hidden === true) return false;
    if (!product.date_added) return false;
    const prodDate = new Date(product.date_added);
    return prodDate >= range.start && prodDate <= range.end;
  });
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Date + time formatter (e.g. 09 Oct 2026, 03:24 PM)
const formatDateTime = (value) => {
  if (!value) return { date: '-', time: '' };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { date: '-', time: '' };
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
};

// History helpers (eye button -> product history modal)
const HISTORY_FIELD_LABELS = {
  name: 'Product Name',
  category: 'Category',
  purchase_price: 'Purchase Price',
  selling_price: 'Selling Price',
  quantity: 'Stock',
  low_stock_threshold: 'Low Stock Alert At',
  is_hidden: 'Visibility'
};

const HISTORY_ACTIONS = {
  created: { label: 'Product Added', dot: 'bg-green-500', badge: 'bg-green-500' },
  updated: { label: 'Updated', dot: 'bg-blue-500', badge: 'bg-blue-500' },
  hidden: { label: 'Hidden', dot: 'bg-yellow-500', badge: 'bg-yellow-500' },
  unhidden: { label: 'Unhidden', dot: 'bg-teal-500', badge: 'bg-teal-500' },
  deleted: { label: 'Deleted', dot: 'bg-red-500', badge: 'bg-red-500' }
};

const formatHistoryValue = (field, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (field === 'purchase_price' || field === 'selling_price') {
    const n = Number(value);
    return isNaN(n) ? String(value) : `Rs. ${n.toLocaleString()}`;
  }
  if (field === 'is_hidden') {
    return (value === true || value === 1 || value === '1') ? 'Hidden' : 'Visible';
  }
  return String(value);
};

// Backend `changes` can be an object { field: {old, new} } or an array [{field, old, new}]
const normalizeChanges = (changes) => {
  if (!changes) return [];
  let data = changes;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return []; }
  }
  if (Array.isArray(data)) {
    return data.map(c => ({ field: c.field, old: c.old, new: c.new }));
  }
  return Object.entries(data).map(([field, v]) => ({
    field,
    old: v?.old,
    new: v?.new
  }));
};

// History fix: a vendor (credit) product is created with quantity 0, so the "Product Added"
// entry used to show Stock: 0. Here we replace that value with the real starting quantity
// (starting qty = current stock - total stock change recorded in later history entries).
const fixCreatedStock = (entries, product) => {
  if (!(product.credit_vendor || product.vendor_name)) return entries;

  let laterDelta = 0;
  entries.forEach(en => {
    if (en.action === 'created') return;
    normalizeChanges(en.changes).forEach(c => {
      if (c.field === 'quantity') laterDelta += (Number(c.new) || 0) - (Number(c.old) || 0);
    });
  });
  const startQty = Math.max(0, (parseInt(product.quantity) || 0) - laterDelta);

  return entries.map(en => {
    if (en.action !== 'created') return en;
    let hasQty = false;
    const changes = normalizeChanges(en.changes).map(c => {
      if (c.field !== 'quantity') return c;
      hasQty = true;
      return (Number(c.new) || 0) === 0 ? { ...c, new: startQty } : c;
    });
    if (!hasQty && startQty > 0) changes.push({ field: 'quantity', old: null, new: startQty });
    return { ...en, changes };
  });
};

// Single statistics card (same style for all cards, adapts to light / dark mode)
const StatCard = ({ title, value, note, icon: Icon, darkMode }) => (
  <div className={`rounded-xl p-4 border shadow-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className="flex items-center gap-2">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${darkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
        <Icon />
      </span>
      <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{title}</p>
    </div>
    <p className={`text-2xl font-bold mt-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    <p className={`text-xs font-medium mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{note}</p>
  </div>
);

// Product Row Component
// Inline (double-click) editing is removed: nothing in the table can be edited directly.
// The selling price can only be increased from the Edit button.
const ProductRow = React.memo(({ product, darkMode, onEditProduct, onDeleteProduct, onToggleHide, onViewHistory, formatPrice, isAdmin }) => {
  const isHidden = product.is_hidden === 1 || product.is_hidden === true;

  // Use the product's own threshold, default to 5
  const threshold = product.low_stock_threshold ?? 5;

  // Vendor / invoice info (from the credit_vendor relation returned by the backend)
  const invoiceNo = product.credit_vendor?.invoice_number || '-';
  const vendorName = product.credit_vendor?.name || product.vendor_name || '-';

  // Date & time when the product was added
  const addedAt = formatDateTime(product.created_at || product.date_added);

  // Updated at: whenever the product is edited or its stock changes
  const updatedAt = formatDateTime(product.updated_at || product.created_at || product.date_added);

  return (
    <tr className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} ${isHidden ? 'opacity-50 bg-gray-100 dark:bg-gray-800' : ''}`}>
      <td className="px-3 py-2.5">
        <div className={`cursor-default font-medium ${darkMode ? 'text-white' : 'text-gray-900'} px-2 py-0.5 rounded`}>
          {product.name}
          {product.category && (
            <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{product.category}</span>
          )}
          {isHidden && <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">Hidden</span>}
        </div>
      </td>

      {isAdmin && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className={`cursor-default ${darkMode ? 'text-gray-300' : 'text-gray-600'} px-2 py-0.5`}>
            {formatPrice(product.purchase_price)}
          </div>
        </td>
      )}

      {isAdmin && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className={`cursor-default ${darkMode ? 'text-gray-300' : 'text-gray-600'} px-2 py-0.5`}>
            {formatPrice(product.selling_price)}
          </div>
        </td>
      )}

      {/* Stock (display only) */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div
          className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded cursor-default ${
            product.quantity < threshold && product.quantity > 0 ? 'text-yellow-500' :
            product.quantity === 0 ? 'text-red-500' :
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
          title={`Low stock at: ${threshold}`}
        >
          {product.quantity}
          {product.quantity < threshold && product.quantity > 0 && <FiAlertCircle className="text-xs" title={`Low stock! Below ${threshold}`} />}
          {product.quantity === 0 && <FiX className="text-xs" title="Out of stock!" />}
        </div>
      </td>

      {/* Low Stock At */}
      {isAdmin && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className={`cursor-default ${darkMode ? 'text-gray-300' : 'text-gray-600'} px-2 py-0.5 w-fit`}>
            {threshold}
          </div>
        </td>
      )}

      {/* Invoice No (from the credit_vendor relation) */}
      <td className="px-3 py-2.5 text-sm text-gray-400 whitespace-nowrap">
        {invoiceNo}
      </td>

      {/* Vendor (from the credit_vendor relation) */}
      <td className="px-3 py-2.5 text-sm text-gray-400 whitespace-nowrap">
        {vendorName}
      </td>

      {/* Date & time when the product was added */}
      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{addedAt.date}</div>
        <div className="text-xs text-gray-400">{addedAt.time}</div>
      </td>

      {/* Date & time of the last change */}
      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
        <div className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{updatedAt.date}</div>
        <div className="text-xs text-gray-400">{updatedAt.time}</div>
      </td>

      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          {isAdmin && (
            <>
              {/* Eye button: view the full history of the product */}
              <button
                onClick={() => onViewHistory(product)}
                className="px-2.5 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition flex items-center gap-1 shadow-md"
                title="View History"
              >
                <FiEye className="text-sm" />
              </button>
              <button
                onClick={() => onEditProduct(product)}
                className="px-2.5 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-1 shadow-md"
              >
                <FiEdit2 className="text-xs" /> Edit
              </button>
              <button
                onClick={() => onToggleHide(product)}
                className={`px-2.5 py-1 rounded-lg text-sm transition flex items-center gap-1 shadow-md ${
                  isHidden
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
                title={isHidden ? 'Unhide Product' : 'Hide Product'}
              >
                {isHidden ? <FiEye className="text-xs" /> : <FiEyeOff className="text-xs" />}
                {isHidden ? 'Unhide' : 'Hide'}
              </button>
              <button
                onClick={() => onDeleteProduct(product.id, product.name)}
                className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-1 shadow-md"
              >
                <FiTrash2 className="text-xs" /> Delete
              </button>
            </>
          )}
          {!isAdmin && (
            <span className="text-xs text-gray-400">View Only</span>
          )}
        </div>
      </td>
    </tr>
  );
});

// Empty form state: Edit modal (selling price) + vendor/credit fields
const emptyFormData = {
  sellingPrice: '',
  isCreditPurchase: false,
  vendorName: '',
  invoiceNumber: '',
  paidAmount: ''
};

// ---------- Bulk add (several products at once) ----------
const INITIAL_BULK_ROWS = 3;
const DEFAULT_LOW_STOCK = 5;
const ROW_GRID = 'grid-cols-[32px_minmax(160px,2.2fr)_1fr_1fr_0.8fr_0.8fr_36px]';
const BULK_COLS = 5; // name, purchase, sell, qty, low stock

let bulkRowCounter = 0;
const makeEmptyRow = () => ({
  rid: ++bulkRowCounter,
  name: '',
  purchasePrice: '',
  sellingPrice: '',
  quantity: '',
  lowStockThreshold: ''
});

const isRowFilled = (r) =>
  [r.name, r.purchasePrice, r.sellingPrice, r.quantity].some(v => String(v ?? '').trim() !== '');

const rowInputCls = (darkMode) =>
  `w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'}`;

const Inventory = ({ darkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Cash / Owner Capital / Vendor Payable come from the shared hook (the Billing page uses the same one)
  const {
    vendorPayable,
    inventoryCashInHand,
    ownerCapital,
    ensureCash,
    refresh: refreshCash
  } = useInventoryCash();

  // Recalculate cash whenever products change (add / edit / delete / stock change)
  useEffect(() => {
    refreshCash();
  }, [products, refreshCash]);

  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [sortOption, setSortOption] = useState('default');

  const [filteredStats, setFilteredStats] = useState({
    totalPurchase: 0,
    totalSelling: 0,
    totalProfit: 0
  });

  // formData: Edit modal (selling price) + vendor/credit fields (Add modal)
  const [formData, setFormData] = useState({ ...emptyFormData });
  // newRows: all product rows of the Add modal
  const [newRows, setNewRows] = useState(() => Array.from({ length: INITIAL_BULK_ROWS }, makeEmptyRow));
  // bulkCategory: one category shared by all products in the Add modal
  const [bulkCategory, setBulkCategory] = useState('');
  const [viewMode, setViewMode] = useState('active');

  // Vendor names list (for the autocomplete dropdown)
  const [vendorsList, setVendorsList] = useState([]);

  // Prevents duplicate submissions + drives the loading UI on the Add/Update button
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Controls the custom-styled vendor suggestion dropdown
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // Product history modal (eye button)
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Modal scroll container: scrolls down automatically when "credit purchase" is ticked
  const modalScrollRef = useRef(null);
  // Rows list scroll container: used to focus / scroll to a new row
  const rowsContainerRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role);
      setIsAdmin(userData.role === 'admin');
    }
  }, []);

  // When "Purchased from a vendor?" is ticked, scroll the modal so the new fields are visible
  useEffect(() => {
    if (!isModalOpen || !formData.isCreditPurchase) return;
    const timer = setTimeout(() => {
      const el = modalScrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [isModalOpen, formData.isCreditPurchase]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (viewMode === 'active') {
      filtered = filtered.filter(product => product.is_hidden !== true);
    } else if (viewMode === 'hidden') {
      filtered = filtered.filter(product => product.is_hidden === true);
    }

    filtered = filterProductsByDate(filtered, timeFilter, customDate || null);

    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOption !== 'default') {
      filtered = [...filtered];
      switch (sortOption) {
        case 'name-asc':
          filtered.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
          break;
        case 'name-desc':
          filtered.sort((a, b) => b.name?.localeCompare(a.name || '') || 0);
          break;
        case 'price-asc':
          filtered.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
          break;
        case 'price-desc':
          filtered.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [products, searchTerm, viewMode, timeFilter, customDate, sortOption]);

  // Vendor names filtered by what is currently typed in the Vendor Name field
  const filteredVendorSuggestions = useMemo(() => {
    const query = (formData.vendorName || '').toLowerCase().trim();
    if (!query) return vendorsList;
    return vendorsList.filter(name => name.toLowerCase().includes(query));
  }, [vendorsList, formData.vendorName]);

  const summaryTotals = useMemo(() => {
    const data = filteredProducts;

    const totalStock = data.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalPurchaseValue = data.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.quantity || 0)), 0);
    const totalSellingValue = data.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.quantity || 0)), 0);
    const totalProfit = data.reduce((sum, p) => sum + (((p.selling_price || 0) - (p.purchase_price || 0)) * (p.quantity || 0)), 0);

    return {
      totalStock,
      totalPurchaseValue,
      totalSellingValue,
      totalProfit
    };
  }, [filteredProducts]);

  // Add modal: how many rows are filled and their total bill
  const bulkTotals = useMemo(() => {
    const filled = newRows.filter(isRowFilled);
    const totalBill = filled.reduce(
      (sum, r) => sum + (parseFloat(r.purchasePrice) || 0) * (parseInt(r.quantity) || 0),
      0
    );
    return { filledCount: filled.length, totalBill };
  }, [newRows]);

  const calculateFilteredStats = useCallback((productsList, filter, customDateVal = null) => {
    const range = getDateRange(filter, customDateVal);
    if (!range || filter === 'all') {
      const stats = productsList.reduce((acc, product) => {
        if (product.is_hidden === true) return acc;
        acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
        acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
        acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
        return acc;
      }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });
      return stats;
    }

    const filtered = productsList.filter(product => {
      if (product.is_hidden === true) return false;
      if (!product.date_added) return false;
      const prodDate = new Date(product.date_added);
      return prodDate >= range.start && prodDate <= range.end;
    });

    const stats = filtered.reduce((acc, product) => {
      acc.totalPurchase += (product.purchase_price || 0) * (product.quantity || 0);
      acc.totalSelling += (product.selling_price || 0) * (product.quantity || 0);
      acc.totalProfit += ((product.selling_price || 0) - (product.purchase_price || 0)) * (product.quantity || 0);
      return acc;
    }, { totalPurchase: 0, totalSelling: 0, totalProfit: 0 });

    return stats;
  }, []);

  useEffect(() => {
    const stats = calculateFilteredStats(products, timeFilter, customDate || null);
    setFilteredStats(stats);
  }, [products, timeFilter, customDate, calculateFilteredStats]);

  const getFilterLabel = () => {
    const labels = {
      all: 'All Time',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      custom: `Custom: ${customDate || 'Select Date'}`
    };
    return labels[timeFilter] || 'All Time';
  };

  const getStatsLabelText = () => {
    const labels = {
      all: 'Total',
      today: "Today's",
      week: "This Week's",
      month: "This Month's",
      year: "This Year's",
      custom: `Custom (${customDate})`
    };
    return labels[timeFilter] || 'Total';
  };

  const getSortLabel = () => {
    const found = SORT_OPTIONS.find(o => o.key === sortOption);
    return found ? found.label : 'Default';
  };

  const fetchProducts = useCallback(async () => {
    const abortController = new AbortController();
    setLoading(true);
    try {
      const response = await api.get('/products', {
        signal: abortController.signal,
        params: {
          show_hidden: 'true'
        }
      });

      let productsData = [];

      if (response.data?.success && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else {
        productsData = [];
      }

      setProducts(productsData);

      const stats = calculateFilteredStats(productsData, timeFilter, customDate || null);
      setFilteredStats(stats);

    } catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
    return () => abortController.abort();
  }, [calculateFilteredStats, timeFilter, customDate]);

  // Fetch vendor names (only for the autocomplete dropdown).
  // Vendor payable / paid totals now come from the useInventoryCash hook.
  const fetchVendorsList = useCallback(async () => {
    try {
      const response = await api.get('/credit/vendors');
      const rawData = response.data?.success && Array.isArray(response.data.data)
        ? response.data.data
        : (Array.isArray(response.data) ? response.data : []);

      // Unique vendor names (case-insensitive), keeping the original casing
      const uniqueNames = [
        ...new Map(
          rawData
            .map(v => v.vendor_name)
            .filter(Boolean)
            .map(name => [name.toLowerCase().trim(), name])
        ).values()
      ];

      setVendorsList(uniqueNames);
    } catch (error) {
      console.error('Error fetching vendors list:', error);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handleCustomDateChange = (e) => {
    const date = e.target.value;
    setCustomDate(date);
    if (date) {
      setTimeFilter('custom');
    }
  };

  const handleUpdateProduct = useCallback(async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      if (response.data) {
        toast.success('Selling price updated successfully!');
        await fetchProducts();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.message || 'Failed to update product');
      return false;
    }
  }, [fetchProducts]);

  const handleDeleteProduct = useCallback(async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone!`)) {
      try {
        await api.delete(`/products/${id}`);
        toast.success(`"${name}" deleted successfully!`);
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  }, [fetchProducts]);

  const handleToggleHide = useCallback(async (product) => {
    const isCurrentlyHidden = product.is_hidden === true || product.is_hidden === 1;
    const newHiddenStatus = isCurrentlyHidden ? 0 : 1;
    const action = newHiddenStatus === 1 ? 'hide' : 'unhide';

    try {
      await api.patch(`/products/${product.id}`, {
        is_hidden: newHiddenStatus
      });

      await fetchProducts();
      toast.success(newHiddenStatus === 1 ? 'Product hidden successfully!' : 'Product unhidden successfully!');

      if (newHiddenStatus === 1) {
        setViewMode('hidden');
      } else {
        setViewMode('active');
      }

    } catch (error) {
      console.error('Error toggling product visibility:', error);
      toast.error(error.response?.data?.message || `Failed to ${action} product`);
    }
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
    fetchVendorsList();
  }, [fetchProducts, fetchVendorsList]);

  const exportToExcel = useCallback((data, filename) => {
    const exportData = data.map(p => ({
      'Product': p.name,
      'Category': p.category || '-',
      ...(isAdmin && { 'Purchase Price': `Rs. ${(p.purchase_price || 0).toLocaleString()}` }),
      ...(isAdmin && { 'Selling Price': `Rs. ${(p.selling_price || 0).toLocaleString()}` }),
      'Stock': p.quantity || 0,
      ...(isAdmin && { 'Low Stock At': p.low_stock_threshold ?? 5 }),
      'Invoice No': p.credit_vendor?.invoice_number || '-',
      'Vendor': p.credit_vendor?.name || p.vendor_name || '-',
      'Date & Time': (() => { const t = formatDateTime(p.created_at || p.date_added); return `${t.date} ${t.time}`.trim(); })(),
      'Updated At': (() => { const t = formatDateTime(p.updated_at || p.created_at || p.date_added); return `${t.date} ${t.time}`.trim(); })(),
      'Status': p.is_hidden === true ? 'Hidden' : 'Active'
    }));

    const summaryRow = {
      'Product': '📊 TOTAL',
      'Category': '-',
      ...(isAdmin && { 'Purchase Price': `Rs. ${summaryTotals.totalPurchaseValue.toLocaleString()}` }),
      ...(isAdmin && { 'Selling Price': `Rs. ${summaryTotals.totalSellingValue.toLocaleString()}` }),
      'Stock': summaryTotals.totalStock,
      ...(isAdmin && { 'Low Stock At': '-' }),
      'Invoice No': '-',
      'Vendor': '-',
      'Date & Time': '-',
      'Updated At': '-',
      'Status': ''
    };
    exportData.push(summaryRow);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Exported to Excel');
  }, [isAdmin, summaryTotals]);

  const exportToPDF = useCallback((data, title) => {
    const doc = new jsPDF('landscape');
    doc.text(title, 14, 10);

    const head = ['Product', 'Category'];
    if (isAdmin) head.push('Purchase Price', 'Selling Price');
    head.push('Stock');
    if (isAdmin) head.push('Low Stock At');
    head.push('Invoice No', 'Vendor');
    head.push('Date & Time', 'Updated At');
    head.push('Status');

    const body = data.map(p => {
      const row = [p.name || '', p.category || '-'];
      if (isAdmin) row.push(`Rs. ${(p.purchase_price || 0).toLocaleString()}`, `Rs. ${(p.selling_price || 0).toLocaleString()}`);
      row.push(p.quantity || 0);
      if (isAdmin) row.push(p.low_stock_threshold ?? 5);
      row.push(p.credit_vendor?.invoice_number || '-', p.credit_vendor?.name || p.vendor_name || '-');
      const t = formatDateTime(p.created_at || p.date_added);
      row.push(`${t.date} ${t.time}`.trim());
      const u = formatDateTime(p.updated_at || p.created_at || p.date_added);
      row.push(`${u.date} ${u.time}`.trim());
      row.push(p.is_hidden === true ? 'Hidden' : 'Active');
      return row;
    });

    const summaryRow = ['📊 TOTAL', '-'];
    if (isAdmin) {
      summaryRow.push(`Rs. ${summaryTotals.totalPurchaseValue.toLocaleString()}`);
      summaryRow.push(`Rs. ${summaryTotals.totalSellingValue.toLocaleString()}`);
    }
    summaryRow.push(summaryTotals.totalStock);
    if (isAdmin) summaryRow.push('-');
    summaryRow.push('-', '-');
    summaryRow.push('-', '-');
    summaryRow.push('');
    body.push(summaryRow);

    doc.autoTable({
      head: [head],
      body: body,
      startY: 20,
    });
    doc.save(`${title}.pdf`);
    toast.success('Exported to PDF');
  }, [isAdmin, summaryTotals]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // ---------- Bulk rows helpers ----------
  const updateRow = useCallback((rid, field, value) => {
    setNewRows(prev => prev.map(r => (r.rid === rid ? { ...r, [field]: value } : r)));
  }, []);

  const removeRow = useCallback((rid) => {
    setNewRows(prev => (prev.length > 1 ? prev.filter(r => r.rid !== rid) : prev));
  }, []);

  const focusCell = (rowIdx, colIdx) => {
    setTimeout(() => {
      const el = rowsContainerRef.current?.querySelector(`input[data-row="${rowIdx}"][data-col="${colIdx}"]`);
      if (el) {
        el.focus();
        el.scrollIntoView({ block: 'nearest' });
      }
    }, 30);
  };

  const addRows = (count = 1, focusFirstNew = true) => {
    const firstNewIdx = newRows.length;
    setNewRows(prev => [...prev, ...Array.from({ length: count }, makeEmptyRow)]);
    if (focusFirstNew) focusCell(firstNewIdx, 0);
  };

  // Pressing Enter moves to the next field (the form is not submitted); on the last field a new row is added
  const handleRowKeyDown = (e, rowIdx, colIdx) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (colIdx < BULK_COLS - 1) {
      focusCell(rowIdx, colIdx + 1);
    } else if (rowIdx < newRows.length - 1) {
      focusCell(rowIdx + 1, 0);
    } else {
      addRows(1, true);
    }
  };

  // Add products (bulk): category + vendor / credit purchase + cash in hand check
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // ignore extra clicks while a request is in flight

    if (!isAdmin) {
      toast.error('Only admin can add products');
      return;
    }

    // Only take rows that have something written in them (empty rows are ignored)
    const filled = newRows
      .map((r, i) => ({ r, n: i + 1 }))
      .filter(({ r }) => isRowFilled(r));

    if (filled.length === 0) {
      toast.error('Please fill in the details of at least one product');
      return;
    }

    const parsed = [];
    for (const { r, n } of filled) {
      if (!r.name.trim() || String(r.purchasePrice).trim() === '' || String(r.sellingPrice).trim() === '' || String(r.quantity).trim() === '') {
        toast.error(`Row ${n}: Name, Purchase, Sell and Qty are required`);
        return;
      }

      const purchase = parseFloat(r.purchasePrice);
      const selling = parseFloat(r.sellingPrice);
      const qty = parseInt(r.quantity);

      // If left empty use the default (5), otherwise use the entered value
      let threshold = DEFAULT_LOW_STOCK;
      if (String(r.lowStockThreshold).trim() !== '') {
        const t = parseInt(r.lowStockThreshold);
        if (!isNaN(t)) threshold = t;
      }

      if (isNaN(purchase) || isNaN(selling) || isNaN(qty)) {
        toast.error(`Row ${n}: Please enter valid numbers`);
        return;
      }
      if (purchase < 0 || selling < 0 || qty < 0 || threshold < 0) {
        toast.error(`Row ${n}: Values cannot be negative`);
        return;
      }

      parsed.push({
        name: r.name.trim(),
        category: bulkCategory || null,
        purchase_price: purchase,
        selling_price: selling,
        quantity: qty,
        low_stock_threshold: threshold
      });
    }

    // The same name cannot appear twice in one batch (sales are matched by product name)
    const seen = new Map();
    for (let i = 0; i < parsed.length; i++) {
      const key = parsed[i].name.toLowerCase();
      if (seen.has(key)) {
        toast.error(`Row ${filled[seen.get(key)].n} and Row ${filled[i].n} have the same name ("${parsed[i].name}")`);
        return;
      }
      seen.set(key, i);
    }

    const totalBill = parsed.reduce((s, p) => s + p.purchase_price * p.quantity, 0);
    const totalQty = parsed.reduce((s, p) => s + p.quantity, 0);

    if (formData.isCreditPurchase && (!formData.vendorName || !formData.invoiceNumber)) {
      toast.error('Vendor name and invoice number are required for a credit purchase');
      return;
    }

    // Cash check (before any product is created)
    if (formData.isCreditPurchase) {
      const initialPay = parseFloat(formData.paidAmount) || 0;
      if (initialPay > totalBill) {
        toast.error('Paid amount cannot be greater than the total amount');
        return;
      }
      if (!ensureCash(initialPay)) return; // the amount paid now must be available in cash
    } else {
      if (!ensureCash(totalBill)) return;   // full cash purchase: the full amount must be available
    }

    setIsSubmitting(true);

    const created = []; // { id, item }
    const rollback = async () => {
      // If something goes wrong midway, remove the products that were already created (no half-finished work)
      await Promise.all(created.map(c => api.delete(`/products/${c.id}`).catch(() => null)));
      await fetchProducts();
    };

    try {
      // Step 1: create every product.
      // For a credit purchase the quantity starts at 0 - the vendor link (Step 2) adds the real
      // quantity, so stock is not counted twice.
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        try {
          const res = await api.post('/products', {
            name: p.name,
            category: p.category,
            purchase_price: p.purchase_price,
            selling_price: p.selling_price,
            quantity: formData.isCreditPurchase ? 0 : p.quantity,
            low_stock_threshold: p.low_stock_threshold
          });
          const np = res.data?.data;
          if (!np?.id) throw new Error('The server did not return a product ID');
          created.push({ id: np.id, item: p });
        } catch (err) {
          console.error('Bulk add error:', err);
          await rollback();
          toast.error(
            `Row ${filled[i].n} ("${p.name}") could not be added: ${err.response?.data?.message || err.message}. The other products were removed as well, please try again.`,
            { duration: 6000 }
          );
          return;
        }
      }

      // Step 2: for a credit purchase, create one vendor/invoice record for all products
      if (formData.isCreditPurchase) {
        const paidAmountNum = parseFloat(formData.paidAmount) || 0;
        try {
          await api.post('/credit/vendors', {
            vendor_name: formData.vendorName,
            products: created.map(c => c.item.name).join(', '),
            invoice_number: formData.invoiceNumber,
            total_amount: totalBill,
            paid_amount: paidAmountNum,
            stock_quantity: totalQty,
            product_ids: created.map(c => ({
              product_id: c.id,
              product_name: c.item.name,
              quantity: c.item.quantity,
              purchase_price: c.item.purchase_price
            }))
          });
          fetchVendorsList();
        } catch (vendorError) {
          console.error('Vendor link error:', vendorError);
          await rollback();
          toast.error(
            `${vendorError.response?.data?.message || 'Vendor link failed (the invoice number must be unique)'}. Products were not saved. Please check the invoice number and try again.`,
            { duration: 6000 }
          );
          return;
        }

        // Step 3 (fix): after the vendor link, set stock + low stock alert to the real values.
        // The product was created with quantity 0, which left "Stock: 0" in the history.
        // PUT sets an absolute value, so stock is not counted twice.
        await Promise.all(created.map(async (c) => {
          try {
            await api.put(`/products/${c.id}`, {
              name: c.item.name,
              category: c.item.category,
              purchase_price: c.item.purchase_price,
              selling_price: c.item.selling_price,
              quantity: c.item.quantity,
              low_stock_threshold: c.item.low_stock_threshold
            });
          } catch (syncError) {
            console.error('Stock sync error:', syncError);
          }
        }));
      }

      toast.success(
        created.length === 1
          ? 'Product added successfully!'
          : `${created.length} products added successfully!`
      );

      setFormData({ ...emptyFormData });
      setNewRows(Array.from({ length: INITIAL_BULK_ROWS }, makeEmptyRow));
      setBulkCategory('');
      setIsModalOpen(false);
      await fetchProducts();
    } finally {
      setIsSubmitting(false);
    }
  }, [newRows, bulkCategory, formData, isAdmin, fetchProducts, fetchVendorsList, isSubmitting, ensureCash]);

  // Edit button: only the selling price field opens
  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setFormData({
      ...emptyFormData,
      sellingPrice: product.selling_price
    });
    setIsModalOpen(true);
  }, []);

  // Edit save: the selling price can only be INCREASED, everything else stays as it is
  const handleUpdateSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!isAdmin || !editingProduct) return;

    const newSelling = parseFloat(formData.sellingPrice);
    const currentSelling = parseFloat(editingProduct.selling_price) || 0;

    if (isNaN(newSelling)) {
      toast.error('Please enter a valid selling price');
      return;
    }
    if (newSelling < currentSelling) {
      toast.error(`You cannot decrease the selling price, only increase it (current: Rs. ${currentSelling.toLocaleString()})`);
      return;
    }
    if (newSelling === currentSelling) {
      toast.error('The selling price is unchanged. Please increase it.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await handleUpdateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category ?? null,
        purchase_price: editingProduct.purchase_price,
        selling_price: newSelling,
        quantity: editingProduct.quantity,
        low_stock_threshold: editingProduct.low_stock_threshold ?? 5
      });

      if (success) {
        setFormData({ ...emptyFormData });
        setEditingProduct(null);
        setIsModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingProduct, handleUpdateProduct, isAdmin, isSubmitting]);

  const formatPrice = useCallback((price) => {
    return `Rs. ${price?.toLocaleString() || 0}`;
  }, []);

  const getProductCount = () => {
    let filtered = products;
    if (viewMode === 'active') {
      filtered = filtered.filter(p => p.is_hidden !== true);
    } else if (viewMode === 'hidden') {
      filtered = filtered.filter(p => p.is_hidden === true);
    }
    filtered = filterProductsByDate(filtered, timeFilter, customDate || null);
    return filtered.length;
  };

  const getViewModeText = () => {
    if (viewMode === 'active') return 'active';
    if (viewMode === 'hidden') return 'hidden';
    return 'all';
  };

  // Also resets isSubmitting so the modal never reopens stuck in a loading state
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ ...emptyFormData });
    setNewRows(Array.from({ length: INITIAL_BULK_ROWS }, makeEmptyRow));
    setBulkCategory('');
    setIsSubmitting(false);
    setShowVendorDropdown(false);
  };

  // Open the history modal + fetch product history from the backend
  const openHistory = useCallback(async (product) => {
    setHistoryProduct(product);
    setHistoryEntries([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const response = await api.get(`/products/${product.id}/history`);
      const raw = response.data?.success && Array.isArray(response.data.data)
        ? response.data.data
        : (Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []));
      const sorted = [...raw].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistoryEntries(fixCreatedStock(sorted, product));
    } catch (error) {
      console.error('Error fetching product history:', error);
      if (error.response?.status === 404) {
        setHistoryError('The history backend is not set up yet (route / table missing).');
      } else {
        setHistoryError(error.response?.data?.message || 'Could not load history');
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryProduct(null);
    setHistoryEntries([]);
    setHistoryError('');
    setHistoryLoading(false);
  }, []);

  const renderRowInput = (r, i, col, field, type, placeholder) => (
    <input
      type={type}
      value={r[field]}
      data-row={i}
      data-col={col}
      onChange={(e) => updateRow(r.rid, field, e.target.value)}
      onKeyDown={(e) => handleRowKeyDown(e, i, col)}
      className={rowInputCls(darkMode)}
      placeholder={placeholder}
      min={type === 'number' ? '0' : undefined}
      step={field === 'purchasePrice' || field === 'sellingPrice' ? '0.01' : undefined}
      disabled={isSubmitting}
    />
  );

  // Shared classes for filter / sort pill buttons
  const pillCls = (active) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
      active
        ? 'bg-red-500 text-white shadow-md'
        : darkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <FiLoader className="text-5xl text-red-500 animate-spin mx-auto mb-4" />
          <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FILTER BUTTONS */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiCalendar className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
        </div>

        {TIME_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setTimeFilter(f.key); setShowCustomDate(false); }}
            className={pillCls(timeFilter === f.key)}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={() => setShowCustomDate(!showCustomDate)}
          className={pillCls(timeFilter === 'custom')}
        >
          📅 Custom Date
        </button>

        {showCustomDate && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDate}
              onChange={handleCustomDateChange}
              className={`px-3 py-2 rounded-lg text-sm border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            />
            {customDate && (
              <button
                onClick={() => { setCustomDate(''); setTimeFilter('all'); setShowCustomDate(false); }}
                className="text-red-500 text-sm hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getFilterLabel()}</strong>
        </span>
      </div>

      {/* SORTING BUTTONS */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mr-4">
          <FiArrowUp className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sort by:</span>
        </div>

        {SORT_OPTIONS.map(o => {
          const SortIcon = o.icon;
          return (
            <button
              key={o.key}
              onClick={() => setSortOption(o.key)}
              className={pillCls(sortOption === o.key)}
            >
              {SortIcon && <SortIcon className="text-xs" />}
              {o.label}
            </button>
          );
        })}

        <span className={`ml-auto text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Sorting: <strong className={darkMode ? 'text-white' : 'text-gray-800'}>{getSortLabel()}</strong>
        </span>
      </div>

      {/* STATISTICS CARDS (all in one color) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            darkMode={darkMode}
            title="Inventory Cost"
            value={`Rs. ${filteredStats.totalPurchase.toLocaleString()}`}
            note={`${getStatsLabelText().toLowerCase()} purchases`}
            icon={FiShoppingCart}
          />
          <StatCard
            darkMode={darkMode}
            title={`${getStatsLabelText()} Selling Value`}
            value={`Rs. ${filteredStats.totalSelling.toLocaleString()}`}
            note={`${getStatsLabelText().toLowerCase()} sales`}
            icon={FiDollarSign}
          />
          <StatCard
            darkMode={darkMode}
            title={`${getStatsLabelText()} Profit`}
            value={`Rs. ${filteredStats.totalProfit.toLocaleString()}`}
            note={`${getStatsLabelText().toLowerCase()} profit`}
            icon={FiTrendingUp}
          />
          <StatCard
            darkMode={darkMode}
            title="Cash Inventory"
            value={`Rs. ${ownerCapital.toLocaleString()}`}
            note="stock bought with your own cash"
            icon={FiBriefcase}
          />
          <StatCard
            darkMode={darkMode}
            title="Vendor Payable Inventory"
            value={`Rs. ${vendorPayable.toLocaleString()}`}
            note="remaining amount owed to vendors"
            icon={FiCreditCard}
          />
          <StatCard
            darkMode={darkMode}
            title="Cash in Hand / Capital"
            value={`Rs. ${inventoryCashInHand.toLocaleString()}`}
            note="cost recovered from sales + manual cash - purchases"
            icon={FiBox}
          />
        </div>
      )}

      {/* MAIN TABLE */}
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              <FiPackage className="text-xl text-red-500" />
              Products Inventory
              <span className={`text-sm font-normal ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ({getProductCount()} {getViewModeText()})
              </span>
            </h3>
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  onChange={handleSearchChange}
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

              <button
                onClick={() => setViewMode('active')}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'active'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FiEye className="text-sm" />
                Active
              </button>

              <button
                onClick={() => setViewMode('hidden')}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'hidden'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FiEyeOff className="text-sm" />
                Hidden
              </button>

              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 shadow-md ${
                  viewMode === 'all'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                All
              </button>

              {isAdmin && (
                <button onClick={() => setIsModalOpen(true)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition flex items-center gap-2 shadow-md">
                  <FiPlus className="text-sm" /> Add Product
                </button>
              )}

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
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Product
                  {sortOption === 'name-asc' && <FiArrowUp className="inline ml-1 text-red-500" />}
                  {sortOption === 'name-desc' && <FiArrowDown className="inline ml-1 text-red-500" />}
                </th>
                {isAdmin && (
                  <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>Purchase Price</th>
                )}
                {isAdmin && (
                  <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                    Selling Price
                    {sortOption === 'price-asc' && <FiArrowUp className="inline ml-1 text-red-500" />}
                    {sortOption === 'price-desc' && <FiArrowDown className="inline ml-1 text-red-500" />}
                  </th>
                )}
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>Stock</th>
                {isAdmin && (
                  <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                    Low Stock At
                  </th>
                )}
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                  Invoice No
                </th>
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                  Vendor
                </th>
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                  Date & Time
                </th>
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                  Updated At
                </th>
                <th className={`px-3 py-2.5 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiPackage className="text-5xl text-gray-400" />
                      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {searchTerm ? `No products found matching "${searchTerm}"` :
                         viewMode === 'active' ? 'No active products found.' :
                         viewMode === 'hidden' ? 'No hidden products found.' :
                         'No products added yet.'}
                      </p>
                      {viewMode === 'active' && (
                        <button
                          onClick={() => setViewMode('all')}
                          className="text-sm text-blue-500 hover:text-blue-600 underline"
                        >
                          Check all products?
                        </button>
                      )}
                      {viewMode === 'hidden' && (
                        <button
                          onClick={() => setViewMode('active')}
                          className="text-sm text-blue-500 hover:text-blue-600 underline"
                        >
                          Check active products?
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredProducts.map(product => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      darkMode={darkMode}
                      onEditProduct={handleEditProduct}
                      onDeleteProduct={handleDeleteProduct}
                      onToggleHide={handleToggleHide}
                      onViewHistory={openHistory}
                      formatPrice={formatPrice}
                      isAdmin={isAdmin}
                    />
                  ))}

                  {/* SUMMARY ROW */}
                  <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-400'}`}>
                    <td className="px-3 py-2">
                      <div className="font-bold text-base flex items-center gap-2">
                        <FiBarChart2 className="text-red-500" />
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>📊 TOTAL</span>
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-semibold text-blue-600 text-sm">
                          Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}
                        </div>
                      </td>
                    )}

                    {isAdmin && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-semibold text-red-500 text-sm">
                          Rs. {summaryTotals.totalSellingValue.toLocaleString()}
                        </div>
                      </td>
                    )}

                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-bold text-base flex items-center gap-1">
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{summaryTotals.totalStock}</span>
                        <span className="text-xs text-gray-400">units</span>
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-400">-</span>
                      </td>
                    )}

                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">-</span>
                    </td>

                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">-</span>
                    </td>

                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">-</span>
                    </td>

                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-400">-</span>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">Stock: {summaryTotals.totalStock}</span>
                        {isAdmin && (
                          <>
                            <span className="text-xs text-blue-500">Buy: Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}</span>
                            <span className="text-xs text-red-500">Sell: Rs. {summaryTotals.totalSellingValue.toLocaleString()}</span>
                            <span className={`text-xs font-bold ${summaryTotals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              Profit: Rs. {summaryTotals.totalProfit.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* SUMMARY BAR (UI only, no email) */}
        <div className={`px-6 py-2 border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Products:</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{filteredProducts.length}</span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Stock:</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{summaryTotals.totalStock}</span>
              </div>
              {isAdmin && (
                <>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purchase:</span>
                    <span className="text-sm font-semibold text-blue-500">Rs. {summaryTotals.totalPurchaseValue.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Selling:</span>
                    <span className="text-sm font-semibold text-red-500">Rs. {summaryTotals.totalSellingValue.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Profit:</span>
                    <span className={`text-sm font-bold ${summaryTotals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Rs. {summaryTotals.totalProfit.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
            {isAdmin && (
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>
                * Based on current stock × price
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={modalScrollRef}
            className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl ${editingProduct ? 'max-w-md' : 'max-w-5xl'} w-full max-h-[90vh] overflow-y-auto border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <div>
                <h3 className="text-xl font-semibold">
                  {editingProduct ? 'Edit Selling Price' : 'Add New Products'}
                </h3>
                {editingProduct && (
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{editingProduct.name}</p>
                )}
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>

            <form onSubmit={editingProduct ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-4">
              {editingProduct ? (
                // Edit modal: ONLY the selling price (and it can only be increased)
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Selling Price * (Rs.)
                  </label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                    placeholder="Enter new selling price"
                    min={editingProduct.selling_price || 0}
                    step="0.01"
                    required
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Current: Rs. {(editingProduct.selling_price || 0).toLocaleString()} — you can only increase it, not decrease it
                  </p>
                </div>
              ) : (
                <div>
                  {/* Category: one category for all products */}
                  <div className="mb-4 max-w-xs">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Category (applies to all products)
                    </label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      disabled={isSubmitting}
                    >
                      <option value="">-- Select Category --</option>
                      {CATEGORY_OPTIONS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🔋 If you select Battery, all these products will also appear on the Battery page
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      <div className={`grid ${ROW_GRID} gap-2 mb-2 px-1 text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>#</span>
                        <span>Product Name *</span>
                        <span>Purchase (Rs.) *</span>
                        <span>Sell (Rs.) *</span>
                        <span>Qty *</span>
                        <span>Low Stock</span>
                        <span></span>
                      </div>

                      <div ref={rowsContainerRef} className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
                        {newRows.map((r, i) => (
                          <div key={r.rid} className={`grid ${ROW_GRID} gap-2 items-center px-1`}>
                            <span className={`text-xs font-medium text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{i + 1}</span>
                            {renderRowInput(r, i, 0, 'name', 'text', 'Product name')}
                            {renderRowInput(r, i, 1, 'purchasePrice', 'number', 'Purchase')}
                            {renderRowInput(r, i, 2, 'sellingPrice', 'number', 'Sell')}
                            {renderRowInput(r, i, 3, 'quantity', 'number', 'Qty')}
                            {renderRowInput(r, i, 4, 'lowStockThreshold', 'number', String(DEFAULT_LOW_STOCK))}
                            <button
                              type="button"
                              onClick={() => removeRow(r.rid)}
                              disabled={isSubmitting || newRows.length === 1}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove row"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addRows(1)}
                        disabled={isSubmitting}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                      >
                        <FiPlus className="text-xs" /> Add Row
                      </button>
                      <button
                        type="button"
                        onClick={() => addRows(5)}
                        disabled={isSubmitting}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                      >
                        <FiPlus className="text-xs" /> 5 Rows
                      </button>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Products: <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{bulkTotals.filledCount}</span>
                      {'  •  '}Total bill: <span className="font-semibold text-red-500">Rs. {bulkTotals.totalBill.toLocaleString()}</span>
                    </p>
                  </div>

                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ⚠️ Low stock alerts are shown in the UI only; no email is sent. If Low Stock is left empty, it defaults to {DEFAULT_LOW_STOCK}. Empty rows are ignored. Press Enter to move to the next field.
                  </p>
                </div>
              )}

              {/* Vendor / Credit Purchase Section - only for NEW products */}
              {!editingProduct && (
                <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCreditPurchase || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, isCreditPurchase: e.target.checked }))}
                      className="w-4 h-4"
                      disabled={isSubmitting}
                    />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Purchased from a vendor? (Credit Purchase) — all products go on one invoice
                    </span>
                  </label>

                  {formData.isCreditPurchase && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="relative">
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vendor Name *</label>
                        <input
                          type="text"
                          value={formData.vendorName || ''}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, vendorName: e.target.value }));
                            setShowVendorDropdown(true);
                          }}
                          onFocus={() => setShowVendorDropdown(true)}
                          onBlur={() => {
                            setTimeout(() => setShowVendorDropdown(false), 150);
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          placeholder="e.g. Ahmed Malik"
                          autoComplete="off"
                          disabled={isSubmitting}
                        />

                        {showVendorDropdown && filteredVendorSuggestions.length > 0 && (
                          <ul
                            className={`absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg ${
                              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                            }`}
                          >
                            {filteredVendorSuggestions.map((name, idx) => (
                              <li
                                key={idx}
                                onMouseDown={() => {
                                  setFormData(prev => ({ ...prev, vendorName: name }));
                                  setShowVendorDropdown(false);
                                }}
                                className={`px-3 py-2 text-sm cursor-pointer transition ${
                                  darkMode
                                    ? 'text-gray-200 hover:bg-red-900/30'
                                    : 'text-gray-700 hover:bg-red-50'
                                }`}
                              >
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}

                        {vendorsList.length > 0 && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Type to search, or choose an existing vendor from the list
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Invoice Number *</label>
                        <input
                          type="text"
                          value={formData.invoiceNumber || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          placeholder="Unique invoice #"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Paid Now (Rs.)</label>
                        <input
                          type="number"
                          value={formData.paidAmount || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, paidAmount: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-300'}`}
                          placeholder="0 = full credit"
                          min="0"
                          step="0.01"
                          disabled={isSubmitting}
                        />
                      </div>
                      <p className={`text-xs md:col-span-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Total bill: Rs. {bulkTotals.totalBill.toLocaleString()} — pay the remaining amount later from the Credit page using "Pay Now".
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <FiLoader className="text-sm animate-spin" />
                      {editingProduct ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="text-sm" />
                      {editingProduct
                        ? 'Update Selling Price'
                        : bulkTotals.filledCount > 1
                          ? `Add ${bulkTotals.filledCount} Products`
                          : 'Add Product'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product History Modal (eye button) */}
      {historyProduct && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-start`}>
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <FiEye className="text-purple-500" /> Product History
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{historyProduct.name}</p>
              </div>
              <button onClick={closeHistory} className="text-gray-500 hover:text-gray-700 text-2xl">
                <FiX />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {historyLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <FiLoader className="text-3xl text-purple-500 animate-spin" />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Loading history...</p>
                </div>
              ) : historyError ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <FiAlertCircle className="text-4xl text-red-500" />
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{historyError}</p>
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <FiPackage className="text-4xl text-gray-400" />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No history has been recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyEntries.map((entry, idx) => {
                    const cfg = HISTORY_ACTIONS[entry.action] || { label: entry.action || 'Change', dot: 'bg-gray-500', badge: 'bg-gray-500' };
                    const when = formatDateTime(entry.created_at);
                    const changes = normalizeChanges(entry.changes);
                    return (
                      <div key={entry.id ?? idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`w-3 h-3 rounded-full mt-1.5 ${cfg.dot}`}></span>
                          {idx < historyEntries.length - 1 && (
                            <span className={`w-px flex-1 mt-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></span>
                          )}
                        </div>
                        <div className={`flex-1 p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-xs text-white px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{when.date} • {when.time}</span>
                          </div>
                          {entry.user_name && (
                            <p className={`text-xs mt-1 flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <FiUser className="text-xs" /> {entry.user_name}
                            </p>
                          )}
                          {changes.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {changes.map((c, i) => (
                                <li key={i} className="text-sm flex flex-wrap items-center gap-1">
                                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {HISTORY_FIELD_LABELS[c.field] || c.field}:
                                  </span>
                                  {entry.action === 'created' || c.old === null || c.old === undefined ? (
                                    <span className="text-green-500 font-semibold">{formatHistoryValue(c.field, c.new)}</span>
                                  ) : (
                                    <>
                                      <span className="text-red-500 line-through">{formatHistoryValue(c.field, c.old)}</span>
                                      <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>→</span>
                                      <span className="text-green-500 font-semibold">{formatHistoryValue(c.field, c.new)}</span>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={closeHistory}
                className={`w-full px-4 py-2 rounded-lg transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;