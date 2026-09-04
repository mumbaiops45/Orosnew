"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CaretRight, ArrowUpRight } from "@phosphor-icons/react";
import { formatINR, unitPriceFor } from "@/lib/format";
import { fetchProducts } from "@/lib/catalog";
import { createQuotation } from "@/api/quotation.api";
import { getAddress } from "@/api/address.api";
import { useAuthStore } from "@/store/authStore";

const MACHINES = 40;
const HOURS_PER_DAY = 20;
const FINISHING_DAYS = 2;

/** No spec sheet in the list payload — approximate print time from lead time. */
function printHours(p) {
  if (p?.leadTimeDays) return Math.max(2, p.leadTimeDays * 1.5);
  return 8;
}

export default function BulkDesk() {
  const params = useSearchParams();
  const isCustom = params.has("custom");
  const token = useAuthStore((s) => s.token);

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(250);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [files, setFiles] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  // every field the quotation model / createQuotationService accepts
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    taxRegNo: "",
    requirements: "",
    deadline: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const useMyAddress = async () => {
    setAddrLoading(true);
    setErr("");
    try {
      const { address } = await getAddress();
      if (!address) {
        setErr("No saved address found on your account");
        return;
      }
      setForm((f) => ({
        ...f,
        name: f.name || address.name || "",
        phone: f.phone || address.phone || "",
        addressLine1: address.addressLine1 || "",
        addressLine2: address.addressLine2 || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "India",
        pincode: address.pincode || "",
      }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts({ limit: 200 }).then(({ products }) => {
      setProducts(products);
      if (products[0]) setProductId((cur) => cur || products[0].id);
    });
  }, []);

  const product = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId]
  );

  const calc = useMemo(() => {
    if (!product) return null;
    const unit = unitPriceFor(product, qty);
    const retail = product.price;
    const tiers = [{ minQty: product.minQty || 1, price: retail }, ...(product.bulkTiers || [])];
    const tierIndex = tiers.reduce((b, t, i) => (qty >= t.minQty ? i : b), 0);
    const next = tiers[tierIndex + 1];
    const farmHours = (printHours(product) * qty) / MACHINES;
    const days = Math.ceil(farmHours / HOURS_PER_DAY) + FINISHING_DAYS;
    return {
      unit,
      retail,
      tiers,
      tierIndex,
      next,
      total: unit * qty,
      saving: (retail - unit) * qty,
      offPct: retail ? Math.round(((retail - unit) / retail) * 100) : 0,
      farmHours,
      days,
    };
  }, [product, qty]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return;
    }
    if (!form.phone || form.phone.length < 10)
      return setErr("A valid phone number is required");
    for (const [k, label] of [
      ["name", "Name"],
      ["email", "Email"],
      ["addressLine1", "Address line 1"],
      ["city", "City"],
      ["state", "State"],
      ["country", "Country"],
      ["pincode", "Pincode"],
    ]) {
      if (!form[k]?.trim()) return setErr(`${label} is required`);
    }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", isCustom ? "CUSTOM" : "BULK");
      fd.append("name", form.name);
      fd.append("phone", form.phone);
      fd.append("email", form.email);
      fd.append("company", form.company);
      fd.append("taxRegNo", form.taxRegNo);
      if (form.deadline) fd.append("deadline", form.deadline);
      fd.append(
        "requirements",
        isCustom
          ? form.requirements
          : `${qty} × ${product?.name}${
              product?.sku ? ` (SKU ${product.sku})` : ""
            } — target ${formatINR(calc?.unit || 0)}/unit. ${
              form.requirements || ""
            }`.trim()
      );
      fd.append(
        "shippingAddress",
        JSON.stringify({
          name: form.name,
          phone: form.phone,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          state: form.state,
          country: form.country,
          pincode: form.pincode,
        })
      );
      if (!isCustom && product) {
        fd.append(
          "items",
          JSON.stringify([{ productId: product.id, qty }])
        );
      }
      for (const f of files) fd.append("files", f);

      await createQuotation(fd);
      setSent(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 lg:px-8">
      <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <span className="font-semibold text-ink">
          {isCustom ? "Custom quote" : "Wholesale"}
        </span>
      </nav>

      <div className="border-b border-line pb-8">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-[-0.03em] text-ink">
          {isCustom ? "Request a custom quote" : "Wholesale"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
          {isCustom
            ? "Tell us what you need — dimensions, materials, finishing, quantities. The desk will come back with pricing and a lead time."
            : "Nothing here is injection moulded, so there is no tool to pay for and no minimum to clear. Volume discounts exist because a longer run means fewer plate changes per unit."}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/bulk"
            className={`rounded-lg border px-4 py-2 text-xs font-bold ${
              !isCustom
                ? "border-flame bg-flame-lt text-flame"
                : "border-line text-ink-2"
            }`}
          >
            Price a run
          </Link>
          <Link
            href="/bulk?custom"
            className={`rounded-lg border px-4 py-2 text-xs font-bold ${
              isCustom
                ? "border-flame bg-flame-lt text-flame"
                : "border-line text-ink-2"
            }`}
          >
            Custom project
          </Link>
        </div>
      </div>

      {!isCustom && (
        <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="rounded-2xl border border-line bg-shell p-6 lg:p-8">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              Price a run
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="relative h-[120px] w-[120px] overflow-hidden rounded-xl bg-canvas">
                {product && (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                    Product
                  </span>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="h-11 w-full rounded-lg border border-line bg-shell px-3 text-sm font-bold text-ink outline-none focus:border-flame"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.categoryName ? ` — ${p.categoryName}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                    Quantity
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={qty}
                    onChange={(e) =>
                      setQty(
                        Math.max(1, Math.min(100000, Number(e.target.value) || 1))
                      )
                    }
                    className="no-spin h-11 w-full rounded-lg border border-line px-3 font-display text-lg font-extrabold text-ink outline-none focus:border-flame"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {[25, 50, 75, 200, 500, 1000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQty(n)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                        qty === n
                          ? "border-flame bg-flame-lt text-flame"
                          : "border-line text-ink-2 hover:border-ink-5"
                      }`}
                    >
                      {n.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {calc && (calc.tiers.length > 1) && (
              <div className="mt-7 border-t border-line pt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-4">
                  This product&apos;s ladder
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {calc.tiers.map((t, i) => (
                    <button
                      key={t.minQty}
                      onClick={() => setQty(t.minQty)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        i === calc.tierIndex
                          ? "border-flame bg-flame-lt"
                          : "border-line hover:border-ink-5"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-4">
                        {i === calc.tiers.length - 1
                          ? `${t.minQty}+`
                          : `${t.minQty}–${calc.tiers[i + 1].minQty - 1}`}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-extrabold text-ink">
                        {formatINR(t.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {calc && product && (
            <div className="rounded-2xl border-2 border-ink bg-ink p-6 text-white lg:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                {qty.toLocaleString("en-IN")} × {product.name}
              </p>
              <p className="mt-3 font-display text-4xl font-extrabold leading-none">
                {formatINR(calc.total)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                {formatINR(calc.unit)} per unit
                {calc.offPct > 0 && (
                  <span className="ml-2 font-bold text-mint">
                    {calc.offPct}% under list
                  </span>
                )}
              </p>

              <dl className="mt-7 space-y-3 border-t border-white/12 pt-6 text-sm">
                <Row label="At list price">{formatINR(calc.retail * qty)}</Row>
                <Row label="You save" accent>
                  {formatINR(calc.saving)}
                </Row>
                <Row label="Machine hours">
                  {Math.round(calc.farmHours).toLocaleString("en-IN")} h across{" "}
                  {MACHINES} printers
                </Row>
                <Row label="Realistic lead time">
                  {calc.days} working day{calc.days === 1 ? "" : "s"}
                </Row>
              </dl>

              {calc.next && (
                <p className="mt-6 rounded-xl bg-white/8 px-4 py-3 text-xs leading-relaxed text-white/75">
                  At{" "}
                  <button
                    onClick={() => setQty(calc.next.minQty)}
                    className="font-bold text-gold underline underline-offset-2"
                  >
                    {calc.next.minQty.toLocaleString("en-IN")} units
                  </button>{" "}
                  this drops to {formatINR(calc.next.price)} each.
                </p>
              )}

              <a
                href="#enquiry"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-flame py-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Send this spec to the desk
                <ArrowUpRight size={16} weight="bold" />
              </a>
            </div>
          )}
        </section>
      )}

      {/* ══ Full price list ══ */}
      {!isCustom && products.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
            Every product, every tier
          </h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-shell">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-ink-4">
                    Product
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-ink-4">
                    List
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-ink-4">
                    Best tier
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-ink-4">
                    Saving
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const tiers = p.bulkTiers || [];
                  const best = tiers.length ? tiers[tiers.length - 1].price : p.price;
                  const savePct = p.price
                    ? Math.round(((p.price - best) / p.price) * 100)
                    : 0;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setProductId(p.id)}
                      className={`cursor-pointer border-b border-line last:border-0 transition-colors ${
                        p.id === productId ? "bg-flame-lt" : "hover:bg-canvas"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <span className="block font-bold text-ink">{p.name}</span>
                        <span className="block text-xs text-ink-3">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink-3">
                        {formatINR(p.price)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {formatINR(best)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-leaf">
                        {savePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ══ Enquiry ══ */}
      <section
        id="enquiry"
        className="mt-12 rounded-2xl border border-line bg-shell p-6 lg:p-8"
      >
        {sent ? (
          <div className="py-10 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">
              Request received
            </p>
            <p className="mt-2 text-sm text-ink-3">
              The wholesale desk will get back to you by email. You can track it
              from your account.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              {isCustom ? "Describe your project" : "Send this spec to the desk"}
            </h2>
            {!token && (
              <p className="mt-2 rounded-lg bg-gold-lt px-3 py-2 text-xs font-semibold text-ink-2">
                Tip: log in first so this quote is saved to your account.
              </p>
            )}

            {!isCustom && product && calc && (
              <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-4 py-2.5 text-sm">
                <span className="font-bold text-ink">
                  {qty.toLocaleString("en-IN")} × {product.name}
                </span>
                <span className="text-ink-3">·</span>
                <span className="font-semibold text-ink-2">
                  {formatINR(calc.unit)}/unit
                </span>
                <span className="text-ink-3">·</span>
                <span className="font-semibold text-ink-2">
                  {formatINR(calc.total)} total
                </span>
              </p>
            )}

            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Contact name"
                value={form.name}
                onChange={set("name")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                required
                placeholder="Phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                required
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={set("email")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                placeholder="Company (optional)"
                value={form.company}
                onChange={set("company")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                placeholder="GST / Tax reg. no. (optional)"
                value={form.taxRegNo}
                onChange={set("taxRegNo")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <label className="flex h-12 items-center gap-2 rounded-xl border border-line px-4 text-sm text-ink-3 focus-within:border-flame">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-ink-4">
                  Needed by
                </span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={set("deadline")}
                  className="w-full bg-transparent text-ink outline-none"
                />
              </label>

              <textarea
                required={isCustom}
                placeholder={
                  isCustom
                    ? "What do you need? Sizes, materials, finish, quantity, deadline…"
                    : "Anything else the desk should know (optional)"
                }
                value={form.requirements}
                onChange={set("requirements")}
                rows={3}
                className="rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-flame sm:col-span-2"
              />

              {/* ── Shipping address (required by the backend) ── */}
              <div className="flex items-center justify-between sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-4">
                  Delivery address
                </p>
                {token && (
                  <button
                    type="button"
                    onClick={useMyAddress}
                    disabled={addrLoading}
                    className="rounded-lg border border-flame px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt disabled:opacity-50"
                  >
                    {addrLoading ? "Loading…" : "Use my saved address"}
                  </button>
                )}
              </div>
              <input
                required
                placeholder="Address line 1"
                value={form.addressLine1}
                onChange={set("addressLine1")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame sm:col-span-2"
              />
              <input
                placeholder="Address line 2 (optional)"
                value={form.addressLine2}
                onChange={set("addressLine2")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame sm:col-span-2"
              />
              <input
                required
                placeholder="City"
                value={form.city}
                onChange={set("city")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                required
                placeholder="State"
                value={form.state}
                onChange={set("state")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                required
                placeholder="Country"
                value={form.country}
                onChange={set("country")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                required
                placeholder="Pincode"
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />

              <label className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-3 sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                  Reference files (optional, up to 10)
                </span>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setFiles(Array.from(e.target.files || []).slice(0, 10))
                  }
                  className="block w-full text-xs text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink"
                />
                {files.length > 0 && (
                  <span className="mt-1 block text-xs text-ink-3">
                    {files.length} file{files.length === 1 ? "" : "s"} attached
                  </span>
                )}
              </label>

              {err && (
                <p className="text-xs font-semibold text-flame sm:col-span-2">
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="h-12 rounded-xl bg-flame px-8 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60 sm:col-span-2"
              >
                {sending
                  ? "Sending…"
                  : token
                    ? "Send request"
                    : "Log in to send request"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function Row({ label, children, accent }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-white/50">{label}</dt>
      <dd
        className={`text-right font-semibold ${accent ? "text-mint" : "text-white"}`}
      >
        {children}
      </dd>
    </div>
  );
}
