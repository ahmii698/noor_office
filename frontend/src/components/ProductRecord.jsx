// src/components/ProductRecord.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiSearch,
  FiPackage,
  FiTrendingUp,
  FiTrendingDown,
  FiList,
  FiBarChart2,
  FiShoppingCart,
  FiDollarSign,
  FiTag,
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import './ProductRecord.css';

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Converts invoice_date to a local date string (yyyy-mm-dd)
const normalizeDate = (value) => {
  if (!value) return '';
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  return isNaN(d.getTime()) ? '' : toYMD(d);
};

const displayDate = (ymd) => {
  if (!ymd) return '-';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

const getRange = (filter, customDate) => {
  const now = new Date();
  const today = toYMD(now);
  if (filter === 'today') return { from: today, to: today };
  if (filter === 'week') {
    const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const s = new Date(now);
    s.setDate(now.getDate() - diff);
    return { from: toYMD(s), to: today };
  }
  if (filter === 'month') return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: today };
  if (filter === 'year') return { from: `${now.getFullYear()}-01-01`, to: today };
  if (filter === 'custom' && customDate) return { from: customDate, to: customDate };
  return null; // all
};

const money = (n) => `Rs. ${Math.round((Number(n) || 0) * 100) / 100 === 0 ? 0 : (Math.round((Number(n) || 0) * 100) / 100).toLocaleString()}`;

const ProductRecord = ({ darkMode }) => {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [view, setView] = useState('record'); // 'record' | 'summary'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, prodRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/products', { params: { show_hidden: 'true' } }),
      ]);

      const invData = Array.isArray(invRes.data)
        ? invRes.data
        : Array.isArray(invRes.data?.data)
        ? invRes.data.data
        : [];
      const prodData = Array.isArray(prodRes.data)
        ? prodRes.data
        : Array.isArray(prodRes.data?.data)
        ? prodRes.data.data
        : [];

      setInvoices(invData);
      setProducts(prodData);
    } catch (err) {
      console.error('Error fetching sales record:', err);
      toast.error('Failed to load product records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Product name -> purchase price (from current inventory)
  const purchaseMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      map.set(String(p.name || '').trim().toLowerCase(), Number(p.purchase_price) || 0);
    });
    return map;
  }, [products]);

  // Each sold product becomes one row
  const allRows = useMemo(() => {
    const rows = [];
    invoices.forEach((inv) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      const date = normalizeDate(inv.invoice_date || inv.created_at);

      const itemsTotal = items.reduce(
        (s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
        0
      );
      const invSubtotal = Number(inv.subtotal) || itemsTotal;
      const invDiscount = Number(inv.discount) || 0;

      items.forEach((it, idx) => {
        // Products only (not services)
        if (it.service_category !== 'Product') return;

        const qty = Number(it.quantity) || 0;
        const selling = (Number(it.price) || 0) * qty;
        const key = String(it.service_name || '').trim().toLowerCase();
        const purchase = (purchaseMap.get(key) || 0) * qty;

        // The invoice discount is split across items in proportion to their value
        const discount = invSubtotal > 0 ? (invDiscount * selling) / invSubtotal : 0;
        const profit = selling - discount - purchase;

        rows.push({
          key: `${inv.id}-${idx}`,
          date,
          invoiceNo: inv.invoice_no || '-',
          name: it.service_name,
          qty,
          purchase,
          selling,
          discount,
          profit,
          known: purchaseMap.has(key),
        });
      });
    });

    // Newest first
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return rows;
  }, [invoices, purchaseMap]);

  const filteredRows = useMemo(() => {
    const range = getRange(timeFilter, customDate);
    const q = searchTerm.trim().toLowerCase();
    return allRows.filter((r) => {
      if (range && (!r.date || r.date < range.from || r.date > range.to)) return false;
      if (q && !String(r.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allRows, timeFilter, customDate, searchTerm]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (a, r) => ({
          qty: a.qty + r.qty,
          purchase: a.purchase + r.purchase,
          selling: a.selling + r.selling,
          discount: a.discount + r.discount,
          profit: a.profit + r.profit,
        }),
        { qty: 0, purchase: 0, selling: 0, discount: 0, profit: 0 }
      ),
    [filteredRows]
  );

  // Product-wise summary (best and worst sellers)
  const summaryRows = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const k = String(r.name || '').trim().toLowerCase();
      const cur = map.get(k) || { name: r.name, qty: 0, purchase: 0, selling: 0, discount: 0, profit: 0 };
      cur.qty += r.qty;
      cur.purchase += r.purchase;
      cur.selling += r.selling;
      cur.discount += r.discount;
      cur.profit += r.profit;
      map.set(k, cur);
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [filteredRows]);

  const topSeller = summaryRows[0];
  const lowSeller = summaryRows.length > 1 ? summaryRows[summaryRows.length - 1] : null;

  const filterLabel = {
    all: 'All Time',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    custom: customDate ? displayDate(customDate) : 'Custom Date',
  }[timeFilter];

  // Summary cards (same style for every card)
  const statCards = [
    { label: 'Total Sold Qty', value: totals.qty.toLocaleString(), icon: FiPackage },
    { label: 'Purchase Value', value: money(totals.purchase), icon: FiShoppingCart },
    { label: 'Selling Value', value: money(totals.selling), icon: FiDollarSign },
    { label: 'Discount Given', value: money(totals.discount), icon: FiTag },
    { label: 'Net Profit', value: money(totals.profit), icon: FiTrendingUp },
  ];

  // ---------- exports ----------
  const buildExportRows = () =>
    view === 'record'
      ? filteredRows.map((r, i) => ({
          '#': i + 1,
          Date: displayDate(r.date),
          'Invoice #': r.invoiceNo,
          Product: r.name,
          Quantity: r.qty,
          'Purchase Value': r.purchase,
          'Selling Value': r.selling,
          Discount: Math.round(r.discount * 100) / 100,
          Profit: Math.round(r.profit * 100) / 100,
        }))
      : summaryRows.map((r, i) => ({
          '#': i + 1,
          Product: r.name,
          'Qty Sold': r.qty,
          'Purchase Value': r.purchase,
          'Selling Value': r.selling,
          Discount: Math.round(r.discount * 100) / 100,
          Profit: Math.round(r.profit * 100) / 100,
        }));

  const handleExportExcel = () => {
    const data = buildExportRows();
    if (data.length === 0) return toast.error('No data to export');
    data.push(
      view === 'record'
        ? {
            '#': '',
            Date: '',
            'Invoice #': '',
            Product: 'TOTAL',
            Quantity: totals.qty,
            'Purchase Value': totals.purchase,
            'Selling Value': totals.selling,
            Discount: Math.round(totals.discount * 100) / 100,
            Profit: Math.round(totals.profit * 100) / 100,
          }
        : {
            '#': '',
            Product: 'TOTAL',
            'Qty Sold': totals.qty,
            'Purchase Value': totals.purchase,
            'Selling Value': totals.selling,
            Discount: Math.round(totals.discount * 100) / 100,
            Profit: Math.round(totals.profit * 100) / 100,
          }
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product Record');
    XLSX.writeFile(wb, `product-record-${view}.xlsx`);
    toast.success('Exported to Excel');
  };

  const handleExportPDF = () => {
    const data = buildExportRows();
    if (data.length === 0) return toast.error('No data to export');
    const doc = new jsPDF('landscape');
    doc.text(`Product Record (${filterLabel})`, 14, 14);
    const head = [Object.keys(data[0])];
    const body = data.map((d) => Object.values(d).map((v) => (typeof v === 'number' ? v.toLocaleString() : v)));
    body.push(
      view === 'record'
        ? ['', '', '', 'TOTAL', totals.qty, totals.purchase.toLocaleString(), totals.selling.toLocaleString(), Math.round(totals.discount).toLocaleString(), Math.round(totals.profit).toLocaleString()]
        : ['', 'TOTAL', totals.qty, totals.purchase.toLocaleString(), totals.selling.toLocaleString(), Math.round(totals.discount).toLocaleString(), Math.round(totals.profit).toLocaleString()]
    );
    doc.autoTable({ head, body, startY: 20 });
    doc.save(`product-record-${view}.pdf`);
    toast.success('Exported to PDF');
  };

  // The Excel / PDF buttons in the dashboard header trigger these exports
  useEffect(() => {
    const onExport = (e) => {
      if (e.detail === 'excel') handleExportExcel();
      else if (e.detail === 'pdf') handleExportPDF();
    };
    window.addEventListener('product-record-export', onExport);
    return () => window.removeEventListener('product-record-export', onExport);
  });

  const profitClass = (n) => (n >= 0 ? 'pos' : 'neg');
  const colCount = view === 'record' ? 9 : 7;

  return (
    <div className={`pr-page ${darkMode ? 'dark' : ''}`}>
      {/* ===== Date Filter Tabs ===== */}
      <div className="pr-tabs-row">
        <div className="pr-tabs">
          {[
            ['all', 'All Time'],
            ['today', 'Today'],
            ['week', 'This Week'],
            ['month', 'This Month'],
            ['year', 'This Year'],
          ].map(([val, label]) => (
            <button
              key={val}
              className={`pr-tab ${timeFilter === val ? 'active' : ''}`}
              onClick={() => {
                setTimeFilter(val);
                setCustomDate('');
              }}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            className={`pr-date-input ${timeFilter === 'custom' ? 'active' : ''}`}
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setTimeFilter(e.target.value ? 'custom' : 'all');
            }}
            title="Custom date"
          />
        </div>
      </div>

      {/* ===== Summary Cards (one style for all: white in light mode, dark in dark mode) ===== */}
      <div className="pr-stats">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div className="pr-stat" key={label}>
            <div className="pr-stat-head">
              <span className="pr-stat-icon">
                <Icon />
              </span>
              <span className="pr-stat-label">{label}</span>
            </div>
            <strong className="pr-stat-value">{value}</strong>
          </div>
        ))}
      </div>

      {/* ===== Best / Worst cards ===== */}
      {!loading && (
        <div className="pr-insights">
          {/* Best seller */}
          <div className="pr-icard">
            <div className="pr-icard-icon">
              <FiTrendingUp />
            </div>
            <div className="pr-icard-body">
              <span className="pr-icard-label">Best Seller</span>
              <strong className="pr-icard-title" title={topSeller?.name || ''}>
                {topSeller ? topSeller.name : '-'}
              </strong>
              <span className="pr-icard-sub">
                {topSeller
                  ? `${topSeller.qty} units • Profit ${money(topSeller.profit)}`
                  : `No sales in ${filterLabel}`}
              </span>
            </div>
          </div>

          {/* Lowest seller */}
          <div className="pr-icard">
            <div className="pr-icard-icon">
              <FiTrendingDown />
            </div>
            <div className="pr-icard-body">
              <span className="pr-icard-label">Lowest Seller</span>
              <strong className="pr-icard-title" title={lowSeller?.name || ''}>
                {lowSeller ? lowSeller.name : '-'}
              </strong>
              <span className="pr-icard-sub">
                {lowSeller
                  ? `${lowSeller.qty} units • Profit ${money(lowSeller.profit)}`
                  : summaryRows.length === 1
                  ? 'Only one product has been sold'
                  : `No sales in ${filterLabel}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== Main Card ===== */}
      <div className="pr-card">
        <div className="pr-card-header">
          <div className="pr-card-title">
            <FiPackage className="pr-card-title-icon" />
            <h2>
              {view === 'record' ? 'Sales Record' : 'Product-wise Summary'}
              <span className="pr-count"> ({view === 'record' ? filteredRows.length : summaryRows.length})</span>
            </h2>
          </div>

          <div className="pr-card-actions">
            <div className="pr-view-toggle">
              <button className={view === 'record' ? 'active' : ''} onClick={() => setView('record')}>
                <FiList /> Record
              </button>
              <button className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>
                <FiBarChart2 /> Product Summary
              </button>
            </div>
            <div className="pr-search-box">
              <FiSearch className="pr-search-icon" />
              <input
                type="text"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="pr-info-line">
          <FiPackage className="pr-info-icon" />
          <span>
            Showing: <b>{filterLabel}</b> &nbsp;•&nbsp; Profit = Selling − Discount − Purchase. The discount belongs to the
            invoice, so it is split across items in proportion to their value.
          </span>
        </div>

        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead>
              {view === 'record' ? (
                <tr>
                  <th>#</th>
                  <th>DATE</th>
                  <th>INVOICE #</th>
                  <th>PRODUCT NAME</th>
                  <th className="num">QUANTITY</th>
                  <th className="num">PURCHASE VALUE</th>
                  <th className="num">SELLING VALUE</th>
                  <th className="num">DISCOUNT</th>
                  <th className="num">PROFIT</th>
                </tr>
              ) : (
                <tr>
                  <th>#</th>
                  <th>PRODUCT NAME</th>
                  <th className="num">QTY SOLD</th>
                  <th className="num">PURCHASE VALUE</th>
                  <th className="num">SELLING VALUE</th>
                  <th className="num">DISCOUNT</th>
                  <th className="num">PROFIT</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="pr-empty">
                    Loading...
                  </td>
                </tr>
              ) : (view === 'record' ? filteredRows : summaryRows).length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="pr-empty">
                    <div className="pr-empty-box">
                      <FiPackage className="pr-empty-icon" />
                      <p>No sales records found.</p>
                      <span>Change the filter or sell a product from billing.</span>
                    </div>
                  </td>
                </tr>
              ) : view === 'record' ? (
                filteredRows.map((r, i) => (
                  <tr key={r.key}>
                    <td>{i + 1}</td>
                    <td>{displayDate(r.date)}</td>
                    <td>{r.invoiceNo}</td>
                    <td className="pr-name">
                      {r.name}
                      {!r.known && (
                        <span className="pr-warn-tag" title="This product is no longer in inventory, so its purchase value is 0">
                          not in inventory
                        </span>
                      )}
                    </td>
                    <td className="num">
                      <span className="pr-qty ok">{r.qty}</span>
                    </td>
                    <td className="num">{money(r.purchase)}</td>
                    <td className="num">{money(r.selling)}</td>
                    <td className="num">{r.discount > 0 ? `- ${money(r.discount)}` : '-'}</td>
                    <td className={`num pr-profit ${profitClass(r.profit)}`}>{money(r.profit)}</td>
                  </tr>
                ))
              ) : (
                summaryRows.map((r, i) => (
                  <tr key={r.name}>
                    <td>
                      <span className={`pr-rank ${i === 0 ? 'gold' : ''}`}>{i + 1}</span>
                    </td>
                    <td className="pr-name">{r.name}</td>
                    <td className="num">
                      <span className="pr-qty ok">{r.qty}</span>
                    </td>
                    <td className="num">{money(r.purchase)}</td>
                    <td className="num">{money(r.selling)}</td>
                    <td className="num">{r.discount > 0 ? `- ${money(r.discount)}` : '-'}</td>
                    <td className={`num pr-profit ${profitClass(r.profit)}`}>{money(r.profit)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && (view === 'record' ? filteredRows : summaryRows).length > 0 && (
              <tfoot>
                <tr>
                  {view === 'record' ? (
                    <>
                      <td colSpan={4}>TOTAL</td>
                      <td className="num">{totals.qty}</td>
                    </>
                  ) : (
                    <>
                      <td colSpan={2}>TOTAL</td>
                      <td className="num">{totals.qty}</td>
                    </>
                  )}
                  <td className="num">{money(totals.purchase)}</td>
                  <td className="num">{money(totals.selling)}</td>
                  <td className="num">{totals.discount > 0 ? `- ${money(totals.discount)}` : '-'}</td>
                  <td className={`num pr-profit ${profitClass(totals.profit)}`}>{money(totals.profit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductRecord;