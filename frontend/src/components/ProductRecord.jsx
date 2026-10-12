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
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import './ProductRecord.css';

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// invoice_date ko local date (yyyy-mm-dd) me badalta hai
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

  // Product name -> purchase price (current inventory se)
  const purchaseMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      map.set(String(p.name || '').trim().toLowerCase(), Number(p.purchase_price) || 0);
    });
    return map;
  }, [products]);

  // Har bika hua product = aik row
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
        // Sirf products (services nahi)
        if (it.service_category !== 'Product') return;

        const qty = Number(it.quantity) || 0;
        const selling = (Number(it.price) || 0) * qty;
        const key = String(it.service_name || '').trim().toLowerCase();
        const purchase = (purchaseMap.get(key) || 0) * qty;

        // Invoice ka discount items me hissay ke hisab se baanta gaya hai
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

    // Naya pehle
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

  // Product-wise summary (kon zyada bika, kon kam)
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

  // Dashboard ke header ke Excel / PDF buttons yahan ke export chalate hain
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

      {/* ===== Summary Cards ===== */}
      <div className="pr-stats">
        <div className="pr-stat blue">
          <span>Total Sold Qty</span>
          <strong>{totals.qty.toLocaleString()}</strong>
        </div>
        <div className="pr-stat slate">
          <span>Purchase Value</span>
          <strong>{money(totals.purchase)}</strong>
        </div>
        <div className="pr-stat red">
          <span>Selling Value</span>
          <strong>{money(totals.selling)}</strong>
        </div>
        <div className="pr-stat amber">
          <span>Discount Diya</span>
          <strong>{money(totals.discount)}</strong>
        </div>
        <div className={`pr-stat ${totals.profit >= 0 ? 'green' : 'darkred'}`}>
          <span>Net Profit</span>
          <strong>{money(totals.profit)}</strong>
        </div>
      </div>

      {/* ===== Best / Worst cards ===== */}
      {!loading && (
        <div className="pr-insights">
          {/* Sab se zyada bika */}
          <div className="pr-icard good">
            <div className="pr-icard-icon">
              <FiTrendingUp />
            </div>
            <div className="pr-icard-body">
              <span className="pr-icard-label">Sab se zyada bika</span>
              <strong className="pr-icard-title" title={topSeller?.name || ''}>
                {topSeller ? topSeller.name : '-'}
              </strong>
              <span className="pr-icard-sub">
                {topSeller
                  ? `${topSeller.qty} units • Profit ${money(topSeller.profit)}`
                  : `${filterLabel} me koi sale nahi`}
              </span>
            </div>
          </div>

          {/* Sab se kam bika */}
          <div className="pr-icard warn">
            <div className="pr-icard-icon">
              <FiTrendingDown />
            </div>
            <div className="pr-icard-body">
              <span className="pr-icard-label">Sab se kam bika</span>
              <strong className="pr-icard-title" title={lowSeller?.name || ''}>
                {lowSeller ? lowSeller.name : '-'}
              </strong>
              <span className="pr-icard-sub">
                {lowSeller
                  ? `${lowSeller.qty} units • Profit ${money(lowSeller.profit)}`
                  : summaryRows.length === 1
                  ? 'Sirf aik product bika hai'
                  : `${filterLabel} me koi sale nahi`}
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
            Showing: <b>{filterLabel}</b> &nbsp;•&nbsp; Profit = Selling − Discount − Purchase. Discount invoice ka hota hai,
            isliye items me unki value ke hisab se bata gaya hai.
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
                      <p>Koi sale record nahi mila.</p>
                      <span>Filter change karo ya billing se product becho.</span>
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
                        <span className="pr-warn-tag" title="Ye product ab inventory me nahi, isliye purchase value 0 hai">
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