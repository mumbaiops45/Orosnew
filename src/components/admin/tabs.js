"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Trash, PencilSimple, Plus, DownloadSimple, Eye } from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import * as analyticsApi from "@/api/analytics.api";
import * as orderApi from "@/api/order.api";
import * as productApi from "@/api/product.api";
import * as categoryApi from "@/api/category.api";
import * as subcategoryApi from "@/api/subcategory.api";
import * as couponApi from "@/api/coupon.api";
import * as userApi from "@/api/user.api";
import * as bannerApi from "@/api/banner.api";
import * as quotationApi from "@/api/quotation.api";

/* ══════════ shared primitives ══════════ */

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const run = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.resolve()
      .then(fn)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { data, loading, error, reload: run, setData };
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-shell p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-canvas"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  required,
  ...rest
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
        {required && <span className="text-flame"> *</span>}
      </span>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="h-10 w-full rounded-md border border-line bg-shell px-3 text-sm outline-none focus:border-flame"
          {...rest}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
          {...rest}
        />
      )}
    </label>
  );
}

const Btn = ({ children, ...p }) => (
  <button
    {...p}
    className="rounded-md bg-flame px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
  >
    {children}
  </button>
);

const Msg = ({ error, ok }) =>
  error ? (
    <p className="rounded bg-flame-lt px-3 py-2 text-xs font-semibold text-flame">
      {error}
    </p>
  ) : ok ? (
    <p className="rounded bg-leaf-lt px-3 py-2 text-xs font-semibold text-leaf">
      {ok}
    </p>
  ) : null;

function Table({ head, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-shell">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-4"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-md border border-line text-ink-3 hover:border-ink-5 hover:text-ink";

/**
 * Prev / Next pager. Pass `totalPages` when the endpoint reports it
 * (/product does); otherwise pass `hasNext` — true while the last page
 * came back full, so there may be more.
 */
function Pager({ page, setPage, totalPages, hasNext }) {
  const canNext = totalPages ? page < totalPages : !!hasNext;
  if (page <= 1 && !canNext) return null;
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40"
      >
        Prev
      </button>
      <span className="text-xs text-ink-3">
        Page {page}
        {totalPages ? ` of ${totalPages}` : ""}
      </span>
      <button
        disabled={!canNext}
        onClick={() => setPage((p) => p + 1)}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

/* ══════════ DASHBOARD ══════════ */

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

export function Overview() {
  const [from, setFrom] = useState(isoDay(Date.now() - 29 * 864e5));
  const [to, setTo] = useState(isoDay(Date.now()));
  const [groupBy, setGroupBy] = useState("day");

  // one call — the backend fans out to every analytics service
  const { data, loading, error } = useAsync(
    () => analyticsApi.getDashboard({ from, to, groupBy }),
    [from, to, groupBy]
  );

  const ov = data?.overview || {};
  const trend = data?.salesTrend || {};
  const breakdown = data?.orderBreakdown || {};
  const quotes = data?.quotations || {};
  const buckets = trend.buckets || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" type="date" value={from} onChange={setFrom} />
        <Field label="To" type="date" value={to} onChange={setTo} />
        <Field
          label="Group by"
          value={groupBy}
          onChange={setGroupBy}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>

      <Msg error={error} />
      {loading ? (
        <p className="text-sm text-ink-3">Loading analytics…</p>
      ) : (
        <>
          {/* ── 1. SALES & REVENUE ── */}
          <DashSection title="Sales & revenue">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi
                label="Revenue"
                value={formatINR(ov.revenue?.total || 0)}
                growth={ov.revenue?.growthPercent}
              />
              <Kpi
                label="Orders"
                value={ov.orders?.total ?? 0}
                growth={ov.orders?.growthPercent}
              />
              <Kpi
                label="Avg order value"
                value={formatINR(ov.averageOrderValue?.value || 0)}
                growth={ov.averageOrderValue?.growthPercent}
              />
              <Kpi
                label="Units sold"
                value={ov.items?.unitsSold ?? trend.totals?.unitsSold ?? 0}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Subtotal" value={formatINR(ov.revenue?.subtotal || 0)} small />
              <Kpi label="Tax" value={formatINR(ov.revenue?.tax || 0)} small />
              <Kpi label="Shipping" value={formatINR(ov.revenue?.shipping || 0)} small />
              <Kpi
                label="Prev revenue"
                value={formatINR(ov.revenue?.previous || 0)}
                small
              />
            </div>
            <MiniBars
              title={`Revenue per ${trend.groupBy || groupBy}`}
              buckets={buckets}
              valueKey="revenue"
              format={formatINR}
            />
            <MiniBars
              title={`Orders per ${trend.groupBy || groupBy}`}
              buckets={buckets}
              valueKey="orders"
              format={(v) => v}
            />
            {trend.bestPeriod && (
              <p className="text-xs text-ink-3">
                Best {trend.groupBy || groupBy}:{" "}
                <b>{trend.bestPeriod.period}</b> —{" "}
                {formatINR(trend.bestPeriod.revenue)} from{" "}
                {trend.bestPeriod.orders} orders
              </p>
            )}
          </DashSection>

          {/* ── 2. ORDER BREAKDOWN ── */}
          <DashSection title="Order breakdown">
            <div className="grid gap-4 lg:grid-cols-2">
              <Breakdown title="By status" rows={breakdown.byStatus} />
              <Breakdown title="By source" rows={breakdown.bySource} />
              <Breakdown title="By payment status" rows={breakdown.byPaymentStatus} />
              <Breakdown title="By payment method" rows={breakdown.byPaymentMethod} />
            </div>
          </DashSection>

          {/* ── 3. QUOTATIONS ── */}
          <DashSection title="Quotations">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Quotations" value={quotes.total?.quotations ?? 0} small />
              <Kpi
                label="Quoted value"
                value={formatINR(quotes.total?.quotedValue || 0)}
                small
              />
              <Kpi label="Converted" value={quotes.total?.converted ?? 0} small />
              <Kpi
                label="Conversion"
                value={`${quotes.total?.conversionRatePercent ?? 0}%`}
                small
              />
            </div>
            <Breakdown
              title="By status"
              rows={(quotes.byStatus || []).map((r) => ({
                key: r.status,
                orders: r.count,
                revenue: r.value,
              }))}
            />
          </DashSection>

          {/* ── 4. TOP PRODUCTS ── */}
          <DashSection title="Top products">
            <TopList
              rows={data?.topProducts?.products || []}
              render={(p) => [
                p.name || p.productId,
                formatINR(p.revenue || 0),
                `${p.unitsSold || 0} sold · ${p.orderCount || 0} orders`,
              ]}
            />
          </DashSection>

          {/* ── 5. TOP CATEGORIES ── */}
          <DashSection title="Top categories">
            <TopList
              rows={data?.topCategories?.categories || []}
              render={(c) => [
                c.name,
                formatINR(c.revenue || 0),
                `${c.revenueSharePercent ?? 0}% share · ${c.unitsSold || 0} units`,
              ]}
            />
          </DashSection>

          {/* ── 6. TOP CUSTOMERS ── */}
          <DashSection title="Top customers">
            <TopList
              rows={data?.topCustomers?.customers || []}
              render={(c) => [
                `${c.name || c.userId}${c.phone ? ` · ${c.phone}` : ""}`,
                formatINR(c.revenue || 0),
                `${c.orders || 0} orders`,
              ]}
            />
          </DashSection>

          {/* ── 7. CATALOGUE & CUSTOMERS ── */}
          <DashSection title="Catalogue & customers">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Published products"
                value={ov.catalogue?.publishedProducts ?? 0}
                small
              />
              <Kpi
                label="Open quotations"
                value={ov.catalogue?.openQuotations ?? 0}
                small
              />
              <Kpi
                label="New customers"
                value={ov.customers?.newInRange ?? 0}
                small
              />
              <Kpi
                label="Total customers"
                value={ov.customers?.total ?? 0}
                small
              />
            </div>
          </DashSection>
        </>
      )}
    </div>
  );
}

function DashSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Kpi({ label, value, growth, small }) {
  return (
    <div className="rounded-xl border border-line bg-shell p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </p>
      <p
        className={`mt-1 font-display font-extrabold text-ink ${
          small ? "text-lg" : "text-xl"
        }`}
      >
        {value}
      </p>
      {growth != null && (
        <p
          className={`text-xs font-bold ${
            growth >= 0 ? "text-leaf" : "text-flame"
          }`}
        >
          {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}%
        </p>
      )}
    </div>
  );
}

function MiniBars({ title, buckets, valueKey, format }) {
  if (!Array.isArray(buckets) || buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => Number(b[valueKey]) || 0), 1);
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-4">
        {title}
      </p>
      <div className="flex items-end gap-1 overflow-x-auto rounded-xl border border-line bg-shell p-3">
        {buckets.map((b) => {
          const v = Number(b[valueKey]) || 0;
          return (
            <div
              key={b.period}
              className="flex min-w-[12px] flex-1 flex-col items-center gap-1"
              title={`${b.period}: ${format(v)}`}
            >
              <span
                className="w-full rounded-t bg-flame"
                style={{ height: `${Math.max(2, (v / max) * 90)}px` }}
              />
              <span className="w-full truncate text-center text-[9px] text-ink-4">
                {String(b.period).slice(5) || b.period}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Breakdown({ title, rows }) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-4">
        {title}
      </p>
      <Table head={["", "Orders", "Revenue", "Share"]}>
        {list.map((r, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            <td className="px-4 py-2.5 font-semibold">{r.key || "—"}</td>
            <td className="px-4 py-2.5">{r.orders ?? 0}</td>
            <td className="px-4 py-2.5">{formatINR(r.revenue ?? 0)}</td>
            <td className="px-4 py-2.5">
              {r.sharePercent != null ? `${r.sharePercent}%` : "—"}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function TopList({ title, rows, render }) {
  if (!Array.isArray(rows) || rows.length === 0)
    return <p className="text-sm text-ink-3">No data in this range.</p>;
  return (
    <div>
      {title ? (
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
          {title}
        </h3>
      ) : null}
      <Table head={["Name", "Value", "Detail"]}>
        {rows.map((r, i) => {
          const cells = render(r);
          return (
            <tr key={i} className="border-b border-line last:border-0">
              {cells.map((c, j) => (
                <td key={j} className="px-4 py-2.5">
                  {c}
                </td>
              ))}
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

/* ══════════ ORDERS ══════════ */

const ORDER_TABS = [
  { id: "all", label: "All", test: () => true },
  {
    id: "paid",
    label: "Paid",
    test: (o) =>
      ["PAID", "CONFIRMED", "PROCESSING", "IN_PRODUCTION", "COMPLETED"].includes(
        o.status
      ),
  },
  { id: "unpaid", label: "Unpaid", test: (o) => o.status === "PENDING_PAYMENT" },
  { id: "cancelled", label: "Cancelled", test: (o) => o.status === "CANCELLED" },
  {
    id: "store",
    label: "Store",
    test: (o) => (o.source || "STORE") === "STORE",
  },
  {
    id: "quotation",
    label: "Quotation",
    test: (o) => o.source === "QUOTATION",
  },
  { id: "manual", label: "Manual", test: (o) => o.source === "MANUAL" },
];

function useOrders() {
  return useAsync(() => orderApi.getAdminOrders(), []);
}

const SOURCE_TONE = {
  STORE: "bg-sky-lt text-sky",
  QUOTATION: "bg-lilac-lt text-lilac",
  MANUAL: "bg-gold-lt text-gold-dk",
};

// STORE / QUOTATION / MANUAL — for a quotation-born order, also surface
// whether the underlying quotation was a BULK or CUSTOM request
function SourceBadge({ order }) {
  const source = order.source || "STORE";
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`rounded px-2 py-1 text-[11px] font-bold ${
          SOURCE_TONE[source] || "bg-canvas text-ink-2"
        }`}
      >
        {source}
      </span>
      {source === "QUOTATION" && order.quotation?.type && (
        <span className="rounded bg-canvas px-2 py-1 text-[11px] font-bold text-ink-2">
          {order.quotation.type}
        </span>
      )}
    </span>
  );
}

// admin-settable statuses for a STORE order (mirrors order.service.js)
const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "IN_PRODUCTION",
  "COMPLETED",
  "CANCELLED",
];

function OrderStatusControl({ order, onChanged }) {
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const locked =
    order.source !== "STORE" ||
    order.status === "COMPLETED" ||
    order.status === "CANCELLED";

  const change = async (next) => {
    if (next === status) return;
    setErr("");
    setBusy(true);
    try {
      await orderApi.updateOrderStatus(order._id, next);
      setStatus(next);
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (locked) {
    return (
      <span className="rounded bg-canvas px-2 py-1 text-xs font-bold">
        {order.status?.replace(/_/g, " ")}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        value={status}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="h-8 rounded-md border border-line bg-shell px-2 text-xs font-bold outline-none focus:border-flame disabled:opacity-60"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {err && <span className="text-[10px] font-semibold text-flame">{err}</span>}
    </span>
  );
}

function OrderList({ filterId }) {
  const { data, loading, error, reload } = useOrders();
  const [open, setOpen] = useState(null);
  const orders = Array.isArray(data) ? data : data?.data || [];
  const f = ORDER_TABS.find((t) => t.id === filterId) || ORDER_TABS[0];
  const rows = orders.filter(f.test);

  if (loading) return <p className="text-sm text-ink-3">Loading orders…</p>;
  return (
    <>
      <Msg error={error} />
      <Table head={["Order", "Source", "Customer", "Items", "Total", "Status", ""]}>
        {rows.map((o) => (
          <>
            <tr key={o._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-bold">
                <span className="block font-mono text-xs tracking-tight">
                  #{String(o._id).toUpperCase()}
                </span>
                <span className="block text-xs font-normal text-ink-3">
                  {new Date(o.createdAt).toLocaleDateString("en-IN")}
                </span>
              </td>
              <td className="px-4 py-3">
                <SourceBadge order={o} />
              </td>
              <td className="px-4 py-3">
                {o.user?.name || "—"}
                <span className="block text-xs text-ink-3">{o.user?.phone}</span>
              </td>
              <td className="px-4 py-3">
                {(o.items || []).reduce((n, i) => n + (i.qty || 0), 0)}
              </td>
              <td className="px-4 py-3 font-bold">
                {formatINR(o.pricing?.total || 0)}
              </td>
              <td className="px-4 py-3">
                <OrderStatusControl order={o} onChanged={reload} />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => setOpen(open === o._id ? null : o._id)}
                  className="text-xs font-bold text-flame hover:underline"
                >
                  {open === o._id ? "Hide" : "View"}
                </button>
              </td>
            </tr>
            {open === o._id && (
              <tr key={o._id + "-d"}>
                <td colSpan={7} className="bg-canvas px-4 py-3">
                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-bold text-ink-4">SHIPPING</p>
                      <p>
                        {o.shippingAddress?.name},{" "}
                        {o.shippingAddress?.addressLine1},{" "}
                        {o.shippingAddress?.city} {o.shippingAddress?.pincode}
                      </p>
                      <p className="mt-1 text-ink-3">
                        Placed{" "}
                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {o.shipping?.courierName
                          ? ` · ${o.shipping.courierName}`
                          : ""}
                        {o.shipping?.estimatedDelivery
                          ? ` · ETA ${new Date(
                              o.shipping.estimatedDelivery
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-ink-4">PAYMENT</p>
                      <p>
                        {o.payment?.provider || "—"} · {o.payment?.status}
                        {o.payment?.transactionId
                          ? ` · ${o.payment.transactionId}`
                          : ""}
                      </p>
                      <p>
                        Subtotal {formatINR(o.pricing?.subtotal || 0)} · Tax{" "}
                        {formatINR(o.pricing?.tax || 0)} · Ship{" "}
                        {formatINR(o.pricing?.shipping || 0)} · Disc{" "}
                        {formatINR(o.pricing?.discount || 0)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="font-bold text-ink-4">ITEMS</p>
                      {(o.items || []).map((it) => (
                        <p key={it._id}>
                          {it.nameSnapshot} × {it.qty} —{" "}
                          {formatINR(it.lineTotal)}
                        </p>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-ink-3">
              No orders
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}

export function Orders() {
  const [t, setT] = useState("all");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ORDER_TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setT(x.id)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              t === x.id ? "bg-ink text-white" : "bg-shell text-ink-2 border border-line"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <OrderList filterId={t} />
    </div>
  );
}

/* ══════════ PAYMENTS ══════════ */

const PAYMENT_TABS = [
  { id: "paid", label: "Paid", test: (o) => o.payment?.status === "PAID" },
  { id: "unpaid", label: "Unpaid", test: (o) => o.payment?.status !== "PAID" },
];

export function Payments() {
  const { data, loading, error } = useOrders();
  const [tab, setTab] = useState("paid");
  const orders = Array.isArray(data) ? data : data?.data || [];
  const paid = orders.filter(PAYMENT_TABS[0].test);
  const unpaid = orders.filter(PAYMENT_TABS[1].test);
  const rows = tab === "paid" ? paid : unpaid;
  const collected = paid.reduce((n, o) => n + (o.pricing?.total || 0), 0);
  const pending = unpaid.reduce((n, o) => n + (o.pricing?.total || 0), 0);

  if (loading) return <p className="text-sm text-ink-3">Loading payments…</p>;
  return (
    <div className="space-y-4">
      <Msg error={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-shell p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            Total collected
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">
            {formatINR(collected)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-shell p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            Paid orders
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">
            {paid.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-shell p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            Pending amount
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">
            {formatINR(pending)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-shell p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            Unpaid orders
          </p>
          <p className="mt-1 font-display text-xl font-extrabold">
            {unpaid.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAYMENT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              tab === t.id
                ? "bg-ink text-white"
                : "bg-shell text-ink-2 border border-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Table
        head={
          tab === "paid"
            ? ["Txn / Order", "Customer", "Method", "Amount", "Paid at"]
            : ["Order", "Customer", "Method", "Amount", "Payment status"]
        }
      >
        {rows.map((o) => (
          <tr key={o._id} className="border-b border-line last:border-0">
            <td className="px-4 py-3">
              {tab === "paid" && (
                <span className="block font-bold">
                  {o.payment?.transactionId || "—"}
                </span>
              )}
              <span className="block font-mono text-xs text-ink-3">
                #{String(o._id).toUpperCase()}
              </span>
            </td>
            <td className="px-4 py-3">
              {o.user?.name}
              <span className="block text-xs text-ink-3">{o.user?.phone}</span>
            </td>
            <td className="px-4 py-3">{o.payment?.provider || "ONLINE"}</td>
            <td className="px-4 py-3 font-bold">
              {formatINR(o.pricing?.total || 0)}
            </td>
            {tab === "paid" ? (
              <td className="px-4 py-3 text-xs">
                {o.payment?.paidAt
                  ? new Date(o.payment.paidAt).toLocaleString("en-IN")
                  : "—"}
              </td>
            ) : (
              <td className="px-4 py-3">
                <span className="rounded bg-flame-lt px-2 py-1 text-[11px] font-bold text-flame">
                  {o.payment?.status || "PENDING"}
                </span>
              </td>
            )}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-ink-3">
              {tab === "paid" ? "No payments yet" : "No unpaid orders"}
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}

/* ══════════ PRODUCTS ══════════ */

export function Products() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => productApi.listProducts({ page, limit: 20 }),
    [page]
  );
  const cats = useAsync(() => categoryApi.listCategories({ limit: 200 }), []);
  const subs = useAsync(
    () => subcategoryApi.listSubcategories({ limit: 500 }),
    []
  );
  const [editing, setEditing] = useState(null); // product object or {} for new
  const [msg, setMsg] = useState("");

  const products = data?.products || [];
  const categories = cats.data?.category || [];
  const subcategories = subs.data?.subCategory || [];

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await productApi.deleteProduct(id);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BulkImport onDone={reload} />
        <Btn onClick={() => setEditing({})}>
          <Plus size={13} className="mr-1 inline" /> New product
        </Btn>
      </div>
      <Msg error={error || msg} />

      {loading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : (
        <Table head={["Name", "SKU", "Price", "Category", "Status", ""]}>
          {products.map((p) => (
            <tr key={p._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-bold">{p.name}</td>
              <td className="px-4 py-3">{p.sku}</td>
              <td className="px-4 py-3">{formatINR(p.basePrice)}</td>
              <td className="px-4 py-3">{p.category?.name || "—"}</td>
              <td className="px-4 py-3">
                <span className="rounded bg-canvas px-2 py-1 text-xs font-bold">
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <a
                    href={`/shop/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={iconBtn}
                    aria-label="View"
                  >
                    <Eye size={14} />
                  </a>
                  <button
                    className={iconBtn}
                    onClick={() => setEditing(p)}
                    aria-label="Edit"
                  >
                    <PencilSimple size={14} />
                  </button>
                  <button
                    className={iconBtn}
                    onClick={() => remove(p._id)}
                    aria-label="Delete"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {!loading && (
        <Pager
          page={page}
          setPage={setPage}
          totalPages={data?.pagination?.totalPages}
        />
      )}

      {editing && (
        <ProductModal
          product={editing._id ? editing : null}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function BulkImport({ onDone }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const template = async () => {
    try {
      const blob = await productApi.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await productApi.bulkImportProducts(fd);
      setMsg(
        `Imported ${res?.created ?? res?.imported ?? "OK"}${
          res?.failed ? ` · ${res.failed} failed` : ""
        }`
      );
      onDone?.();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={template}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-bold text-ink-2 hover:border-ink-5"
      >
        <DownloadSimple size={13} /> Sample .xlsx
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="rounded-md border border-line px-3 py-2 text-xs font-bold text-ink-2 hover:border-ink-5 disabled:opacity-60"
      >
        {busy ? "Importing…" : "Bulk import"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={upload}
      />
      {msg && <span className="text-xs font-semibold text-ink-3">{msg}</span>}
    </div>
  );
}

function ProductModal({ product, categories, subcategories, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    sku: product?.sku || "",
    name: product?.name || "",
    slug: product?.slug || "",
    category: product?.category?._id || product?.category || "",
    subcategory: product?.subcategory?._id || product?.subcategory || "",
    shortDescription: product?.shortDescription || "",
    longDescription: product?.longDescription || "",
    basePrice: product?.basePrice ?? "",
    taxRate: product?.taxRate ?? 0,
    leadTimeDays: product?.leadTimeDays ?? 1,
    minQty: product?.minQty ?? 1,
    isCustomisable: product?.isCustomisable || false,
    status: product?.status || "DRAFT",
  }));
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(product?._id || null);
  const [tab, setTab] = useState("details");

  const PRODUCT_TABS = [
    { id: "details", label: "Details" },
    { id: "media", label: "Media" },
    { id: "specs", label: "Specs" },
    { id: "options", label: "Options & values" },
    { id: "slabs", label: "Price slabs" },
  ];

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const subOpts = subcategories
    .filter((s) => !f.category || (s.category?._id || s.category) === f.category)
    .map((s) => ({ value: s._id, label: s.name }));

  const save = async () => {
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const body = {
        ...f,
        slug: f.slug || slugify(f.name),
        basePrice: Number(f.basePrice),
        taxRate: Number(f.taxRate),
        leadTimeDays: Number(f.leadTimeDays),
        minQty: Number(f.minQty),
      };
      if (savedId) {
        await productApi.updateProduct(savedId, body);
        setOk("Saved");
      } else {
        const res = await productApi.createProduct(body);
        const id = res?.product?._id || res?._id;
        setSavedId(id);
        setOk("Created — now add specs, options and price slabs below");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={product ? "Edit product" : "New product"}
      onClose={onClose}
      wide
    >
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-line pb-3">
        {PRODUCT_TABS.map((t) => {
          const locked = t.id !== "details" && !savedId;
          return (
            <button
              key={t.id}
              onClick={() => !locked && setTab(t.id)}
              disabled={locked}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                tab === t.id
                  ? "bg-ink text-white"
                  : locked
                    ? "cursor-not-allowed text-ink-4"
                    : "border border-line bg-shell text-ink-2 hover:border-ink-5"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab !== "details" && savedId && (
        <div className="space-y-5">
          {tab === "media" && <MediaEditor productId={savedId} />}
          {tab === "specs" && <SpecEditor productId={savedId} />}
          {tab === "options" && <OptionEditor productId={savedId} />}
          {tab === "slabs" && <PriceSlabEditor productId={savedId} />}
          <div className="border-t border-line pt-3">
            <button
              onClick={onSaved}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink-2 hover:border-ink-5"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className={tab === "details" ? "" : "hidden"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={f.name} onChange={set("name")} />
        <Field label="SKU" value={f.sku} onChange={set("sku")} />
        <Field
          label="Slug (auto)"
          value={f.slug}
          onChange={set("slug")}
          placeholder={slugify(f.name)}
        />
        <Field
          label="Base price"
          type="number"
          value={f.basePrice}
          onChange={set("basePrice")}
        />
        <Field
          label="Category"
          value={f.category}
          onChange={(v) => {
            set("category")(v);
            set("subcategory")("");
          }}
          options={categories.map((c) => ({ value: c._id, label: c.name }))}
        />
        <Field
          label="Subcategory"
          value={f.subcategory}
          onChange={set("subcategory")}
          options={subOpts}
        />
        <Field
          label="Tax rate %"
          type="number"
          value={f.taxRate}
          onChange={set("taxRate")}
        />
        <Field
          label="Lead time (days)"
          type="number"
          value={f.leadTimeDays}
          onChange={set("leadTimeDays")}
        />
        <Field
          label="Min qty"
          type="number"
          value={f.minQty}
          onChange={set("minQty")}
        />
        <Field
          label="Status"
          value={f.status}
          onChange={set("status")}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
        />
        <label className="col-span-full block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Short description
          </span>
          <textarea
            value={f.shortDescription}
            onChange={(e) => set("shortDescription")(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-flame"
          />
        </label>
        <label className="col-span-full block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Long description
          </span>
          <textarea
            value={f.longDescription}
            onChange={(e) => set("longDescription")(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-flame"
          />
        </label>
        <label className="col-span-full flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.isCustomisable}
            onChange={(e) => set("isCustomisable")(e.target.checked)}
            className="h-4 w-4 accent-flame"
          />
          Customisable
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <Msg error={err} ok={ok} />
        <div className="flex gap-2">
          <Btn onClick={save} disabled={saving}>
            {saving ? "Saving…" : savedId ? "Save changes" : "Create"}
          </Btn>
          {savedId && (
            <button
              onClick={onSaved}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink-2 hover:border-ink-5"
            >
              Done
            </button>
          )}
        </div>
        {!savedId && (
          <p className="text-xs text-ink-3">
            Create the product first — Media, Specs, Options and Price slabs
            unlock once it exists.
          </p>
        )}
      </div>
      </div>
    </Modal>
  );
}

function MediaEditor({ productId }) {
  const { data, reload } = useAsync(
    () => productApi.getProductMedia(productId),
    [productId]
  );
  const rows = data?.media || data || [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setErr("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        await productApi.createMedia(productId, fd);
      }
      reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const makePrimary = async (id) => {
    try {
      await productApi.updateMedia(productId, id, { isPrimary: true });
      reload();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const saveAlt = async (id, altText) => {
    await productApi.updateMedia(productId, id, { altText });
    reload();
  };

  const remove = async (id) => {
    try {
      await productApi.deleteMedia(productId, id);
      reload();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <Section title="Media">
      <Msg error={err} />
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {rows.map((m) => (
            <MediaCard
              key={m._id}
              media={m}
              onPrimary={() => makePrimary(m._id)}
              onSaveAlt={(alt) => saveAlt(m._id, alt)}
              onDelete={() => remove(m._id)}
            />
          ))}
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-4 rounded-md border border-line px-3 py-2 text-xs font-bold text-ink-2 hover:border-ink-5 disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload images / video"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={upload}
      />
    </Section>
  );
}

function MediaCard({ media: m, onPrimary, onSaveAlt, onDelete }) {
  const [alt, setAlt] = useState(m.altText || "");
  const [busy, setBusy] = useState(false);
  const dirty = alt !== (m.altText || "");

  const save = async () => {
    setBusy(true);
    try {
      await onSaveAlt(alt.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-line p-2.5">
      {m.type === "VIDEO" ? (
        <video src={m.url} muted className="h-24 w-full rounded object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.url}
          alt={m.altText || ""}
          className="h-24 w-full rounded object-cover"
        />
      )}

      <input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="Alt text"
        className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-md bg-ink px-2 py-1 text-[11px] font-bold text-white hover:bg-ink-2 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save alt text"}
        </button>
      )}

      <div className="flex items-center justify-between pt-0.5">
        <button
          onClick={onPrimary}
          disabled={m.isPrimary}
          className={`text-xs font-bold ${
            m.isPrimary ? "text-leaf" : "text-flame hover:underline"
          }`}
        >
          {m.isPrimary ? "Primary" : "Set primary"}
        </button>
        <button
          onClick={onDelete}
          className="text-ink-3 hover:text-flame"
          aria-label="Delete"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── inline-edit primitives (shared by spec / slab / option editors) ── */

const editIconBtn =
  "grid h-7 w-7 place-items-center rounded-md border border-line text-ink-3 hover:border-ink-5 hover:text-ink";

function SaveCancel({ onSave, onCancel, busy, err }) {
  return (
    <div className="flex items-center gap-2 pt-0.5">
      <button
        onClick={onSave}
        disabled={busy}
        className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-2 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        onClick={onCancel}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink-2 hover:border-ink-5"
      >
        Cancel
      </button>
      {err && (
        <span className="text-[11px] font-semibold text-flame">{err}</span>
      )}
    </div>
  );
}

const Labeled = ({ label, className = "", children }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
      {label}
    </span>
    {children}
  </label>
);

const inlineInput =
  "h-9 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-flame";

/**
 * One list entry with view / edit / delete. `fields` describes the editable
 * inputs; `toPayload` turns the working values into the update body.
 */
function EditableEntry({ view, fields, initial, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const start = () => {
    setF(initial);
    setErr("");
    setEditing(true);
  };

  const save = async () => {
    setErr("");
    setBusy(true);
    try {
      await onSave(f);
      setEditing(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md bg-canvas/40 px-3 py-2">
        <span className="text-sm font-semibold text-ink-2">{view}</span>
        <div className="flex shrink-0 gap-1.5">
          <button onClick={start} className={editIconBtn} aria-label="Edit">
            <PencilSimple size={13} />
          </button>
          <button onClick={onDelete} className={editIconBtn} aria-label="Delete">
            <Trash size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-end gap-2">
        {fields.map((fd) => (
          <Labeled
            key={fd.key}
            label={fd.label}
            className={fd.wide ? "min-w-[140px] flex-1" : "w-24"}
          >
            <input
              type={fd.type || "text"}
              step={fd.step}
              value={f[fd.key] ?? ""}
              onChange={(e) =>
                setF((s) => ({ ...s, [fd.key]: e.target.value }))
              }
              className={inlineInput}
            />
          </Labeled>
        ))}
      </div>
      <SaveCancel
        onSave={save}
        onCancel={() => setEditing(false)}
        busy={busy}
        err={err}
      />
    </div>
  );
}

function SpecEditor({ productId }) {
  const { data, reload } = useAsync(
    () => productApi.getProductSpecs(productId),
    [productId]
  );
  const rows = data?.specs || data || [];
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  const add = async () => {
    if (!label || !value) return;
    await productApi.createSpec(productId, { label, value });
    setLabel("");
    setValue("");
    reload();
  };
  return (
    <Section title="Specs">
      <div className="space-y-2">
        {rows.map((s) => (
          <EditableEntry
            key={s._id}
            view={`${s.label}: ${s.value}`}
            initial={{ label: s.label, value: s.value }}
            fields={[
              { key: "label", label: "Label", wide: true },
              { key: "value", label: "Value", wide: true },
            ]}
            onSave={async (f) => {
              await productApi.updateSpec(productId, s._id, {
                label: f.label,
                value: f.value,
              });
              reload();
            }}
            onDelete={async () => {
              await productApi.deleteSpec(productId, s._id);
              reload();
            }}
          />
        ))}
      </div>
      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <input
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-9 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <input
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <AddBtn onClick={add} />
      </div>
    </Section>
  );
}

function PriceSlabEditor({ productId }) {
  const { data, reload } = useAsync(
    () => productApi.getPriceSlabs(productId),
    [productId]
  );
  const rows = data?.priceSlabs || data || [];
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const add = async () => {
    if (!minQty || !unitPrice) return;
    await productApi.createPriceSlab(productId, {
      minQty: Number(minQty),
      maxQty: maxQty ? Number(maxQty) : null,
      unitPrice: Number(unitPrice),
    });
    setMinQty("");
    setMaxQty("");
    setUnitPrice("");
    reload();
  };
  return (
    <Section title="Price slabs (bulk tiers)">
      <div className="space-y-2">
        {rows.map((s) => (
          <EditableEntry
            key={s._id}
            view={`${s.minQty}${s.maxQty ? `–${s.maxQty}` : "+"} @ ${formatINR(
              s.unitPrice
            )}`}
            initial={{
              minQty: s.minQty,
              maxQty: s.maxQty ?? "",
              unitPrice: s.unitPrice,
            }}
            fields={[
              { key: "minQty", label: "Min qty", type: "number" },
              { key: "maxQty", label: "Max qty", type: "number" },
              {
                key: "unitPrice",
                label: "Unit price",
                type: "number",
                wide: true,
              },
            ]}
            onSave={async (f) => {
              await productApi.updatePriceSlab(productId, s._id, {
                minQty: Number(f.minQty),
                maxQty:
                  f.maxQty === "" || f.maxQty === null
                    ? null
                    : Number(f.maxQty),
                unitPrice: Number(f.unitPrice),
              });
              reload();
            }}
            onDelete={async () => {
              await productApi.deletePriceSlab(productId, s._id);
              reload();
            }}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <input
          placeholder="Min qty"
          type="number"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className="h-9 w-24 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <input
          placeholder="Max qty"
          type="number"
          value={maxQty}
          onChange={(e) => setMaxQty(e.target.value)}
          className="h-9 w-24 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <input
          placeholder="Unit price"
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="h-9 min-w-[8rem] flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <AddBtn onClick={add} />
      </div>
    </Section>
  );
}

function OptionEditor({ productId }) {
  const { data, reload } = useAsync(
    () => productApi.getProductOptions(productId),
    [productId]
  );
  const options = data?.options || data || [];
  const [name, setName] = useState("");
  const [type, setType] = useState("SELECT");
  const [required, setRequired] = useState(true);

  const add = async () => {
    if (!name) return;
    await productApi.createOption(productId, {
      name,
      type,
      isRequired: required,
    });
    setName("");
    reload();
  };
  return (
    <Section title="Options & values">
      <div className="space-y-4">
        {options.map((o) => (
          <div
            key={o._id}
            className="rounded-lg border border-line bg-canvas/40 p-4"
          >
            <OptionHeadRow
              productId={productId}
              option={o}
              onChange={reload}
            />
            <ValueEditor productId={productId} option={o} onChange={reload} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <input
          placeholder="Option name (e.g. Colour)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-line px-2 text-sm"
        >
          {["SELECT", "TEXT", "COLOR", "FILE"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-semibold">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 accent-flame"
          />
          Req
        </label>
        <AddBtn onClick={add} />
      </div>
    </Section>
  );
}

function OptionHeadRow({ productId, option, onChange }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({
    name: option.name,
    type: option.type,
    isRequired: option.isRequired,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!f.name.trim()) return;
    setErr("");
    setBusy(true);
    try {
      await productApi.updateOption(productId, option._id, {
        name: f.name.trim(),
        type: f.type,
        isRequired: f.isRequired,
      });
      setEditing(false);
      onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await productApi.deleteOption(productId, option._id);
    onChange?.();
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-2">
          {option.name}{" "}
          <span className="text-xs font-normal text-ink-4">
            ({option.type}
            {option.isRequired ? ", required" : ""})
          </span>
        </span>
        <div className="flex gap-1.5">
          <button
            className={iconBtn}
            onClick={() => {
              setF({
                name: option.name,
                type: option.type,
                isRequired: option.isRequired,
              });
              setEditing(true);
            }}
            aria-label="Edit option"
          >
            <PencilSimple size={14} />
          </button>
          <button className={iconBtn} onClick={remove} aria-label="Delete option">
            <Trash size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={f.name}
          onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
          className="h-9 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
        />
        <select
          value={f.type}
          onChange={(e) => setF((s) => ({ ...s, type: e.target.value }))}
          className="h-9 rounded-md border border-line px-2 text-sm"
        >
          {["SELECT", "TEXT", "COLOR", "FILE"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-semibold">
          <input
            type="checkbox"
            checked={f.isRequired}
            onChange={(e) =>
              setF((s) => ({ ...s, isRequired: e.target.checked }))
            }
            className="h-4 w-4 accent-flame"
          />
          Req
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-2 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink-2 hover:border-ink-5"
        >
          Cancel
        </button>
        {err && <span className="text-[11px] font-semibold text-flame">{err}</span>}
      </div>
    </div>
  );
}

function ValueEditor({ option, onChange }) {
  const { data, reload } = useAsync(
    () => productApi.getOptionValues(option._id),
    [option._id]
  );
  const values = data?.values || data || option.values || [];
  const [value, setValue] = useState("");
  const [delta, setDelta] = useState("");
  const [mult, setMult] = useState("1");

  const add = async () => {
    if (!value) return;
    await productApi.createOptionValue(option._id, {
      value,
      priceDelta: Number(delta) || 0,
      priceMultiplier: Number(mult) || 1,
    });
    setValue("");
    setDelta("");
    setMult("1");
    reload();
    onChange?.();
  };
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3 pl-3">
      {values.map((v) => (
        <OptionValueRow
          key={v._id}
          option={option}
          value={v}
          onChange={() => {
            reload();
            onChange?.();
          }}
        />
      ))}
      <div className="flex flex-wrap items-end gap-2 pt-1">
        <label className="min-w-[8rem] flex-1">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
            Value
          </span>
          <input
            placeholder="e.g. Red"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
          />
        </label>
        <label className="w-20">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
            priceDelta
          </span>
          <input
            placeholder="+₹"
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
          />
        </label>
        <label className="w-20">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
            priceMultiplier
          </span>
          <input
            placeholder="×1"
            type="number"
            step="0.01"
            min="0"
            value={mult}
            onChange={(e) => setMult(e.target.value)}
            className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
          />
        </label>
        <AddBtn onClick={add} small />
      </div>
    </div>
  );
}

function OptionValueRow({ option, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value.value);
  const [delta, setDelta] = useState(value.priceDelta ?? "");
  const [mult, setMult] = useState(value.priceMultiplier ?? 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!val.trim()) return;
    setErr("");
    setBusy(true);
    try {
      await productApi.updateOptionValue(option._id, value._id, {
        value: val.trim(),
        priceDelta: Number(delta) || 0,
        priceMultiplier: Number(mult) || 1,
      });
      setEditing(false);
      onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await productApi.deleteOptionValue(option._id, value._id);
    onChange?.();
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink-2">
          {value.value}
          {value.priceDelta ? ` +${formatINR(value.priceDelta)}` : ""}
          {value.priceMultiplier && value.priceMultiplier !== 1
            ? ` ×${value.priceMultiplier}`
            : ""}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              setVal(value.value);
              setDelta(value.priceDelta ?? "");
              setMult(value.priceMultiplier ?? 1);
              setEditing(true);
            }}
            className="text-ink-3 hover:text-ink"
            aria-label="Edit value"
          >
            <PencilSimple size={12} />
          </button>
          <button
            onClick={remove}
            className="text-ink-3 hover:text-flame"
            aria-label="Delete value"
          >
            <Trash size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
            Value
          </span>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
          />
        </label>
        <label className="w-20">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
            priceDelta
          </span>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
          />
        </label>
        <label className="w-20">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-ink-4">
            priceMultiplier
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={mult}
            onChange={(e) => setMult(e.target.value)}
            className="h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-ink px-2.5 py-1 text-[11px] font-bold text-white hover:bg-ink-2 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-line px-2.5 py-1 text-[11px] font-bold text-ink-2 hover:border-ink-5"
        >
          Cancel
        </button>
        {err && <span className="text-[11px] font-semibold text-flame">{err}</span>}
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="rounded-xl border border-line bg-shell p-4">
    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-4">
      {title}
    </p>
    <div className="space-y-3">{children}</div>
  </div>
);

const AddBtn = ({ onClick, small }) => (
  <button
    onClick={onClick}
    className={`grid ${
      small ? "h-8 w-8" : "h-9 w-9"
    } shrink-0 place-items-center rounded-md bg-ink text-white hover:bg-ink-2`}
    aria-label="Add"
  >
    <Plus size={small ? 12 : 14} weight="bold" />
  </button>
);

/* ══════════ CATEGORIES ══════════ */

const TAXONOMY_LIMIT = 20;

function TaxonomyTab({ kind }) {
  const isCat = kind === "category";
  const api = isCat ? categoryApi : subcategoryApi;
  const [page, setPage] = useState(1);
  const listFn = isCat
    ? () => categoryApi.listCategories({ page, limit: TAXONOMY_LIMIT })
    : () =>
        subcategoryApi.listSubcategories({ page, limit: TAXONOMY_LIMIT });
  const { data, loading, error, reload } = useAsync(listFn, [page]);
  const catsData = useAsync(
    () => categoryApi.listCategories({ limit: 200 }),
    []
  );
  const rows = isCat ? data?.category || [] : data?.subCategory || [];
  const categories = catsData.data?.category || [];
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  // dropped the last row on a trailing page — step back
  useEffect(() => {
    if (!loading && rows.length === 0 && page > 1) setPage((p) => p - 1);
  }, [loading, rows.length, page]);

  const remove = async (id) => {
    if (!confirm("Delete?")) return;
    try {
      isCat ? await api.deleteCategory(id) : await api.deleteSubcategory(id);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => setEditing({})}>
          <Plus size={13} className="mr-1 inline" /> New {kind}
        </Btn>
      </div>
      <Msg error={error || msg} />
      {loading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : (
        <Table
          head={
            isCat ? ["Name", "Slug", "Active", ""] : ["Name", "Category", "Slug", ""]
          }
        >
          {rows.map((r) => (
            <tr key={r._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-bold">{r.name}</td>
              {!isCat && (
                <td className="px-4 py-3">
                  {categories.find(
                    (c) => c._id === (r.category?._id || r.category)
                  )?.name || "—"}
                </td>
              )}
              <td className="px-4 py-3">{r.slug}</td>
              {isCat && (
                <td className="px-4 py-3">{r.isActive ? "Yes" : "No"}</td>
              )}
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <button className={iconBtn} onClick={() => setEditing(r)}>
                    <PencilSimple size={14} />
                  </button>
                  <button className={iconBtn} onClick={() => remove(r._id)}>
                    <Trash size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {!loading && (
        <Pager
          page={page}
          setPage={setPage}
          hasNext={rows.length >= TAXONOMY_LIMIT}
        />
      )}

      {editing && (
        <TaxonomyModal
          kind={kind}
          row={editing._id ? editing : null}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TaxonomyModal({ kind, row, categories, onClose, onSaved }) {
  const isCat = kind === "category";
  const [f, setF] = useState({
    name: row?.name || "",
    slug: row?.slug || "",
    description: row?.description || "",
    category: row?.category?._id || row?.category || "",
    isActive: row?.isActive !== false,
  });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", f.name);
      fd.append("slug", f.slug || slugify(f.name));
      fd.append("description", f.description);
      fd.append("isActive", String(f.isActive));
      if (!isCat) fd.append("category", f.category);
      if (file) fd.append("image", file);

      if (row) {
        isCat
          ? await categoryApi.updateCategory(row._id, fd)
          : await subcategoryApi.updateSubcategory(row._id, fd);
      } else {
        isCat
          ? await categoryApi.createCategory(fd)
          : await subcategoryApi.createSubcategory(fd);
      }
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${row ? "Edit" : "New"} ${kind}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name" value={f.name} onChange={set("name")} />
        <Field
          label="Slug (auto)"
          value={f.slug}
          onChange={set("slug")}
          placeholder={slugify(f.name)}
        />
        {!isCat && (
          <Field
            label="Parent category"
            value={f.category}
            onChange={set("category")}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
          />
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Description
          </span>
          <textarea
            value={f.description}
            onChange={(e) => set("description")(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-flame"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs"
          />
        </label>
        {isCat && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={f.isActive}
              onChange={(e) => set("isActive")(e.target.checked)}
              className="h-4 w-4 accent-flame"
            />
            Active
          </label>
        )}
        <Msg error={err} />
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Btn>
      </div>
    </Modal>
  );
}

export const Categories = () => <TaxonomyTab kind="category" />;
export const Subcategories = () => <TaxonomyTab kind="subcategory" />;

/* ══════════ COUPONS ══════════ */

export function Coupons() {
  const { data, loading, error, reload } = useAsync(
    () => couponApi.listCoupons({ limit: 200 }),
    []
  );
  const rows = data?.coupons || [];
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const remove = async (id) => {
    if (!confirm("Delete coupon?")) return;
    try {
      await couponApi.deleteCoupon(id);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => setEditing({})}>
          <Plus size={13} className="mr-1 inline" /> New coupon
        </Btn>
      </div>
      <Msg error={error || msg} />
      {loading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : (
        <Table head={["Code", "Type", "Value", "Min order", "Window", ""]}>
          {rows.map((c) => (
            <tr key={c._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-bold">{c.code}</td>
              <td className="px-4 py-3">{c.discountType}</td>
              <td className="px-4 py-3">
                {c.discountType === "PERCENTAGE"
                  ? `${c.discountValue}%`
                  : formatINR(c.discountValue)}
              </td>
              <td className="px-4 py-3">{formatINR(c.minOrderValue || 0)}</td>
              <td className="px-4 py-3 text-xs">
                {new Date(c.startDate).toLocaleDateString("en-IN")} –{" "}
                {new Date(c.endDate).toLocaleDateString("en-IN")}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <button className={iconBtn} onClick={() => setEditing(c)}>
                    <PencilSimple size={14} />
                  </button>
                  <button className={iconBtn} onClick={() => remove(c._id)}>
                    <Trash size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && (
        <CouponModal
          row={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CouponModal({ row, onClose, onSaved }) {
  const [f, setF] = useState({
    code: row?.code || "",
    discountType: row?.discountType || "PERCENTAGE",
    discountValue: row?.discountValue ?? "",
    minOrderValue: row?.minOrderValue ?? 0,
    startDate: row?.startDate ? isoDay(row.startDate) : isoDay(Date.now()),
    endDate: row?.endDate
      ? isoDay(row.endDate)
      : isoDay(Date.now() + 30 * 864e5),
    isActive: row?.isActive !== false,
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      const body = {
        ...f,
        code: f.code.toUpperCase(),
        discountValue: Number(f.discountValue),
        minOrderValue: Number(f.minOrderValue),
      };
      row
        ? await couponApi.updateCoupon(row._id, body)
        : await couponApi.createCoupon(body);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={row ? "Edit coupon" : "New coupon"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" value={f.code} onChange={set("code")} />
        <Field
          label="Type"
          value={f.discountType}
          onChange={set("discountType")}
          options={[
            { value: "PERCENTAGE", label: "Percentage" },
            { value: "FIXED", label: "Fixed ₹" },
          ]}
        />
        <Field
          label="Value"
          type="number"
          value={f.discountValue}
          onChange={set("discountValue")}
        />
        <Field
          label="Min order value"
          type="number"
          value={f.minOrderValue}
          onChange={set("minOrderValue")}
        />
        <Field
          label="Start"
          type="date"
          value={f.startDate}
          onChange={set("startDate")}
        />
        <Field
          label="End"
          type="date"
          value={f.endDate}
          onChange={set("endDate")}
        />
        <label className="col-span-full flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.isActive}
            onChange={(e) => set("isActive")(e.target.checked)}
            className="h-4 w-4 accent-flame"
          />
          Active
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <Msg error={err} />
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ══════════ USERS ══════════ */

const USER_ROLE_OPTIONS = [
  { value: "user", label: "Customer" },
  { value: "staff", label: "Staff" },
];

export function UsersTab() {
  const { data, loading, error, reload } = useAsync(
    () => userApi.listUsers({ limit: 500 }),
    []
  );
  const rows = data?.users || data?.data || [];
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null); // {} = new user, user object = edit

  const toggleBlock = async (u) => {
    try {
      await userApi.updateUser(u._id, { isBlocked: !u.isBlocked });
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (loading) return <p className="text-sm text-ink-3">Loading users…</p>;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Btn onClick={() => setEditing({})}>
          <Plus size={13} className="mr-1 inline" /> New user
        </Btn>
      </div>
      <Msg error={error || msg} />
      <Table head={["Name", "Phone", "Email", "Role", "Type", ""]}>
        {rows.map((u) => (
          <tr key={u._id} className="border-b border-line last:border-0">
            <td className="px-4 py-3 font-bold">{u.name}</td>
            <td className="px-4 py-3">{u.phone}</td>
            <td className="px-4 py-3">{u.email}</td>
            <td className="px-4 py-3">{u.role}</td>
            <td className="px-4 py-3">{u.accountType}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleBlock(u)}
                  className={`rounded px-2.5 py-1 text-xs font-bold ${
                    u.isBlocked
                      ? "bg-leaf-lt text-leaf"
                      : "bg-flame-lt text-flame"
                  }`}
                >
                  {u.isBlocked ? "Unblock" : "Block"}
                </button>
                <button
                  className={iconBtn}
                  onClick={() => setEditing(u)}
                  aria-label="Edit user"
                >
                  <PencilSimple size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
              No users
            </td>
          </tr>
        )}
      </Table>

      {editing && (
        <UserModal
          user={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    role: user?.role && USER_ROLE_OPTIONS.some((o) => o.value === user.role)
      ? user.role
      : "user",
    isBlocked: user?.isBlocked || false,
  }));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setErr("");
    if (!f.name.trim() || !f.phone.trim() || !f.email.trim()) {
      setErr("Name, phone and email are required");
      return;
    }
    setSaving(true);
    try {
      if (user) {
        await userApi.updateUser(user._id, {
          name: f.name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim(),
          role: f.role,
          isBlocked: f.isBlocked,
        });
      } else {
        await userApi.createUser({
          name: f.name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim(),
          role: f.role,
        });
      }
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={user ? "Edit user" : "New user"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name" value={f.name} onChange={set("name")} />
        <Field label="Phone" value={f.phone} onChange={set("phone")} />
        <Field
          label="Email"
          type="email"
          value={f.email}
          onChange={set("email")}
        />
        <Field
          label="Role"
          value={f.role}
          onChange={set("role")}
          options={USER_ROLE_OPTIONS}
        />
        {user && (
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
            <input
              type="checkbox"
              checked={f.isBlocked}
              onChange={(e) => set("isBlocked")(e.target.checked)}
              className="h-4 w-4 accent-flame"
            />
            Blocked
          </label>
        )}
        <Msg error={err} />
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : user ? "Save changes" : "Create user"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ══════════ MANUAL ORDER ══════════ */

// backend accepts only these — see createManualOrderService's
// allowedPaymentMethods check
const MANUAL_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
];

export function ManualOrder() {
  const users = useAsync(() => userApi.listUsers({ limit: 500 }), []);
  const products = useAsync(
    () => productApi.listProducts({ limit: 500, status: "PUBLISHED" }),
    []
  );
  const [userId, setUserId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [lines, setLines] = useState([{ product: "", qty: 1 }]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  // manual orders can only be raised for real customer accounts —
  // the service rejects staff/admin userIds with a 400
  const userRows = (users.data?.users || users.data?.data || []).filter(
    (u) => u.role === "user"
  );
  const productRows = products.data?.products || [];

  const submit = async () => {
    setErr("");
    setOk("");
    if (!userId) return setErr("Choose a customer");
    if (!paymentMethod) return setErr("Choose a payment method");
    const items = lines
      .filter((l) => l.product && l.qty)
      .map((l) => ({ product: l.product, qty: Number(l.qty) }));
    if (items.length === 0) return setErr("Add at least one product line");
    setSaving(true);
    try {
      await orderApi.createManualOrder({
        userId,
        paymentMethod,
        items,
        notes: note,
      });
      setOk("Manual order created");
      setLines([{ product: "", qty: 1 }]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <Field
        label="Customer"
        required
        value={userId}
        onChange={setUserId}
        options={userRows.map((u) => ({
          value: u._id,
          label: `${u.name} · ${u.phone}`,
        }))}
      />
      <Field
        label="Payment method"
        required
        value={paymentMethod}
        onChange={setPaymentMethod}
        options={MANUAL_PAYMENT_METHODS}
      />
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
          Items
        </p>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <select
              value={l.product}
              onChange={(e) => {
                const next = [...lines];
                next[i].product = e.target.value;
                setLines(next);
              }}
              className="h-10 min-w-0 flex-1 rounded-md border border-line px-2 text-sm"
            >
              <option value="">Select product…</option>
              {productRows.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({formatINR(p.basePrice)})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={l.qty}
              onChange={(e) => {
                const next = [...lines];
                next[i].qty = e.target.value;
                setLines(next);
              }}
              className="h-10 w-20 rounded-md border border-line px-2 text-sm"
            />
            <button
              onClick={() => setLines(lines.filter((_, j) => j !== i))}
              className={iconBtn}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setLines([...lines, { product: "", qty: 1 }])}
          className="text-xs font-bold text-flame hover:underline"
        >
          + Add line
        </button>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
          Note
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-flame"
        />
      </label>
      <Msg error={err} ok={ok} />
      <Btn onClick={submit} disabled={saving}>
        {saving ? "Creating…" : "Create order"}
      </Btn>
    </div>
  );
}

/* ══════════ BANNERS ══════════ */

export function Banners() {
  const { data, loading, error, reload } = useAsync(
    () => bannerApi.listBanners(),
    []
  );
  const rows = data?.banners || [];
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const toggleActive = async (b) => {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!b.isActive));
      await bannerApi.updateBanner(b._id, fd);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => setEditing({})}>
          <Plus size={13} className="mr-1 inline" /> New banner
        </Btn>
      </div>
      <Msg error={error || msg} />
      {loading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : (
        <Table head={["Preview", "Type", "Title", "Order", "Active", ""]}>
          {rows.map((b) => (
            <tr key={b._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                {b.mediaUrlDesktop ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.mediaUrlDesktop}
                    alt=""
                    className="h-10 w-20 rounded object-cover"
                  />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 font-bold">{b.type}</td>
              <td className="px-4 py-3">{b.title || "—"}</td>
              <td className="px-4 py-3">{b.order}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleActive(b)}
                  className={`rounded px-2.5 py-1 text-xs font-bold ${
                    b.isActive
                      ? "bg-leaf-lt text-leaf"
                      : "bg-flame-lt text-flame"
                  }`}
                >
                  {b.isActive ? "Live" : "Hidden"}
                </button>
              </td>
              <td className="px-4 py-3">
                <button className={iconBtn} onClick={() => setEditing(b)}>
                  <PencilSimple size={14} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
                No banners
              </td>
            </tr>
          )}
        </Table>
      )}
      {editing && (
        <BannerModal
          row={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function BannerModal({ row, onClose, onSaved }) {
  const [f, setF] = useState({
    type: row?.type || "SLIDER",
    title: row?.title || "",
    subTitle: row?.subTitle || "",
    ctaLabel: row?.ctaLabel || "",
    ctaUrl: row?.ctaUrl || "",
    order: row?.order ?? 1,
    isActive: row?.isActive !== false,
  });
  const [desktop, setDesktop] = useState(null);
  const [mobile, setMobile] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setErr("");
    if (!row && (!desktop || !mobile))
      return setErr("Desktop and mobile media are both required for a new banner");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("type", f.type);
      fd.append("title", f.title);
      fd.append("subTitle", f.subTitle);
      fd.append("ctaLabel", f.ctaLabel);
      fd.append("ctaUrl", f.ctaUrl);
      fd.append("order", String(f.order));
      fd.append("isActive", String(f.isActive));
      if (desktop) fd.append("mediaDesktop", desktop);
      if (mobile) fd.append("mediaMobile", mobile);
      row
        ? await bannerApi.updateBanner(row._id, fd)
        : await bannerApi.createBanner(fd);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={row ? "Edit banner" : "New banner"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Type"
          value={f.type}
          onChange={set("type")}
          options={[
            { value: "SLIDER", label: "Slider" },
            { value: "SHOWREEL", label: "Showreel" },
          ]}
        />
        <Field
          label="Order"
          type="number"
          value={f.order}
          onChange={set("order")}
        />
        <Field label="Title" value={f.title} onChange={set("title")} />
        <Field label="Subtitle" value={f.subTitle} onChange={set("subTitle")} />
        <Field label="CTA label" value={f.ctaLabel} onChange={set("ctaLabel")} />
        <Field label="CTA url" value={f.ctaUrl} onChange={set("ctaUrl")} />
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Desktop media{row ? " (leave empty to keep)" : ""}
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setDesktop(e.target.files?.[0] || null)}
            className="text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Mobile media{row ? " (leave empty to keep)" : ""}
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setMobile(e.target.files?.[0] || null)}
            className="text-xs"
          />
        </label>
        <label className="col-span-full flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.isActive}
            onChange={(e) => set("isActive")(e.target.checked)}
            className="h-4 w-4 accent-flame"
          />
          Active
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <Msg error={err} />
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ══════════ QUOTATIONS ══════════ */

const QUOTATION_STATUSES = [
  "PENDING",
  "IN_REVIEW",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
];

export function Quotations() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => quotationApi.listQuotations({ page, limit: 20 }),
    [page]
  );
  const rows = data?.quotation || [];
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-4">
      <Msg error={error} />
      {loading ? (
        <p className="text-sm text-ink-3">Loading quotations…</p>
      ) : (
        <Table
          head={["Ref", "Customer", "Type", "Items", "Total", "Status", ""]}
        >
          {rows.map((q) => (
            <tr key={q._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-bold">
                {q.refNumber}
                <span className="block text-xs font-normal text-ink-3">
                  {new Date(q.createdAt).toLocaleDateString("en-IN")}
                </span>
              </td>
              <td className="px-4 py-3">
                {q.name || "—"}
                <span className="block text-xs text-ink-3">{q.phone}</span>
              </td>
              <td className="px-4 py-3">{q.type || "—"}</td>
              <td className="px-4 py-3">{(q.items || []).length}</td>
              <td className="px-4 py-3 font-bold">{formatINR(q.total || 0)}</td>
              <td className="px-4 py-3">
                <span className="rounded bg-canvas px-2 py-1 text-xs font-bold">
                  {q.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => setOpen(q)}
                  className="text-xs font-bold text-flame hover:underline"
                >
                  Manage
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-ink-3">
                No quotations
              </td>
            </tr>
          )}
        </Table>
      )}

      <Pager page={page} setPage={setPage} hasNext={rows.length >= 20} />

      {open && (
        <QuotationModal
          quotation={open}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

// Cloudinary serves files inline by default, so a plain <a download> is
// ignored for these cross-origin URLs — the browser just opens the file
// instead of saving it. Inserting fl_attachment makes Cloudinary itself
// send Content-Disposition: attachment, which actually forces the save.
function withAttachmentFlag(url) {
  if (!url) return url;
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1 || url.includes("fl_attachment")) return url;
  return `${url.slice(0, i + marker.length)}fl_attachment/${url.slice(i + marker.length)}`;
}

function QuotationModal({ quotation, onClose, onSaved }) {
  const [f, setF] = useState({
    status: quotation.status,
    subTotal: quotation.subTotal ?? 0,
    tax: quotation.tax ?? 0,
    shipping: quotation.shipping ?? 0,
    validTill: quotation.validTill ? isoDay(quotation.validTill) : "",
    message: "",
  });
  const [lines, setLines] = useState(
    (quotation.items || []).map((it) => ({
      id: it._id,
      label: it.product ? "Product item" : "Custom item",
      qty: it.qty,
      unitPrice: it.unitPrice ?? 0,
      tax: it.tax ?? 0,
    }))
  );
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const setLine = (i, k, v) =>
    setLines((s) => s.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const computedSubtotal = lines.reduce(
    (n, l) => n + Number(l.unitPrice || 0) * Number(l.qty || 0),
    0
  );

  const save = async () => {
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await quotationApi.updateQuotationByAdmin(quotation._id, {
        status: f.status,
        subTotal: Number(f.subTotal),
        tax: Number(f.tax),
        shipping: Number(f.shipping),
        validTill: f.validTill || undefined,
        message: f.message || undefined,
        items: lines.map((l) => ({
          id: l.id,
          unitPrice: Number(l.unitPrice),
          tax: Number(l.tax),
        })),
      });
      setOk("Quotation updated");
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Quotation ${quotation.refNumber}`} onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-line bg-canvas p-3 text-xs">
          <p>
            <b>{quotation.name}</b> · {quotation.phone}
            {quotation.email ? ` · ${quotation.email}` : ""}
          </p>
          {quotation.company && <p>Company: {quotation.company}</p>}
          {quotation.requirements && (
            <p className="mt-1">{quotation.requirements}</p>
          )}
          {quotation.shippingAddress?.city && (
            <p className="mt-1 text-ink-3">
              Ship to: {quotation.shippingAddress.addressLine1},{" "}
              {quotation.shippingAddress.city}, {quotation.shippingAddress.state}{" "}
              {quotation.shippingAddress.pincode}
            </p>
          )}
        </div>

        {(quotation.files || []).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-4">
              Files
            </p>
            <div className="flex flex-wrap gap-2">
              {quotation.files.map((file) => (
                <span
                  key={file._id}
                  className="flex items-center gap-1 rounded border border-line pl-2 pr-1 py-1"
                >
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-flame hover:underline"
                  >
                    {file.fileName || "file"}
                  </a>
                  <a
                    href={withAttachmentFlag(file.fileUrl)}
                    download={file.fileName || true}
                    aria-label={`Download ${file.fileName || "file"}`}
                    className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-canvas hover:text-ink"
                  >
                    <DownloadSimple size={13} />
                  </a>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-4">
            Line items
          </p>
          {lines.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-0.5 pb-1">
              <span className="min-w-[110px] flex-1 text-[10px] font-bold uppercase tracking-wide text-ink-4">
                Item
              </span>
              <span className="w-28 text-[10px] font-bold uppercase tracking-wide text-ink-4">
                Unit price
              </span>
              <span className="w-24 text-[10px] font-bold uppercase tracking-wide text-ink-4">
                Tax
              </span>
            </div>
          )}
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={l.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[110px] flex-1 text-xs">
                  {l.label}
                  {/* a custom item with no catalogue product carries a
                      placeholder qty, not a real one — don't show it */}
                  {l.label !== "Custom item" && ` · ×${l.qty}`}
                </span>
                <input
                  type="number"
                  aria-label="Unit price"
                  placeholder="Unit price"
                  value={l.unitPrice}
                  onChange={(e) => setLine(i, "unitPrice", e.target.value)}
                  className="h-9 w-28 rounded-md border border-line px-2 text-sm"
                />
                <input
                  type="number"
                  aria-label="Tax"
                  placeholder="Tax"
                  value={l.tax}
                  onChange={(e) => setLine(i, "tax", e.target.value)}
                  className="h-9 w-24 rounded-md border border-line px-2 text-sm"
                />
              </div>
            ))}
            {lines.length === 0 && (
              <p className="text-xs text-ink-3">No line items</p>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-3">
            Computed line subtotal: {formatINR(computedSubtotal)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Status"
            value={f.status}
            onChange={set("status")}
            options={QUOTATION_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Field
            label="Valid till"
            type="date"
            value={f.validTill}
            onChange={set("validTill")}
          />
          <Field
            label="Sub total"
            type="number"
            value={f.subTotal}
            onChange={set("subTotal")}
          />
          <Field label="Tax" type="number" value={f.tax} onChange={set("tax")} />
          <Field
            label="Shipping"
            type="number"
            value={f.shipping}
            onChange={set("shipping")}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Message to customer
          </span>
          <textarea
            value={f.message}
            onChange={(e) => set("message")(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-flame"
          />
        </label>

        <Msg error={err} ok={ok} />
        <Btn onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save quotation"}
        </Btn>

        {(quotation.messages || []).length > 0 && (
          <div className="border-t border-line pt-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-4">
              Conversation
            </p>
            <div className="space-y-1.5">
              {quotation.messages.map((m) => (
                <p key={m._id} className="text-xs">
                  <b>{m.sender}:</b> {m.message}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
