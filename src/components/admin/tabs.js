"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Trash, PencilSimple, Plus, DownloadSimple } from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import * as analyticsApi from "@/api/analytics.api";
import * as orderApi from "@/api/order.api";
import * as productApi from "@/api/product.api";
import * as categoryApi from "@/api/category.api";
import * as subcategoryApi from "@/api/subcategory.api";
import * as couponApi from "@/api/coupon.api";
import * as userApi from "@/api/user.api";

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

function Field({ label, value, onChange, type = "text", options, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </span>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

/* ══════════ OVERVIEW ══════════ */

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

export function Overview() {
  const [from, setFrom] = useState(
    isoDay(Date.now() - 29 * 864e5)
  );
  const [to, setTo] = useState(isoDay(Date.now()));
  const { data, loading, error } = useAsync(
    () => analyticsApi.getDashboard({ from, to }),
    [from, to]
  );

  const ov = data?.overview || {};
  const cards = [
    ["Revenue", formatINR(ov.revenue?.total || 0), ov.revenue?.growthPercent],
    ["Orders", ov.orders?.total ?? 0, ov.orders?.growthPercent],
    [
      "Avg order value",
      formatINR(ov.averageOrderValue?.value || 0),
      ov.averageOrderValue?.growthPercent,
    ],
    ["Pending payment", ov.orders?.pendingPayment ?? 0, null],
    ["Cancelled", ov.orders?.cancelled ?? 0, null],
    ["New customers", ov.customers?.new ?? ov.customers?.total ?? 0, null],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" type="date" value={from} onChange={setFrom} />
        <Field label="To" type="date" value={to} onChange={setTo} />
      </div>

      <Msg error={error} />
      {loading ? (
        <p className="text-sm text-ink-3">Loading analytics…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map(([label, value, growth]) => (
              <div
                key={label}
                className="rounded-xl border border-line bg-shell p-4"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
                  {label}
                </p>
                <p className="mt-1 font-display text-xl font-extrabold text-ink">
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
            ))}
          </div>

          <TopList
            title="Top products"
            rows={
              data?.topProducts?.products ||
              data?.topProducts ||
              []
            }
            render={(p) => [
              p.name || p.nameSnapshot || p._id,
              formatINR(p.revenue || p.totalRevenue || 0),
              `${p.qty || p.unitsSold || p.totalQty || 0} sold`,
            ]}
          />
          <TopList
            title="Top customers"
            rows={data?.topCustomers?.customers || data?.topCustomers || []}
            render={(c) => [
              c.name || c.user?.name || c._id,
              formatINR(c.revenue || c.totalSpent || 0),
              `${c.orders || c.orderCount || 0} orders`,
            ]}
          />
        </>
      )}
    </div>
  );
}

function TopList({ title, rows, render }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
        {title}
      </h3>
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
];

function useOrders() {
  return useAsync(() => orderApi.getAdminOrders(), []);
}

function OrderList({ filterId }) {
  const { data, loading, error } = useOrders();
  const [open, setOpen] = useState(null);
  const orders = Array.isArray(data) ? data : data?.data || [];
  const f = ORDER_TABS.find((t) => t.id === filterId) || ORDER_TABS[0];
  const rows = orders.filter(f.test);

  if (loading) return <p className="text-sm text-ink-3">Loading orders…</p>;
  return (
    <>
      <Msg error={error} />
      <Table head={["Order", "Customer", "Items", "Total", "Status", ""]}>
        {rows.map((o) => (
          <>
            <tr key={o._id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-bold">
                #{String(o._id).slice(-8).toUpperCase()}
                <span className="block text-xs font-normal text-ink-3">
                  {new Date(o.createdAt).toLocaleDateString("en-IN")}
                </span>
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
                <span className="rounded bg-canvas px-2 py-1 text-xs font-bold">
                  {o.status?.replace(/_/g, " ")}
                </span>
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
                <td colSpan={6} className="bg-canvas px-4 py-3">
                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-bold text-ink-4">SHIPPING</p>
                      <p>
                        {o.shippingAddress?.name},{" "}
                        {o.shippingAddress?.addressLine1},{" "}
                        {o.shippingAddress?.city} {o.shippingAddress?.pincode}
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
            <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
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

export function Payments() {
  const { data, loading, error } = useOrders();
  const orders = Array.isArray(data) ? data : data?.data || [];
  const paid = orders.filter((o) => o.payment?.status === "PAID");
  const collected = paid.reduce((n, o) => n + (o.pricing?.total || 0), 0);

  if (loading) return <p className="text-sm text-ink-3">Loading payments…</p>;
  return (
    <div className="space-y-4">
      <Msg error={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      </div>

      <Table head={["Txn / Order", "Customer", "Method", "Amount", "Paid at"]}>
        {paid.map((o) => (
          <tr key={o._id} className="border-b border-line last:border-0">
            <td className="px-4 py-3">
              <span className="block font-bold">
                {o.payment?.transactionId || "—"}
              </span>
              <span className="text-xs text-ink-3">
                #{String(o._id).slice(-8).toUpperCase()}
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
            <td className="px-4 py-3 text-xs">
              {o.payment?.paidAt
                ? new Date(o.payment.paidAt).toLocaleString("en-IN")
                : "—"}
            </td>
          </tr>
        ))}
        {paid.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-ink-3">
              No payments yet
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}

/* ══════════ PRODUCTS ══════════ */

export function Products() {
  const { data, loading, error, reload } = useAsync(
    () => productApi.listProducts({ limit: 200 }),
    []
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
      <div className="flex items-center justify-between">
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
      </div>

      {savedId && (
        <div className="mt-5 space-y-5 border-t border-line pt-5">
          <SpecEditor productId={savedId} />
          <PriceSlabEditor productId={savedId} />
          <OptionEditor productId={savedId} />
        </div>
      )}
    </Modal>
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
      {rows.map((s) => (
        <Row
          key={s._id}
          text={`${s.label}: ${s.value}`}
          onDelete={async () => {
            await productApi.deleteSpec(productId, s._id);
            reload();
          }}
        />
      ))}
      <div className="flex gap-2">
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
      {rows.map((s) => (
        <Row
          key={s._id}
          text={`${s.minQty}${s.maxQty ? `–${s.maxQty}` : "+"} @ ${formatINR(
            s.unitPrice
          )}`}
          onDelete={async () => {
            await productApi.deletePriceSlab(productId, s._id);
            reload();
          }}
        />
      ))}
      <div className="flex gap-2">
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
          className="h-9 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-flame"
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
      {options.map((o) => (
        <div key={o._id} className="rounded-md border border-line p-2">
          <Row
            text={`${o.name} (${o.type}${o.isRequired ? ", required" : ""})`}
            onDelete={async () => {
              await productApi.deleteOption(productId, o._id);
              reload();
            }}
          />
          <ValueEditor productId={productId} option={o} onChange={reload} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
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

function ValueEditor({ option, onChange }) {
  const { data, reload } = useAsync(
    () => productApi.getOptionValues(option._id),
    [option._id]
  );
  const values = data?.values || data || option.values || [];
  const [value, setValue] = useState("");
  const [delta, setDelta] = useState("");

  const add = async () => {
    if (!value) return;
    await productApi.createOptionValue(option._id, {
      value,
      priceDelta: Number(delta) || 0,
      priceMultiplier: 1,
    });
    setValue("");
    setDelta("");
    reload();
    onChange?.();
  };
  return (
    <div className="mt-2 space-y-1.5 pl-3">
      {values.map((v) => (
        <Row
          key={v._id}
          small
          text={`${v.value}${v.priceDelta ? ` +${formatINR(v.priceDelta)}` : ""}`}
          onDelete={async () => {
            await productApi.deleteOptionValue(option._id, v._id);
            reload();
            onChange?.();
          }}
        />
      ))}
      <div className="flex gap-2">
        <input
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 flex-1 rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
        />
        <input
          placeholder="+₹"
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          className="h-8 w-16 rounded-md border border-line px-2 text-xs outline-none focus:border-flame"
        />
        <AddBtn onClick={add} small />
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div>
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-4">
      {title}
    </p>
    <div className="space-y-2">{children}</div>
  </div>
);

const Row = ({ text, onDelete, small }) => (
  <div
    className={`flex items-center justify-between rounded ${
      small ? "text-xs" : "text-sm"
    }`}
  >
    <span className="font-semibold text-ink-2">{text}</span>
    <button
      onClick={onDelete}
      className="text-ink-3 hover:text-flame"
      aria-label="Delete"
    >
      <Trash size={small ? 12 : 14} />
    </button>
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

function TaxonomyTab({ kind }) {
  const isCat = kind === "category";
  const api = isCat ? categoryApi : subcategoryApi;
  const listFn = isCat
    ? () => categoryApi.listCategories({ limit: 200 })
    : () => subcategoryApi.listSubcategories({ limit: 500 });
  const { data, loading, error, reload } = useAsync(listFn, []);
  const catsData = useAsync(
    () => categoryApi.listCategories({ limit: 200 }),
    []
  );
  const rows = isCat ? data?.category || [] : data?.subCategory || [];
  const categories = catsData.data?.category || [];
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

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

export function UsersTab() {
  const { data, loading, error, reload } = useAsync(
    () => userApi.listUsers({ limit: 500 }),
    []
  );
  const rows = data?.users || data?.data || [];
  const [msg, setMsg] = useState("");

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
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

/* ══════════ MANUAL ORDER ══════════ */

export function ManualOrder() {
  const users = useAsync(() => userApi.listUsers({ limit: 500 }), []);
  const products = useAsync(
    () => productApi.listProducts({ limit: 500, status: "PUBLISHED" }),
    []
  );
  const [userId, setUserId] = useState("");
  const [lines, setLines] = useState([{ product: "", qty: 1 }]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const userRows = users.data?.users || users.data?.data || [];
  const productRows = products.data?.products || [];

  const submit = async () => {
    setErr("");
    setOk("");
    if (!userId) return setErr("Choose a customer");
    setSaving(true);
    try {
      await orderApi.createManualOrder({
        userId,
        user: userId,
        items: lines
          .filter((l) => l.product && l.qty)
          .map((l) => ({ product: l.product, productId: l.product, qty: Number(l.qty) })),
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
        value={userId}
        onChange={setUserId}
        options={userRows.map((u) => ({
          value: u._id,
          label: `${u.name} · ${u.phone}`,
        }))}
      />
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
          Items
        </p>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={l.product}
              onChange={(e) => {
                const next = [...lines];
                next[i].product = e.target.value;
                setLines(next);
              }}
              className="h-10 flex-1 rounded-md border border-line px-2 text-sm"
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
  return (
    <div className="rounded-xl border border-dashed border-line bg-shell p-10 text-center">
      <p className="font-display text-lg font-extrabold text-ink">
        Banners
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-3">
        The hero currently uses the built-in carousel. Banner management wiring
        (`/api/Banner`) is scaffolded and can be turned on here later.
      </p>
    </div>
  );
}
