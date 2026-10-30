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
} from "lucide-react";
import api from "../services/api"; // <-- apne folder ke hisaab se path theek kar lena

/* Ek page par kitne records dikhane hain */
const PAGE_SIZE = 15;

/* Sidebar ki width (px). Alag ho to yeh number change kar dena. */
const SIDEBAR_WIDTH = 288;

const money = (n) => (n ? `Rs. ${Number(n).toLocaleString("en-PK")}` : "-");

const toTime = (v) => {
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
};

const fmtDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { date: "-", time: "" };
  return {
    date: dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
};

const COLUMNS = [
  { label: "S.No", align: "left" },
  { label: "Date", align: "left" },
  { label: "Invoice No", align: "left" },
  { label: "Details", align: "left" },
  { label: "Product", align: "left" },
  { label: "Price", align: "right" },
  { label: "Quantity", align: "right" },
  { label: "Cash In", align: "right" },
  { label: "Cash Out", align: "right" },
  { label: "Vend Pay", align: "right" },
  { label: "Owner Capital", align: "right" },
  { label: "Inventory Cost", align: "right" },
  { label: "Cash in Hand", align: "right" },
];

const alignCls = { left: "text-left", right: "text-right" };

/* Same time par aane wali rows ka order (chhota number pehle) */
const RANK = {
  cash: 0,
  purchase: 1,
  credit: 2,
  sell: 3,
  vendorPay: 4,
};

/* ---------- API response ko array banane ke helpers ---------- */
const toArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

/* Cash in Hand ki poori history (add / withdraw entries) */
const parseCashEntries = (res) => {
  const body = res?.data || {};
  const list = Array.isArray(body.data) ? body.data : Array.isArray(body) ? body : [];
  return list.filter((c) => c && (c.type === "add" || c.type === "withdraw"));
};

/* Agar history na mile to sirf current balance (fallback) */
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

/* ---------- Sab sources se ledger rows banana ---------- */
const buildEntries = ({ products, vendors, invoices, cashEntries, manualCash }) => {
  const entries = [];

  /* Sale ke items ka naam -> kitna bika (cash purchase qty nikalne ke liye) */
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

  /* 1) INVENTORY PURCHASE - CASH (jin products ka vendor nahi)
        Yeh Cash Out mein nahi, Owner Capital mein jayega.
        Cash in Hand phir bhi kam hoga. */
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
        cashOut: 0,
        ownerDelta: qty * price,
        costDelta: qty * price, // maal aaya -> inventory cost barhi
        payableDelta: 0,
        isVendor: false,
      });
    });

  /* 2) CREDIT PURCHASE + VENDOR PAYMENTS (yeh Cash Out mein hi jayenge) */
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
      cashOut: 0,
      ownerDelta: initialPaid, // purchase ke waqt jo apni cash di wo Owner Capital hai
      costDelta: total, // poore bill ka maal aaya -> inventory cost barhi
      payableDelta: total - initialPaid,
      isVendor: true,
    });
  });

  /* 3) INVENTORY SELL (billing invoices) - har item ki cost wapas = Cash In */
  invoices.forEach((inv) => {
    (inv.items || []).forEach((item, idx) => {
      const qty = parseInt(item.quantity || 1) || 0;
      const unit = parseFloat(item.price ?? item.unit_price ?? item.selling_price) || 0;
      const key = (item.service_name || "").toLowerCase().trim();

      let cost;
      if (item.profit !== undefined && item.profit !== null && !isNaN(parseFloat(item.profit))) {
        cost = unit * qty - parseFloat(item.profit);
      } else {
        cost = (parseFloat(item.purchase_price ?? item.cost_price ?? purchaseByName[key]) || 0) * qty;
      }

      entries.push({
        key: `inv-${inv.id}-${idx}`,
        rank: RANK.sell,
        id: Number(inv.id) * 1000 + idx,
        ts: toTime(inv.invoice_date || inv.created_at),
        date: inv.invoice_date || inv.created_at,
        invoiceNo: inv.invoice_no || inv.invoice_number || `#${inv.id}`,
        details: "Inventory Sell",
        product: item.service_name,
        price: unit,
        qty,
        cashIn: cost,
        cashOut: 0,
        ownerDelta: 0,
        ownerReturn: cost, // maal bika to owner ka lagaya hua capital wapas nikal aaya
        costDelta: -cost, // maal bika -> inventory cost kam hui
        payableDelta: 0,
        isVendor: false,
      });
    });
  });

  /* 4) Manual Cash in Hand - har add / withdraw apni asli date par */
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
    /* History nahi mili to sirf balance ek row mein */
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

  /* Time ke hisaab se sort: PURANA PEHLE, SAB SE NAYA SAB SE NEECHE.
     Time barabar ho to rank, phir id se order fix rakha hai. */
  entries.sort((a, b) => a.ts - b.ts || a.rank - b.rank || a.id - b.id);

  return entries;
};

/* Page numbers banata hai, jaise: 1 ... 4 5 6 ... 9 */
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

export default function InventoryHistory() {
  /* By default sidebar band - sirf sheet dikhegi */
  const [showSidebar, setShowSidebar] = useState(false);
  const [page, setPage] = useState(1);

  const [raw, setRaw] = useState({
    products: [],
    vendors: [],
    invoices: [],
    cashEntries: [],
    manualCash: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const jumpedToLast = useRef(false);
  const tableScrollRef = useRef(null);

  /* Sab jagah se data lana */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prodRes, vendRes, invRes, cashRes] = await Promise.all([
        api.get("/products", { params: { show_hidden: "true" } }),
        api.get("/credit/vendors"),
        api.get("/invoices"),
        api.get("/cash-in-hand").catch(() => null),
      ]);
      setRaw({
        products: toArray(prodRes),
        vendors: toArray(vendRes),
        invoices: toArray(invRes),
        cashEntries: cashRes ? parseCashEntries(cashRes) : [],
        manualCash: cashRes ? parseManualCash(cashRes) : 0,
      });
      /* Refresh ke baad dobara aakhri page (sab se naye records) par jao */
      jumpedToLast.current = false;
    } catch (e) {
      console.error("Inventory history load error:", e);
      setError("Data load nahi ho saka. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Rows + running Cash in Hand + running Vendor Pay + running Owner Capital */
  const rows = useMemo(() => {
    const entries = buildEntries(raw);
    let cash = 0;
    let payable = 0;
    let owner = 0;
    let invCost = 0;
    return entries.map((e, i) => {
      cash += e.cashIn - e.cashOut - e.ownerDelta; // cash dono surat mein kam hoti hai
      payable += e.payableDelta;
      owner = Math.max(0, owner + e.ownerDelta - (e.ownerReturn || 0)); // 0 se neeche nahi jayega
      invCost += e.costDelta || 0; // abhi stock mein maal ki total cost
      return {
        ...e,
        sr: i + 1,
        cashInHand: cash,
        vendorPay: e.isVendor ? payable : 0,
        ownerCapital: owner,
        inventoryCost: invCost,
      };
    });
  }, [raw]);

  /* Grand totals */
  const totals = useMemo(
    () => ({
      cashIn: rows.reduce((s, r) => s + r.cashIn, 0),
      cashOut: rows.reduce((s, r) => s + r.cashOut, 0),
      vendorPay: rows.reduce((s, r) => s + r.payableDelta, 0),
      ownerCapital: rows.length ? rows[rows.length - 1].ownerCapital : 0,
      inventoryCost: rows.length ? rows[rows.length - 1].inventoryCost : 0,
      cashInHand: rows.length ? rows[rows.length - 1].cashInHand : 0,
    }),
    [rows]
  );

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  /* Data aane par aakhri page (sab se naye records) khol do */
  useEffect(() => {
    if (!loading && rows.length && !jumpedToLast.current) {
      jumpedToLast.current = true;
      setPage(totalPages);
    }
  }, [loading, rows.length, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* Page badalne par table ko wapas upar scroll karo */
  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [page]);

  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = rows.length ? startIdx + 1 : 0;
  const showingTo = Math.min(startIdx + PAGE_SIZE, rows.length);

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex flex-col overflow-hidden bg-[#050a14] text-slate-200 transition-all duration-300"
      style={{ left: showSidebar ? SIDEBAR_WIDTH : 0 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col gap-4 p-4 md:p-6">
        {/* Top bar with toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0b1220] px-4 py-3">
          <button
            onClick={() => setShowSidebar((s) => !s)}
            title={showSidebar ? "Sidebar chhupao" : "Sidebar dikhao"}
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
            <h1 className="text-lg font-bold leading-tight text-white">Inventory History</h1>
            <p className="text-xs text-slate-500">Balance Sheet</p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Sheet card */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220]">
          <div ref={tableScrollRef} className="min-h-0 flex-1 overflow-auto">
            {loading && rows.length === 0 ? (
              <div className="flex h-full items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin text-amber-400" size={22} />
                Loading history...
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
              <table className="w-full min-w-[1450px] border-collapse text-sm">
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
                        Koi record nahi mila
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
                            {r.product || "-"}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right">{money(r.price)}</td>
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
                            {money(r.ownerCapital)}
                          </td>
                          <td className="border-r border-slate-800/60 px-4 py-3 text-right font-semibold text-cyan-400">
                            {money(r.inventoryCost)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">{money(r.cashInHand)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                <tfoot className="sticky bottom-0 bg-[#0b1220]">
                  <tr className="border-t-2 border-slate-600 text-sm font-bold">
                    <td colSpan={7} className="px-4 py-3.5 text-right uppercase tracking-wide text-slate-400">
                      Grand Total
                    </td>
                    <td className="px-4 py-3.5 text-right text-emerald-400">{money(totals.cashIn)}</td>
                    <td className="px-4 py-3.5 text-right text-rose-400">{money(totals.cashOut)}</td>
                    <td className="px-4 py-3.5 text-right text-purple-300">{money(totals.vendorPay)}</td>
                    <td className="px-4 py-3.5 text-right text-blue-400">{money(totals.ownerCapital)}</td>
                    <td className="px-4 py-3.5 text-right text-cyan-400">{money(totals.inventoryCost)}</td>
                    <td className="px-4 py-3.5 text-right text-white">{money(totals.cashInHand)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Pagination bar */}
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
    </div>
  );
}