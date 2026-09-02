"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CaretRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  PRODUCTS,
  formatINR,
  unitPriceFor,
  getProduct,
  getCategory,
} from "@/lib/products";

/* The floor runs 40 machines, and we plan on 20 usable hours a day per
   machine rather than 24 — the rest goes to plate changes and cooldown. */
const MACHINES = 40;
const HOURS_PER_DAY = 20;
const FINISHING_DAYS = 2;

/** Parse "14 h 20 m" out of the spec sheet into decimal hours. */
function printHours(p) {
  const m = /(\d+)\s*h(?:\s*(\d+)\s*m)?/.exec(p.specs["Print time"] || "");
  return m ? Number(m[1]) + Number(m[2] || 0) / 60 : 8;
}

const TIER_LABELS = ["1 – 24", "25 – 99", "100 – 499", "500+"];

export default function BulkDesk() {
  const [slug, setSlug] = useState("modular-tool-caddy");
  const [qty, setQty] = useState(250);
  const [sent, setSent] = useState(false);

  const product = getProduct(slug);

  const calc = useMemo(() => {
    const unit = unitPriceFor(product, qty);
    const retail = product.price;
    const tiers = [{ minQty: 1, price: retail }, ...product.bulkTiers];
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
      offPct: Math.round(((retail - unit) / retail) * 100),
      farmHours,
      days,
      filamentKg: null,
    };
  }, [product, qty]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 lg:px-8">
      {/* ══ Head ══ */}
      <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <span className="font-semibold text-ink">Wholesale</span>
      </nav>

      <div className="border-b border-line pb-8">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-[-0.03em] text-ink">
          Wholesale
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
          Nothing here is injection moulded, so there is no tool to pay for and
          no minimum to clear. Volume discounts exist because a longer run
          means fewer plate changes per unit — not because you negotiated well.
          Below is the same arithmetic our floor uses.
        </p>
      </div>

      {/* ══ Calculator ══ */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ── Inputs ── */}
        <div className="rounded-2xl border border-line bg-shell p-6 lg:p-8">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
            Price a run
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="relative h-[120px] w-[120px] overflow-hidden rounded-xl bg-canvas">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="120px"
                className="object-cover"
              />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                  Product
                </span>
                <select
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-shell px-3 text-sm font-bold text-ink outline-none focus:border-flame"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} — {getCategory(p.category)?.name}
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
                    setQty(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))
                  }
                  className="no-spin h-11 w-full rounded-lg border border-line px-3 font-display text-lg font-extrabold text-ink outline-none focus:border-flame"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {[25, 100, 500, 1000, 5000].map((n) => (
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

          {/* ── Tier ladder for this product ── */}
          <div className="mt-7 border-t border-line pt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-4">
              This product&apos;s ladder
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {calc.tiers.map((t, i) => (
                <button
                  key={t.minQty}
                  onClick={() => setQty(Math.max(t.minQty, i === 0 ? 1 : t.minQty))}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    i === calc.tierIndex
                      ? "border-flame bg-flame-lt"
                      : "border-line hover:border-ink-5"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-4">
                    {TIER_LABELS[i]}
                  </p>
                  <p className="mt-0.5 font-display text-lg font-extrabold text-ink">
                    {formatINR(t.price)}
                  </p>
                  <p className="text-[10px] text-ink-3">
                    {i === 0
                      ? "list"
                      : `−${Math.round(((calc.retail - t.price) / calc.retail) * 100)}%`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Output ── */}
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
              this drops to {formatINR(calc.next.price)} each — another{" "}
              {formatINR((calc.unit - calc.next.price) * calc.next.minQty)} off
              the run.
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
      </section>

      {/* ══ Full price list ══ */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
          Every product, every tier
        </h2>
        <p className="mt-1.5 text-sm text-ink-3">
          Per-unit rupees. These are the live figures the cart applies — there
          is no separate wholesale price list.
        </p>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-shell">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-ink-4">
                  Product
                </th>
                {TIER_LABELS.map((t) => (
                  <th
                    key={t}
                    className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-ink-4"
                  >
                    {t}
                  </th>
                ))}
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-ink-4">
                  Best saving
                </th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => {
                const row = [p.price, ...p.bulkTiers.map((t) => t.price)];
                const best = Math.round(((p.price - row[3]) / p.price) * 100);
                const isActive = p.slug === slug;
                return (
                  <tr
                    key={p.slug}
                    onClick={() => setSlug(p.slug)}
                    className={`cursor-pointer border-b border-line last:border-0 transition-colors ${
                      isActive ? "bg-flame-lt" : "hover:bg-canvas"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <span className="block font-bold text-ink">{p.name}</span>
                      <span className="block text-xs text-ink-3">
                        {getCategory(p.category)?.name}
                      </span>
                    </td>
                    {row.map((v, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 text-right font-semibold ${
                          i === 0 ? "text-ink-3" : "text-ink"
                        }`}
                      >
                        {formatINR(v)}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-bold text-leaf">
                      {best}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══ How the floor handles it ══ */}
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            n: "40",
            unit: "printers",
            body: "A 500-run of the tool caddy is 143 machine-hours. Split across the floor that is eight days of printing, not eight weeks of tooling.",
          },
          {
            n: "0",
            unit: "tooling cost",
            body: "There is no mould, so the first unit and the ten-thousandth cost the same to set up. That is the entire reason the ladder above is this shallow.",
          },
          {
            n: "±5",
            unit: "% overrun",
            body: "We print a small surplus on every run to cover QC rejects. If they pass, they ship with your order at no charge.",
          },
        ].map((c) => (
          <div key={c.unit} className="rounded-2xl border border-line bg-shell p-6">
            <p className="font-display text-4xl font-extrabold leading-none text-flame">
              {c.n}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-4">
              {c.unit}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{c.body}</p>
          </div>
        ))}
      </section>

      {/* ══ Enquiry ══ */}
      <section
        id="enquiry"
        className="mt-12 rounded-2xl border border-line bg-shell p-6 lg:p-8"
      >
        {sent ? (
          <div className="py-10 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">
              Spec received
            </p>
            <p className="mt-2 text-sm text-ink-3">
              {qty.toLocaleString("en-IN")} × {product.name} at{" "}
              {formatINR(calc.unit)} per unit. Someone will confirm stock and
              the {calc.days}-day estimate by email.
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              Send this spec to the desk
            </h2>
            <p className="mt-1.5 text-sm text-ink-3">
              We already have the product and quantity from above — this just
              tells us where to send the confirmation.
            </p>

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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input
                required
                placeholder="Work email"
                type="email"
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                required
                placeholder="Company"
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <button
                type="submit"
                className="h-12 rounded-xl bg-flame px-8 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Send
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
