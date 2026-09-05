"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { fetchProducts } from "@/lib/catalog";
import { createQuotation, listQuotations } from "@/api/quotation.api";
import { getAddress } from "@/api/address.api";
import { useAuthStore } from "@/store/authStore";
import QuotationThread from "@/components/QuotationThread";

// wraps a required input/select and drops a red asterisk in the corner —
// these fields have no visible label, only a placeholder, so this is the
// only way to flag "required" without redesigning the whole form
function RequiredField({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-flame"
      >
        *
      </span>
    </div>
  );
}

export default function BulkDesk() {
  const params = useSearchParams();
  const pathname = usePathname();
  // /custom is a dedicated custom-quote route; /bulk?custom keeps working too
  const isCustom = pathname === "/custom" || params.has("custom");
  const productParam = params.get("product");
  const qtyParam = Number(params.get("qty")) || 0;
  const token = useAuthStore((s) => s.token);

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(qtyParam > 0 ? qtyParam : 250);
  const [created, setCreated] = useState(null);
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
    preferredProductId: "",
    preferredQty: 1,
    variantDetails: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  const productMap = useMemo(
    () => new Map(products.map((p) => [String(p.id), p])),
    [products]
  );

  const reloadCreated = async () => {
    const data = await listQuotations({ limit: 50 });
    const fresh = (data?.quotation || []).find(
      (x) => String(x._id) === String(created?._id)
    );
    if (fresh) setCreated(fresh);
  };

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
      const fromLink =
        productParam &&
        products.find(
          (p) => p.slug === productParam || p.id === productParam
        );
      if (fromLink) {
        setProductId(fromLink.id);
        if (isCustom) {
          setForm((f) =>
            f.requirements
              ? f
              : { ...f, requirements: `Custom order based on ${fromLink.name}: ` }
          );
        }
      } else if (products[0]) {
        setProductId((cur) => cur || products[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productParam, isCustom]);

  const product = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId]
  );

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

      const preferred = products.find(
        (p) => p.id === form.preferredProductId
      );
      fd.append(
        "requirements",
        isCustom
          ? [
              form.requirements,
              preferred ? `Closest product in range: ${preferred.name}` : "",
              form.variantDetails
                ? `Variant / spec needed (not in catalogue): ${form.variantDetails}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          : `${qty} × ${product?.name}${
              product?.sku ? ` (SKU ${product.sku})` : ""
            }. ${form.requirements || ""}`.trim()
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
      } else if (isCustom && preferred) {
        fd.append(
          "items",
          JSON.stringify([
            {
              productId: preferred.id,
              qty: Math.max(1, Number(form.preferredQty) || 1),
            },
          ])
        );
      }
      // no preferred product picked — that's fine, the desk prices a
      // free-text custom request by hand; the backend defaults its
      // placeholder item to qty 1
      for (const f of files) fd.append("files", f);

      const res = await createQuotation(fd);
      setCreated({
        ...res.quotation,
        items:
          res.quotationItems ||
          (res.quotationItem ? [res.quotationItem] : []),
        files: res.quotationFiles || [],
        messages: res.quotationMessage ? [res.quotationMessage] : [],
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-[820px] px-4 pb-20 lg:px-8">
        <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
          <Link href="/" className="hover:text-flame">
            Home
          </Link>
          <CaretRight size={11} />
          <span className="font-semibold text-ink">
            {isCustom ? "Custom quote" : "Wholesale"}
          </span>
        </nav>
        <div className="rounded-2xl border border-line bg-shell p-6 lg:p-8">
          <p className="font-display text-2xl font-extrabold text-ink">
            Request sent to the desk
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Follow it right here, or any time from{" "}
            <Link
              href="/account?tab=quotations"
              className="font-bold text-flame"
            >
              your account
            </Link>
            .
          </p>
          <div className="mt-6 border-t border-line pt-6">
            <QuotationThread
              quotation={created}
              productMap={productMap}
              onChange={reloadCreated}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 pb-20 lg:px-8">
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
            ? "Tell us what you need — dimensions, materials, finishing, quantities. The desk comes back with pricing and a lead time on the quotation."
            : "Pick a product and quantity, send it to the desk, and they'll come back on the quotation with a per-unit price, tax, freight and a lead time. Talk it through in the thread — pay once it's final."}
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
            Bulk quote
          </Link>
          <Link
            href="/custom"
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
        <section className="order-1 mt-8 rounded-2xl border border-line bg-shell p-6 lg:p-8">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
            What are you ordering?
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Pick the product and quantity. The desk prices every bulk order by
            hand — the numbers come back to you on the quotation.
          </p>

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
                  Product<span className="text-flame"> *</span>
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
                  Quantity<span className="text-flame"> *</span>
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

              <a
                href="#enquiry"
                className="inline-flex items-center gap-2 rounded-xl bg-flame px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Continue to details
                <CaretRight size={14} weight="bold" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ══ Enquiry ══ */}
      <section
        id="enquiry"
        className="order-2 mt-12 rounded-2xl border border-line bg-shell p-6 lg:p-8"
      >
        {
          <>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              {isCustom ? "Describe your project" : "Send this spec to the desk"}
            </h2>
            {!token && (
              <p className="mt-2 rounded-lg bg-gold-lt px-3 py-2 text-xs font-semibold text-ink-2">
                Tip: log in first so this quote is saved to your account.
              </p>
            )}

            {!isCustom && product && (
              <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-4 py-2.5 text-sm">
                <span className="font-bold text-ink">
                  {qty.toLocaleString("en-IN")} × {product.name}
                </span>
                <span className="text-ink-3">·</span>
                <span className="font-semibold text-ink-2">
                  priced by the desk
                </span>
              </p>
            )}

            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <RequiredField>
                <input
                  required
                  placeholder="Contact name"
                  value={form.name}
                  onChange={set("name")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
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
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  type="email"
                  placeholder="Work email"
                  value={form.email}
                  onChange={set("email")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
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

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                  Requirements
                  {isCustom ? (
                    <>
                      <span className="text-flame"> *</span>
                      <span className="normal-case font-normal tracking-normal text-ink-3">
                        {" "}
                        (want your own 3D model printed? mention the quantity
                        here too)
                      </span>
                    </>
                  ) : (
                    " (optional)"
                  )}
                </span>
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
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-flame"
                />
              </label>

              {isCustom && (
                <>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                      Closest product in our range (optional)
                    </span>
                    <select
                      value={form.preferredProductId}
                      onChange={set("preferredProductId")}
                      className="h-12 w-full rounded-xl border border-line bg-shell px-4 text-sm font-semibold text-ink outline-none focus:border-flame"
                    >
                      <option value="">— not sure / nothing close —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.categoryName ? ` — ${p.categoryName}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* only matters once a closest-match product is picked —
                      that's what makes this "the same, but N units of a
                      variant we don't list" rather than a free-text ask */}
                  {form.preferredProductId && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                        Quantity needed<span className="text-flame"> *</span>
                      </span>
                      <input
                        required
                        type="number"
                        min={1}
                        value={form.preferredQty}
                        onChange={set("preferredQty")}
                        className="h-12 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
                      />
                    </label>
                  )}

                  <input
                    placeholder="Which colour / size / material do you need that we don't list?"
                    value={form.variantDetails}
                    onChange={set("variantDetails")}
                    className={`h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame ${
                      form.preferredProductId ? "" : "sm:col-span-2"
                    }`}
                  />
                </>
              )}

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
              <RequiredField className="sm:col-span-2">
                <input
                  required
                  placeholder="Address line 1"
                  value={form.addressLine1}
                  onChange={set("addressLine1")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <input
                placeholder="Address line 2 (optional)"
                value={form.addressLine2}
                onChange={set("addressLine2")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame sm:col-span-2"
              />
              <RequiredField>
                <input
                  required
                  placeholder="City"
                  value={form.city}
                  onChange={set("city")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  placeholder="State"
                  value={form.state}
                  onChange={set("state")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  placeholder="Country"
                  value={form.country}
                  onChange={set("country")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
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
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>

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
        }
      </section>
    </div>
  );
}
