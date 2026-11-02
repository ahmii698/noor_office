// src/hooks/useInventoryCash.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const unwrap = (res) =>
  Array.isArray(res.data) ? res.data
    : (Array.isArray(res.data?.data) ? res.data.data : []);

const safe = async (fn, fallback) => {
  try { return await fn(); } catch (e) { console.error(e); return fallback; }
};

// Direct old battery purchase ki pehchan (BillingInvoice ke note se)
const isDirectOldPurchase = (b) =>
  String(b?.note || '').toLowerCase().includes('direct old battery purchase');

const parseManualCash = (response) => {
  const body = response.data || {};
  const d = body.data ?? body;
  let total = null;
  const keys = ['total', 'balance', 'current_balance', 'cash_in_hand', 'total_cash', 'current_cash'];
  for (const src of [d, body]) {
    if (src && typeof src === 'object' && !Array.isArray(src)) {
      for (const k of keys) {
        if (src[k] !== undefined && src[k] !== null && !isNaN(parseFloat(src[k]))) {
          total = parseFloat(src[k]);
          break;
        }
      }
    }
    if (total !== null) break;
  }
  if (total === null) {
    const list = Array.isArray(d) ? d : (body.history || body.entries || d?.history || d?.entries || []);
    if (Array.isArray(list) && list.length > 0) {
      const latest = list.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
      total = parseFloat(latest.balance_after) || 0;
    }
  }
  return total ?? 0;
};

const compute = ({ products, invoices, vendors, manualCash, oldBatteries }) => {
  // ---- Vendor ----
  let vendorPayable = 0, vendorLaterPayments = 0, vendorInitialPaid = 0;
  vendors.forEach(v => {
    vendorPayable += parseFloat(v.balance_amount) || 0;
    const payments = Array.isArray(v.payments) ? v.payments : [];
    const recordTime = new Date(v.created_at).getTime();
    let laterForRecord = 0;
    payments.forEach(p => {
      const payTime = new Date(p.created_at || p.date || p.payment_date).getTime();
      const note = String(p.note || '').toLowerCase();
      const isInitial =
        note.includes('initial') ||
        (!isNaN(recordTime) && !isNaN(payTime) && Math.abs(payTime - recordTime) <= 5000);
      if (!isInitial) laterForRecord += parseFloat(p.amount) || 0;
    });
    vendorLaterPayments += laterForRecord;
    vendorInitialPaid += Math.max(0, (parseFloat(v.paid_amount) || 0) - laterForRecord);
  });

  // ---- Cash par khareeda hua maal ----
  const soldByName = {};
  invoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      const key = (item.service_name || '').toLowerCase().trim();
      if (!key) return;
      soldByName[key] = (soldByName[key] || 0) + (parseInt(item.quantity || 1) || 0);
    });
  });

  const cashProductsCost = products
    .filter(p => !(p.credit_vendor || p.vendor_name))
    .reduce((sum, p) => {
      const key = (p.name || '').toLowerCase().trim();
      const purchasedQty = (parseInt(p.quantity) || 0) + (soldByName[key] || 0);
      return sum + (parseFloat(p.purchase_price) || 0) * purchasedQty;
    }, 0);

  // ✅ Customer se seedha khareedi hui old batteries (cash se gayi)
  const oldBatteryDirectCost = oldBatteries
    .filter(isDirectOldPurchase)
    .reduce((sum, b) => sum + (parseFloat(b.trade_in_amount) || 0), 0);

  const ownerCapitalInvested =
    cashProductsCost + vendorInitialPaid + vendorLaterPayments + oldBatteryDirectCost;

  // ---- Sales se wapas aayi cost ----
  const totalSale = invoices.reduce((s, inv) => s + (parseFloat(inv.total_amount) || 0), 0);

  const purchaseByName = {};
  products.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (key) purchaseByName[key] = parseFloat(p.purchase_price) || 0;
  });
  // ✅ Old battery bechne par uski khareed-cost wapas aaye (invoice mein naam "Old Battery: <name>" hota hai)
  oldBatteries.forEach(b => {
    const key = `old battery: ${b.battery_name || ''}`.toLowerCase().trim();
    purchaseByName[key] = parseFloat(b.trade_in_amount) || 0;
  });

  let totalProfit = 0;
  invoices.forEach(inv => {
    let itemsProfit = 0;
    (inv.items || []).forEach(item => {
      const qty = parseInt(item.quantity || 1) || 0;
      const unitPrice = parseFloat(item.price ?? item.unit_price ?? item.selling_price) || 0;
      const key = (item.service_name || '').toLowerCase().trim();
      if (item.profit !== undefined && item.profit !== null && !isNaN(parseFloat(item.profit))) {
        itemsProfit += parseFloat(item.profit);
      } else {
        const cost = parseFloat(item.purchase_price ?? item.cost_price ?? purchaseByName[key]) || 0;
        itemsProfit += (unitPrice - cost) * qty;
      }
    });
    const discount = parseFloat(inv.discount_amount ?? inv.discount) || 0;
    totalProfit += itemsProfit - discount;
  });

  const inventoryCashFromSales = totalSale - totalProfit - vendorLaterPayments;

  const inventoryCashInHand =
    inventoryCashFromSales + manualCash - cashProductsCost - vendorInitialPaid - oldBatteryDirectCost;

  const ownerCapital = Math.max(0, ownerCapitalInvested - (inventoryCashFromSales + vendorLaterPayments));

  return { vendorPayable, inventoryCashInHand, ownerCapital };
};

const EMPTY = { products: [], invoices: [], vendors: [], manualCash: 0, oldBatteries: [] };

export default function useInventoryCash() {
  const [data, setData] = useState(EMPTY);

  const refresh = useCallback(async () => {
    const [products, invoices, vendors, manualCash, oldBatteries] = await Promise.all([
      safe(async () => unwrap(await api.get('/products', { params: { show_hidden: 'true' } })), []),
      safe(async () => unwrap(await api.get('/invoices')), []),
      safe(async () => unwrap(await api.get('/credit/vendors')), []),
      safe(async () => parseManualCash(await api.get('/cash-in-hand')), 0),
      safe(async () => unwrap(await api.get('/old-batteries')), []),
    ]);
    setData({ products, invoices, vendors, manualCash, oldBatteries });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = useMemo(() => compute(data), [data]);

  // Cash kam ho to toast dikhao aur false do
  const ensureCash = useCallback((required) => {
    if (required > totals.inventoryCashInHand + 0.001) {
      toast.error(
        `Not enough cash in hand! Available: Rs. ${Math.max(0, totals.inventoryCashInHand).toLocaleString()}. ` +
        `Pehle Cash in Hand barhao.`
      );
      return false;
    }
    return true;
  }, [totals.inventoryCashInHand]);

  return { ...totals, ensureCash, refresh };
}