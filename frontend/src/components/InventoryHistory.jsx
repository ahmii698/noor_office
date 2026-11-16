import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  History,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileDown,
  Eye,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api"; // Adjust this path to match your folder structure

const PAGE_SIZE = 15;
const SIDEBAR_WIDTH = 288;

/* Product column mein by default kitne product dikhane hain */
const PRODUCT_PREVIEW_COUNT = 2;

const money = (n) => (n ? `Rs. ${Number(n).toLocaleString("en-PK")}` : "-");

/* Net profit can be negative or zero - always show the value */
const netMoney = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? "-" : ""}Rs. ${Math.abs(v).toLocaleString("en-PK")}`;
};

const toTime = (v) => {
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
};

/*
  Expense / salary dates are usually stored as a DATE only (no time -> 12:00 AM),
  which pushes them to the top of the sheet. When the entry was created around
  that same day, use the real creation time so it shows in the correct sequence.
  If the user deliberately back-dated the entry, keep the date they chose.
*/
const DAY_MS = 24 * 60 * 60 * 1000;
const resolveTime = (dateValue, createdValue) => {
  const d = toTime(dateValue);
  const c = toTime(createdValue);
  if (!c) return d;
  if (!d) return c;
  return Math.abs(c - d) <= 1.5 * DAY_MS ? c : d;
};

const fmtDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { date: "-", time: "" };
  return {
    date: dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
};

/* "A, B, C" wali string ko array mein todta hai */
const splitProducts = (value) =>
  String(value || "")
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

/* Fixed categories of the Expenses page */
const FIXED_CATEGORIES = ["Rent", "Utilities", "Salary", "Office", "Staff"];

const COLUMNS = [
  { label: "S.No", align: "left" },
  { label: "Date", align: "left" },
  { label: "Invoice No", align: "left" },
  { label: "Details", align: "left" },
  { label: "Product", align: "left" },
  { label: "Price", align: "right" },
  { label: "Receivable Payment", align: "right" },
  { label: "Quantity", align: "right" },
  { label: "Cash In", align: "right" },
  { label: "Cash Out", align: "right" },
  { label: "Vendor Payable Inventory", align: "right" },
  { label: "Cash Inventory", align: "right" },
  { label: "Cash IN Hand", align: "right" },
  { label: "Total Inventory Cost", align: "right" },
  { label: "Profit", align: "right" },
  { label: "Expense", align: "right" },
  { label: "Net Profit", align: "right" },
];

const alignCls = { left: "text-left", right: "text-right" };

const RANK = {
  cash: 0,
  purchase: 1,
  credit: 2,
  sell: 3,
  vendorPay: 4,
  expense: 5,
};

const toArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const parseCashEntries = (res) => {
  const body = res?.data || {};
  const list = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
  return list.filter((c) => c && (c.type === "add" || c.type === "withdraw"));
};

const parseManualCash = (res) => {
  const body = res?.data || {};
  const d = body.data ?? body;
  const keys = ["total", "balance", "current_balance", "cash_in_hand", "total_cash", "current_cash"];
  for (const src of [d, body]) {
    if (src && typeof src === "object" && !Array.isArray(src)) {
      for (const k of keys) {
        if (src[k] !== undefined && src[k] !== null && !isNaN(parseFloat(src[k]))) {
          return parseFloat(src[k]);
        }
      }
    }
  }
  const list = Array.isArray(d) ? d : body.history || body.entries || d?.history || d?.entries || [];
  if (Array.isArray(list) && list.length > 0) {
    const latest = list.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
    return parseFloat(latest.balance_after) || 0;
  }
  return 0;
};

const buildEntries = ({
  products,
  vendors,
  invoices,
  histories = {},
  cashEntries,
  manualCash,
  expenses = [],
  employees = [],
}) => {
  const entries = [];

  const soldByName = {};
  invoices.forEach((inv) =>
    (inv.items || []).forEach((item) => {
      const key = (item.service_name || "").toLowerCase().trim();
      if (!key) return;
      soldByName[key] = (soldByName[key] || 0) + (parseInt(item.quantity || 1) || 0);
    })
  );

  const purchaseByName = {};
  products.forEach((p) => {
    const key = (p.name || "").toLowerCase().trim();
    if (key) purchaseByName[key] = parseFloat(p.purchase_price) || 0;
  });

  /* 1) INVENTORY PURCHASE - CASH */
  products
    .filter((p) => !(p.credit_vendor || p.vendor_name))
    .forEach((p) => {
      const key = (p.name || "").toLowerCase().trim();
      const qty = (parseInt(p.quantity) || 0) + (soldByName[key] || 0);
      const price = parseFloat(p.purchase_price) || 0;
      if (qty <= 0) return;
      entries.push({
        key: `prod-${p.id}`,
        rank: RANK.purchase,
        id: Number(p.id) || 0,
        ts: toTime(p.created_at || p.date_added),
        date: p.created_at || p.date_added,
        invoiceNo: p.invoice_number || p.invoice_no || "-",
        details: "Inventory Purchase",
        product: p.name,
        price,
        qty,
        cashIn: 0,
        cashOut: qty * price, // purchase paid in cash = Cash Out
        ownerDelta: qty * price,
        costDelta: qty * price,
        payableDelta: 0,
        isVendor: false,
      });
    });

  /* 2) CREDIT PURCHASE + VENDOR PAYMENTS */
  vendors.forEach((v) => {
    const recordTime = toTime(v.created_at);
    const payments = Array.isArray(v.payments) ? v.payments : [];
    let laterForRecord = 0;

    payments.forEach((p) => {
      const payTime = toTime(p.created_at || p.date || p.payment_date);
      const note = String(p.note || "").toLowerCase();
      const isInitial =
        note.includes("initial") || (recordTime && payTime && Math.abs(payTime - recordTime) <= 5000);
      if (isInitial) return;

      const amount = parseFloat(p.amount) || 0;
      laterForRecord += amount;
      entries.push({
        key: `pay-${v.id}-${p.id ?? payTime}`,
        rank: RANK.vendorPay,
        id: Number(p.id) || 0,
        ts: payTime,
        date: p.created_at || p.date || p.payment_date,
        invoiceNo: v.invoice_number || "-",
        details: "Vendor Payment",
        product: v.products || "-",
        price: 0,
        qty: 0,
        cashIn: 0,
        cashOut: amount,
        ownerDelta: 0,
        payableDelta: -amount,
        isVendor: true,
      });
    });

    const total = parseFloat(v.total_amount) || 0;
    const initialPaid = Math.max(0, (parseFloat(v.paid_amount) || 0) - laterForRecord);
    const qty = parseInt(v.stock_quantity) || 0;

    entries.push({
      key: `cred-${v.id}`,
      rank: RANK.credit,
      id: Number(v.id) || 0,
      ts: recordTime,
      date: v.created_at,
      invoiceNo: v.invoice_number || "-",
      details: "Inventory Purchase - Credit",
      product: v.products || "-",
      price: qty ? total / qty : total,
      qty,
      cashIn: 0,
      cashOut: initialPaid, // amount actually paid to the vendor now = Cash Out
      ownerDelta: initialPaid,
      costDelta: total,
      payableDelta: total - initialPaid,
      isVendor: true,
    });
  });

  /* 3) INVENTORY SELL (billing invoices) + RECEIVABLE PAYMENTS */
  invoices.forEach((inv) => {
    const invNo = inv.invoice_no || inv.invoice_number || `#${inv.id}`;
    const invTime = toTime(inv.invoice_date || inv.created_at);

    /* Later payments (from Reminders / Pending Payments) - initial payment is skipped */
    const laterPays = (histories[inv.invoice_no] || []).filter((p) => {
      const t = toTime(p.paid_at || p.created_at);
      return !(invTime && t && Math.abs(t - invTime) <= 5000);
    });
    const laterSum = laterPays.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

    const totalAmt = parseFloat(inv.total_amount) || 0;
    const initialPaid = Math.max(0, (parseFloat(inv.paid_amount) || 0) - laterSum);
    const ratio = totalAmt > 0 ? Math.min(1, initialPaid / totalAmt) : 1;

    let recovered = 0; // how much of the cost has been recovered so far
    let receivableTotal = 0; // total still pending on this invoice right after the sale
    let totalCost = 0;
    const names = [];

    (inv.items || []).forEach((item, idx) => {
      const qty = parseInt(item.quantity || 1) || 0;
      const unit = parseFloat(item.price ?? item.unit_price ?? item.selling_price) || 0;
      const key = (item.service_name || "").toLowerCase().trim();
      names.push(item.service_name);

      /* Service item = service_category is present and is not "Product" */
      const cat = String(item.service_category || "").trim().toLowerCase();
      const isService = cat !== "" && cat !== "product";

      const hasProfitField =
        item.profit !== undefined && item.profit !== null && !isNaN(parseFloat(item.profit));

      let cost;
      if (isService) {
        cost = 0; // a service has no purchase cost
      } else if (hasProfitField) {
        cost = unit * qty - parseFloat(item.profit);
      } else {
        cost = (parseFloat(item.purchase_price ?? item.cost_price ?? purchaseByName[key]) || 0) * qty;
      }

      const knownCost =
        hasProfitField ||
        item.purchase_price != null ||
        item.cost_price != null ||
        purchaseByName[key] !== undefined;

      const revenue = unit * qty;
      const paidShare = revenue * ratio; // received so far
      const receivable = revenue - paidShare; // still pending
      /* Part of the received money that returns the purchase cost (comes out of Cash Inventory) */
      const costBack = isService ? 0 : Math.min(paidShare, cost);
      /* Service: whatever is received is profit.
         Product: profit only starts AFTER the purchase cost is recovered
         (received money that returns cost is NOT a loss, it is cost recovery). */
      const profit = isService ? paidShare : knownCost ? paidShare - costBack : 0;

      recovered += costBack;
      totalCost += cost;
      receivableTotal += receivable;

      entries.push({
        key: `inv-${inv.id}-${idx}`,
        rank: RANK.sell,
        id: Number(inv.id) * 1000 + idx,
        ts: invTime,
        date: inv.invoice_date || inv.created_at,
        invoiceNo: invNo,
        details: isService ? "Service Sell" : "Inventory Sell",
        product: item.service_name,
        price: unit,
        qty,
        cashIn: paidShare, // full amount received in cash
        cashOut: 0,
        profit,
        receivable,
        receivableShow: receivable, // pending amount shown in the column
        ownerDelta: 0,
        ownerReturn: costBack, // only the cost part is cut from Cash Inventory
        unrecoveredDelta: isService ? 0 : Math.max(0, cost - costBack), // cost not yet recovered (shown as temporary minus in Net Profit)
        costDelta: -cost,
        payableDelta: 0,
        isVendor: false,
      });
    });

    /* Payments received later (Reminders / Pending Payments) */
    let pendingLeft = receivableTotal; // what is still to be received after each payment
    laterPays.forEach((p, i) => {
      const amount = parseFloat(p.amount) || 0;
      if (amount <= 0) return;
      pendingLeft = Math.max(0, pendingLeft - amount);
      const costPart = Math.min(amount, Math.max(0, totalCost - recovered));
      recovered += costPart;
      const date = p.paid_at || p.created_at;

      entries.push({
        key: `recv-${inv.id}-${p.id ?? i}`,
        rank: RANK.sell + 0.5,
        id: Number(p.id) || i,
        ts: toTime(date),
        date,
        invoiceNo: invNo,
        details: "Receivable Payment",
        product: names.join(", ") || "-",
        price: 0,
        qty: 0,
        cashIn: amount, // full amount received (e.g. 2000)
        cashOut: 0,
        profit: amount - costPart,
        receivable: -amount, // used for the Grand Total (outstanding)
        receivableShow: pendingLeft, // remaining pending shown in the column
        ownerDelta: 0,
        ownerReturn: costPart, // cost part cut from Cash Inventory (e.g. 1000)
        unrecoveredDelta: -costPart, // this much cost is now recovered
        costDelta: 0,
        payableDelta: 0,
        isVendor: false,
      });
    });
  });

  /* 3b) EXPENSES - fixed + monthly/extra
      Time is resolved from created_at so the expense appears exactly where it happened */
  expenses.forEach((ex) => {
    const amount = parseFloat(ex.amount) || 0;
    if (amount <= 0) return;
    const ts = resolveTime(ex.expense_date || ex.date, ex.created_at);
    const isFixed = FIXED_CATEGORIES.includes(ex.category);
    entries.push({
      key: `exp-${ex.id}`,
      rank: RANK.expense,
      id: Number(ex.id) || 0,
      ts,
      date: ts,
      invoiceNo: "-",
      details: isFixed ? "Fixed Expense" : "Extra Expense",
      product: ex.description ? `${ex.description} (${ex.category || "General"})` : ex.category || "-",
      price: 0,
      qty: 0,
      cashIn: 0,
      cashOut: 0,
      expense: amount,
      ownerDelta: 0,
      payableDelta: 0,
      isVendor: false,
    });
  });

  /* 3c) EMPLOYEE SALARY - each payment on its own date/time */
  employees.forEach((emp) => {
    (Array.isArray(emp.payments) ? emp.payments : []).forEach((p) => {
      const amount = parseFloat(p.amount) || 0;
      if (amount <= 0) return;
      const ts = resolveTime(p.payment_date, p.created_at);
      entries.push({
        key: `sal-${emp.id}-${p.id}`,
        rank: RANK.expense,
        id: Number(p.id) || 0,
        ts,
        date: ts,
        invoiceNo: "-",
        details: "Salary",
        product: emp.name || "-",
        price: 0,
        qty: 0,
        cashIn: 0,
        cashOut: 0,
        expense: amount,
        ownerDelta: 0,
        payableDelta: 0,
        isVendor: false,
      });
    });
  });

  /* 4) Manual Cash in Hand */
  if (cashEntries.length > 0) {
    cashEntries.forEach((c) => {
      const amount = parseFloat(c.amount) || 0;
      if (amount <= 0) return;
      const isAdd = c.type === "add";
      entries.push({
        key: `cash-${c.id}`,
        rank: RANK.cash,
        id: Number(c.id) || 0,
        ts: toTime(c.created_at),
        date: c.created_at,
        invoiceNo: "-",
        details: isAdd ? "Cash in Hand (Add)" : "Cash in Hand (Withdraw)",
        product: c.note || "-",
        price: 0,
        qty: 0,
        cashIn: isAdd ? amount : 0,
        cashOut: isAdd ? 0 : amount,
        ownerDelta: 0,
        payableDelta: 0,
        isVendor: false,
      });
    });
  } else if (manualCash > 0) {
    const firstTs = entries.length ? Math.min(...entries.map((e) => e.ts)) : Date.now();
    entries.push({
      key: "manual-cash",
      rank: RANK.cash,
      id: 0,
      ts: firstTs,
      date: firstTs,
      invoiceNo: "-",
      details: "Cash in Hand (Manual)",
      product: "-",
      price: 0,
      qty: 0,
      cashIn: manualCash,
      cashOut: 0,
      ownerDelta: 0,
      payableDelta: 0,
      isVendor: false,
    });
  }

  entries.sort((a, b) => a.ts - b.ts || a.rank - b.rank || a.id - b.id);

  return entries;
};

const getPageList = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) result.push("...");
    result.push(p);
  });
  return result;
};

const PageBtn = ({ children, onClick, disabled, active, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
      active
        ? "bg-amber-400 text-slate-900"
        : "bg-slate-800/70 text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800/70"
    }`}
  >
    {children}
  </button>
);

/* Product column: by default sirf pehle 2 product, baqi "View" button se */
const ProductCell = ({ value, onView }) => {
  const items = splitProducts(value);

  if (items.length === 0) return <span>-</span>;

  if (items.length <= PRODUCT_PREVIEW_COUNT) {
    return (
      <div className="max-w-[240px] space-y-0.5 break-words">
        {items.map((name, i) => (
          <div key={i}>{name}</div>
        ))}
      </div>
    );
  }

  const preview = items.slice(0, PRODUCT_PREVIEW_COUNT);
  const hidden = items.length - PRODUCT_PREVIEW_COUNT;

  return (
    <div className="max-w-[240px]">
      <div className="space-y-0.5">
        {preview.map((name, i) => (
          <div key={i} className="truncate" title={name}>
            {name}
          </div>
        ))}
      </div>
      <button
        onClick={() => onView(items)}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-1 text-xs font-bold text-amber-400 transition hover:bg-amber-400 hover:text-slate-900"
      >
        <Eye size={13} />
        View (+{hidden})
      </button>
    </div>
  );
};

const plainNum = (n) => Number(n || 0);

const exportFileName = () => `Balance_Sheet_${new Date().toISOString().slice(0, 10)}`;

export default function InventoryHistory() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [page, setPage] = useState(1);
  const [viewProducts, setViewProducts] = useState(null); // popup mein dikhane wali poori product list

  const [raw, setRaw] = useState({
    products: [],
    vendors: [],
    invoices: [],
    histories: {},
    cashEntries: [],
    manualCash: 0,
    expenses: [],
    employees: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const jumpedToLast = useRef(false);
  const tableScrollRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prodRes, vendRes, invRes, cashRes, expRes, empRes] = await Promise.all([
        api.get("/products", { params: { show_hidden: "true" } }),
        api.get("/credit/vendors"),
        api.get("/invoices"),
        api.get("/cash-in-hand").catch(() => null),
        api.get("/expenses").catch(() => null),
        api.get("/employees").catch(() => null),
      ]);

      const invoices = toArray(invRes);

      /* Payment history for every invoice (initial + later Reminders payments) */
      const histories = {};
      await Promise.all(
        invoices
          .filter((i) => i.invoice_no)
          .map(async (inv) => {
            try {
              const r = await api.get(`/payment-history/${inv.invoice_no}`);
              histories[inv.invoice_no] = Array.isArray(r?.data?.data) ? r.data.data : [];
            } catch {
              histories[inv.invoice_no] = [];
            }
          })
      );

      setRaw({
        products: toArray(prodRes),
        vendors: toArray(vendRes),
        invoices,
        histories,
        cashEntries: cashRes ? parseCashEntries(cashRes) : [],
        manualCash: cashRes ? parseManualCash(cashRes) : 0,
        expenses: expRes ? toArray(expRes) : [],
        employees: empRes ? toArray(empRes) : [],
      });
      jumpedToLast.current = false;
    } catch (e) {
      console.error("Balance sheet load error:", e);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Esc dabane par popup band */
  useEffect(() => {
    if (!viewProducts) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewProducts(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewProducts]);

  const rows = useMemo(() => {
    const entries = buildEntries(raw);
    let cash = 0;
    let payable = 0;
    let owner = 0;
    let invCost = 0;
    let profitSum = 0;
    let expenseSum = 0;
    let unrecovered = 0; // sold-item cost not yet returned by customer payments
    return entries.map((e, i) => {
      cash += e.cashIn - e.cashOut; // purchases are now in cashOut, so ownerDelta is not subtracted again
      profitSum += e.profit || 0;
      expenseSum += e.expense || 0;
      unrecovered += e.unrecoveredDelta || 0;
      payable += e.payableDelta;
      owner = Math.max(0, owner + e.ownerDelta - (e.ownerReturn || 0));
      invCost += e.costDelta || 0;
      return {
        ...e,
        sr: i + 1,
        cashInHand: cash,
        vendorPay: e.isVendor ? payable : 0,
        ownerCapital: owner,
        ownerReturn: e.ownerReturn || 0,
        inventoryCost: invCost,
        receivable: e.receivable || 0,
        receivableShow: e.receivableShow || 0,
        netProfit: profitSum - expenseSum - unrecovered, // running: profit - expense - cost still to be recovered (can be negative)
      };
    });
  }, [raw]);

  const totals = useMemo(
    () => ({
      cashIn: rows.reduce((s, r) => s + r.cashIn, 0),
      cashOut: rows.reduce((s, r) => s + r.cashOut, 0),
      expense: rows.reduce((s, r) => s + (r.expense || 0), 0),
      profit: rows.reduce((s, r) => s + (r.profit || 0), 0),
      receivable: rows.reduce((s, r) => s + (r.receivable || 0), 0),
      netProfit: rows.length ? rows[rows.length - 1].netProfit : 0,
      vendorPay: rows.reduce((s, r) => s + r.payableDelta, 0),
      ownerCapital: rows.length ? rows[rows.length - 1].ownerCapital : 0,
      inventoryCost: rows.length ? rows[rows.length - 1].inventoryCost : 0,
      cashInHand: rows.length ? rows[rows.length - 1].cashInHand : 0,
    }),
    [rows]
  );

  /* ---------- Export: Excel ---------- */
  const exportExcel = () => {
    if (!rows.length) return;

    const header = COLUMNS.map((c) => c.label);
    const body = rows.map((r) => {
      const dt = fmtDate(r.date);
      return [
        r.sr,
        `${dt.date} ${dt.time}`.trim(),
        r.invoiceNo,
        r.details,
        r.product || "-",
        plainNum(r.price),
        plainNum(r.receivableShow),
        plainNum(r.qty),
        plainNum(r.cashIn),
        plainNum(r.cashOut),
        r.isVendor ? plainNum(r.vendorPay) : "",
        plainNum(r.ownerCapital),
        plainNum(r.cashInHand),
        plainNum(r.inventoryCost),
        plainNum(r.profit),
        plainNum(r.expense),
        plainNum(r.netProfit),
      ];
    });

    const totalRow = [
      "", "", "", "", "",
      "GRAND TOTAL",
      plainNum(totals.receivable),
      "",
      plainNum(totals.cashIn),
      plainNum(totals.cashOut),
      plainNum(totals.vendorPay),
      plainNum(totals.ownerCapital),
      plainNum(totals.cashInHand),
      plainNum(totals.inventoryCost),
      plainNum(totals.profit),
      plainNum(totals.expense),
      plainNum(totals.netProfit),
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...body, totalRow]);
    ws["!cols"] = [
      { wch: 7 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 26 },
      { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 14 },
      { wch: 14 }, { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `${exportFileName()}.xlsx`);
  };

  /* ---------- Export: PDF ---------- */
  const exportPdf = () => {
    if (!rows.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });

    doc.setFontSize(16);
    doc.text("Balance Sheet", 40, 36);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString("en-GB")}`, 40, 52);

    const num = (n) => Number(n || 0).toLocaleString("en-PK");

    const body = rows.map((r) => {
      const dt = fmtDate(r.date);
      return [
        r.sr,
        `${dt.date}\n${dt.time}`,
        r.invoiceNo,
        r.details,
        r.product || "-",
        r.price ? num(r.price) : "-",
        r.receivableShow ? num(r.receivableShow) : "-",
        r.qty || "-",
        r.cashIn ? num(r.cashIn) : "-",
        r.cashOut ? num(r.cashOut) : "-",
        r.isVendor ? num(r.vendorPay) : "-",
        num(r.ownerCapital),
        num(r.cashInHand),
        num(r.inventoryCost),
        r.profit ? num(r.profit) : "-",
        r.expense ? num(r.expense) : "-",
        num(r.netProfit),
      ];
    });

    const foot = [
      [
        { content: "GRAND TOTAL", colSpan: 6, styles: { halign: "right" } },
        num(totals.receivable),
        "",
        num(totals.cashIn),
        num(totals.cashOut),
        num(totals.vendorPay),
        num(totals.ownerCapital),
        num(totals.cashInHand),
        num(totals.inventoryCost),
        num(totals.profit),
        num(totals.expense),
        num(totals.netProfit),
      ],
    ];

    autoTable(doc, {
      startY: 66,
      head: [COLUMNS.map((c) => c.label)],
      body,
      foot,
      showFoot: "lastPage",
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      footStyles: { fillColor: [226, 232, 240], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "left", cellWidth: 34 },
        4: { cellWidth: 150 },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
        8: { halign: "right" },
        9: { halign: "right" },
        10: { halign: "right" },
        11: { halign: "right" },
        12: { halign: "right" },
        13: { halign: "right" },
        14: { halign: "right" },
        15: { halign: "right" },
        16: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index >= 5) {
          data.cell.styles.halign = "right";
        }
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`${exportFileName()}.pdf`);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    if (!loading && rows.length && !jumpedToLast.current) {
      jumpedToLast.current = true;
      setPage(totalPages);
    }
  }, [loading, rows.length, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [page]);

  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = rows.length ? startIdx + 1 : 0;
  const showingTo = Math.min(startIdx + PAGE_SIZE, rows.length);

  const exportDisabled = loading || rows.length === 0;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex flex-col overflow-hidden bg-[#050a14] text-slate-200 transition-all duration-300"
      style={{ left: showSidebar ? SIDEBAR_WIDTH : 0 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0b1220] px-4 py-3">
          <button
            onClick={() => setShowSidebar((s) => !s)}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
              showSidebar
                ? "border-amber-400 bg-amber-400 text-slate-900"
                : "border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {showSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
            <History className="text-amber-400" size={18} />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight text-white">Balance Sheet</h1>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh this page"
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={exportExcel}
            disabled={exportDisabled}
            title="Download Excel report"
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600/80 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>

          <button
            onClick={exportPdf}
            disabled={exportDisabled}
            title="Download PDF report"
            className="flex h-10 items-center gap-2 rounded-lg bg-red-600/80 px-4 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown size={16} />
            PDF
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220]">
          <div ref={tableScrollRef} className="min-h-0 flex-1 overflow-auto">
            {loading && rows.length === 0 ? (
              <div className="flex h-full items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin text-amber-400" size={22} />
                Loading balance sheet...
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <p>{error}</p>
                <button
                  onClick={loadData}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-300"
                >
                  Retry
                </button>
              </div>
            ) : (
              <table className="w-full min-w-[2000px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[#0b1220]">
                  <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                    {COLUMNS.map((c) => (
                      <th
                        key={c.label}
                        className={`whitespace-nowrap border-r border-slate-800 px-4 py-3.5 last:border-r-0 ${alignCls[c.align]}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-4 py-10 text-center font-semibold text-slate-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
                      const dt = fmtDate(r.date);
                      return (
                        <tr key={r.key} className="border-b border-slate-800/70 hover:bg-slate-800/30">
                          <td className="border-r border-slate-800/60 px-4 py-3 text-slate-500">{r.sr}</td>
                          <td className="whitespace-nowrap border-r border-slate-800/60 px-4 py-3">
                            <div className="text-slate-300">{dt.date}</div>
                            <div className="text-xs text-slate-500">{dt.time}</div>
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 font-semibold text-amber-400">
                            {r.invoiceNo}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-slate-300">{r.details}</td>
                          <td className="border-r border-slate-800/60 px-4 py-3 font-medium text-white">
                            <ProductCell value={r.product} onView={setViewProducts} />
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right">{money(r.price)}</td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-yellow-300">
                            {money(r.receivableShow)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right">{r.qty || "-"}</td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-emerald-400">
                            {money(r.cashIn)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-rose-400">
                            {money(r.cashOut)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-purple-300">
                            {r.isVendor ? money(r.vendorPay) : "-"}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-blue-400">
                            {r.ownerReturn > 0 ? (
                              <>
                                <div>Rs. {Number(r.ownerCapital).toLocaleString("en-PK")}</div>
                                <div className="text-xs font-semibold text-rose-400">
                                  − Rs. {Number(r.ownerReturn).toLocaleString("en-PK")}
                                </div>
                              </>
                            ) : (
                              money(r.ownerCapital)
                            )}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-bold text-white">
                            {money(r.cashInHand)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-cyan-400">
                            {money(r.inventoryCost)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-lime-400">
                            {money(r.profit)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-orange-400">
                            {money(r.expense)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              r.netProfit < 0 ? "text-rose-400" : "text-teal-300"
                            }`}
                          >
                            {netMoney(r.netProfit)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                <tfoot className="sticky bottom-0 bg-[#0b1220]">
                  <tr className="border-t-2 border-slate-600 text-sm font-bold">
                    <td colSpan={6} className="px-4 py-3.5 text-right uppercase tracking-wide text-slate-400">
                      Grand Total
                    </td>
                    <td className="px-4 py-3.5 text-right text-yellow-300">{money(totals.receivable)}</td>
                    <td className="px-4 py-3.5"></td>
                    <td className="px-4 py-3.5 text-right text-emerald-400">{money(totals.cashIn)}</td>
                    <td className="px-4 py-3.5 text-right text-rose-400">{money(totals.cashOut)}</td>
                    <td className="px-4 py-3.5 text-right text-purple-300">{money(totals.vendorPay)}</td>
                    <td className="px-4 py-3.5 text-right text-blue-400">{money(totals.ownerCapital)}</td>
                    <td className="px-4 py-3.5 text-right text-white">{money(totals.cashInHand)}</td>
                    <td className="px-4 py-3.5 text-right text-cyan-400">{money(totals.inventoryCost)}</td>
                    <td className="px-4 py-3.5 text-right text-lime-400">{money(totals.profit)}</td>
                    <td className="px-4 py-3.5 text-right text-orange-400">{money(totals.expense)}</td>
                    <td
                      className={`px-4 py-3.5 text-right ${
                        totals.netProfit < 0 ? "text-rose-400" : "text-teal-300"
                      }`}
                    >
                      {netMoney(totals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-300">{showingFrom}</span> to{" "}
              <span className="font-semibold text-slate-300">{showingTo}</span> of{" "}
              <span className="font-semibold text-slate-300">{rows.length}</span> records
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <PageBtn title="First" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft size={16} />
              </PageBtn>
              <PageBtn title="Previous" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={16} />
              </PageBtn>

              {getPageList(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1 text-slate-600">
                    ...
                  </span>
                ) : (
                  <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>
                    {p}
                  </PageBtn>
                )
              )}

              <PageBtn
                title="Next"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={16} />
              </PageBtn>
              <PageBtn title="Last" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <ChevronsRight size={16} />
              </PageBtn>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Products popup - poori list yahan dikhti hai */}
      {viewProducts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewProducts(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b1220] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h3 className="text-base font-bold text-white">
                All Products <span className="text-amber-400">({viewProducts.length})</span>
              </h3>
              <button
                onClick={() => setViewProducts(null)}
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/70 text-slate-300 transition hover:bg-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <ol className="flex-1 space-y-1 overflow-y-auto p-4">
              {viewProducts.map((name, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg bg-slate-800/40 px-3 py-2 text-sm text-white"
                >
                  <span className="w-6 shrink-0 text-right font-semibold text-slate-500">{i + 1}.</span>
                  <span className="break-words font-medium">{name}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}