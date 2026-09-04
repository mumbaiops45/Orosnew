"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretRight,
  Minus,
  Plus,
  ShoppingCart,
  Lightning,
  ArrowsClockwise,
  ShieldCheck,
  Check,
  Cube,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import ProductImage from "@/components/ProductImage";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatINR, colorHex, unitPriceFor } from "@/lib/format";

export default function ProductDetail({ product: p }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const token = useAuthStore((s) => s.token);

  // one selected value per option, keyed by option name. Nothing is
  // pre-selected — if a product has variants the customer must pick each
  // one so the cart line records the exact variant they wanted.
  const [selected, setSelected] = useState({});

  const [qty, setQty] = useState(p.minQty || 1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [optError, setOptError] = useState("");
  const art = useRef(null);

  const images = p.images?.length ? p.images : [p.image];
  const unit = useMemo(() => unitPriceFor(p, qty), [p, qty]);
  const tiered = unit < p.price;
  const lineTotal = unit * qty;
  const off =
    p.compareAt && p.compareAt > unit
      ? Math.round(((p.compareAt - unit) / p.compareAt) * 100)
      : 0;

  const tiers = useMemo(
    () => [{ minQty: p.minQty || 1, price: p.price }, ...(p.bulkTiers || [])],
    [p]
  );
  const tierIndex = tiers.reduce(
    (best, t, i) => (qty >= t.minQty ? i : best),
    0
  );
  const nextTier = tiers[tierIndex + 1];

  const selectedOptions = () =>
    (p.options || []).map((o) => ({ name: o.name, value: selected[o.name] }));

  // every option must be chosen — a variant product can't go in the cart
  // until we know which variant it is
  const missingOption = () =>
    (p.options || []).find((o) => !selected[o.name]);

  const doAdd = (thenCheckout = false) => {
    if (!token) {
      setOptError("");
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return false;
    }
    const missing = missingOption();
    if (missing) {
      setOptError(`Please select ${missing.name} before adding to cart`);
      return false;
    }
    setOptError("");
    add(p, {
      options: selectedOptions(),
      qty,
      origin: thenCheckout
        ? null
        : art.current?.getBoundingClientRect(),
    });
    return true;
  };

  const handleAdd = () => {
    if (doAdd()) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };

  const handleBuy = () => {
    if (doAdd(true)) router.push("/checkout");
  };

  return (
    <div className="bg-shell">
      <nav className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-1.5 px-5 py-3 text-xs text-ink-3 lg:px-8">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <Link href="/shop" className="hover:text-flame">
          Shop
        </Link>
        {p.categoryName && (
          <>
            <CaretRight size={11} />
            <Link
              href={`/shop?category=${p.category}`}
              className="hover:text-flame"
            >
              {p.categoryName}
            </Link>
          </>
        )}
        <CaretRight size={11} />
        <span className="font-semibold text-ink">{p.name}</span>
      </nav>

      <div className="mx-auto max-w-[1500px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,545px)] lg:items-start">
        {/* ══ LEFT — gallery ══ */}
        <div className="lg:sticky lg:top-[99px] lg:pl-8">
          <div className="flex gap-3 px-5 py-8 lg:px-0">
            {/* thumbnails, left of the main image */}
            {images.length > 1 && (
              <div className="flex flex-col gap-2">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-canvas transition-colors ${
                      i === activeImage
                        ? "border-flame"
                        : "border-line hover:border-ink-5"
                    }`}
                  >
                    <ProductImage src={src} alt="" sizes="64px" overlay />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1">
              <div
                ref={art}
                className="relative aspect-square w-full overflow-hidden rounded-3xl bg-canvas"
              >
                <ProductImage
                  src={images[activeImage] || p.image}
                  alt={p.name}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  priority
                  overlay
                />
                <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
                  {off > 0 && (
                    <span className="rounded-full bg-leaf px-3 py-1.5 text-xs font-extrabold text-white">
                      {off}% off
                    </span>
                  )}
                  {p.isCustomisable && (
                    <span className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      Customisable
                    </span>
                  )}
                </div>
                <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-ink backdrop-blur-sm">
                  <Cube size={13} weight="bold" />
                  Printed to order
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — configurator ══ */}
        <div className="px-5 pb-16 pt-2 lg:px-10 lg:pb-24 lg:pt-10">
          {p.categoryName && (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-flame">
              {p.categoryName}
            </p>
          )}
          <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink">
            {p.name}
          </h1>
          {p.blurb && (
            <p className="mt-3 text-base leading-relaxed text-ink-2">{p.blurb}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-ink-3">
            {p.sku && <span>SKU {p.sku}</span>}
            {p.leadTimeDays != null && (
              <>
                <span className="h-3.5 w-px bg-line" />
                <span className="text-leaf">
                  {p.leadTimeDays === 0
                    ? "Dispatches in 48h"
                    : `Made in ${p.leadTimeDays} days`}
                </span>
              </>
            )}
          </div>

          {/* ── Price ── */}
          <div className="mt-7 flex flex-wrap items-baseline gap-3 border-t border-line pt-7">
            <span className="font-display text-[2.75rem] font-extrabold leading-none text-ink">
              {formatINR(unit)}
            </span>
            {off > 0 && (
              <span className="text-lg text-ink-4 line-through">
                {formatINR(p.compareAt)}
              </span>
            )}
            <span className="w-full text-xs text-ink-3">
              per unit
              {p.taxRate ? ` · +${p.taxRate}% tax` : " · inclusive of taxes"}
            </span>
          </div>

          {/* ── Options — fully dynamic from the backend ── */}
          {(p.options || []).map((opt, i) => (
            <Section
              key={opt.id || opt.name}
              n={String(i + 1).padStart(2, "0")}
              title={
                <>
                  {opt.name}
                  <span className="ml-1.5 text-xs font-bold text-flame">*</span>
                </>
              }
              value={selected[opt.name] || "Choose one"}
            >
              <div className="flex flex-wrap gap-2.5">
                {(opt.values || []).map((v) => {
                  const on = selected[opt.name] === v.value;
                  return (
                    <button
                      key={v.id || v.value}
                      onClick={() => {
                        setSelected((s) => ({ ...s, [opt.name]: v.value }));
                        setOptError("");
                      }}
                      aria-pressed={on}
                      className={`group flex items-center gap-2.5 rounded-full border-2 py-1.5 pr-4 transition-all ${
                        opt.type === "COLOR" ? "pl-1.5" : "pl-4"
                      } ${
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-line text-ink-2 hover:border-ink-5"
                      }`}
                    >
                      {opt.type === "COLOR" && (
                        <span
                          className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/10"
                          style={{ backgroundColor: colorHex(v.value) }}
                        />
                      )}
                      <span className="text-sm font-bold">{v.value}</span>
                      {v.priceDelta > 0 && (
                        <span className="text-xs font-semibold opacity-70">
                          +{formatINR(v.priceDelta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>
          ))}

          {/* ── Quantity + tiers ── */}
          <Section
            n={String((p.options?.length || 0) + 1).padStart(2, "0")}
            title="How many?"
            value={`${qty} unit${qty > 1 ? "s" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-xl border-2 border-line">
                <button
                  onClick={() => setQty((n) => Math.max(p.minQty || 1, n - 1))}
                  aria-label="Decrease quantity"
                  className="grid h-12 w-12 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                >
                  <Minus size={16} weight="bold" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.max(
                        p.minQty || 1,
                        Math.min(99999, Number(e.target.value) || 1)
                      )
                    )
                  }
                  aria-label="Quantity"
                  className="no-spin h-12 w-20 border-x-2 border-line text-center font-display text-lg font-extrabold text-ink outline-none"
                />
                <button
                  onClick={() => setQty((n) => Math.min(99999, n + 1))}
                  aria-label="Increase quantity"
                  className="grid h-12 w-12 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                >
                  <Plus size={16} weight="bold" />
                </button>
              </div>

              {tiers.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {tiers.map((t) => (
                    <button
                      key={t.minQty}
                      onClick={() => setQty(t.minQty)}
                      className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 transition-colors hover:border-flame hover:text-flame"
                    >
                      {t.minQty}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {tiers.length > 1 && (
              <TierMeter
                tiers={tiers}
                tierIndex={tierIndex}
                nextTier={nextTier}
                qty={qty}
                unit={unit}
              />
            )}
          </Section>

          {optError && (
            <p className="mt-4 rounded-lg bg-flame-lt px-3 py-2 text-sm font-bold text-flame">
              {optError}
            </p>
          )}

          {/* ── Total + actions ── */}
          <div className="mt-9 rounded-2xl border-2 border-ink bg-ink p-5 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Order total
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">
                  {formatINR(lineTotal)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {qty} × {formatINR(unit)}
                  {tiered && (
                    <span className="ml-2 font-bold text-gold">bulk rate</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={handleAdd}
                className="flex items-center justify-center gap-2 rounded-xl bg-gold py-4 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
              >
                {added ? (
                  <>
                    <Check size={17} weight="bold" />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart size={17} />
                    Add to cart
                  </>
                )}
              </button>
              <button
                onClick={handleBuy}
                className="flex items-center justify-center gap-2 rounded-xl bg-flame py-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                <Lightning size={17} weight="fill" />
                Buy now
              </button>
            </div>
          </div>

          {/* ── Trust badges ── */}
          <div className="mt-6 rounded-2xl border border-line p-5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Lightning, label: "48h dispatch" },
                { icon: ArrowsClockwise, label: "14-day returns" },
                { icon: ShieldCheck, label: "Secure payment" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <Icon size={17} className="text-ink-3" />
                  <span className="text-[11px] font-semibold text-ink-3">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── About ── */}
          {p.description && (
            <div className="mt-12 border-t border-line pt-9">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                About this object
              </h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
                {p.description}
              </p>
            </div>
          )}

          {/* ── Specs ── */}
          {Object.keys(p.specs || {}).length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                Print specification
              </h2>
              <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="bg-shell px-4 py-3.5">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-4">
                      {k}
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* ── Bulk ── */}
          {(p.bulkTiers || []).length > 0 && (
            <div className="mt-10 rounded-2xl bg-canvas p-6">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                Buying for a business?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                The price drops with volume — tiers apply automatically in the
                cart, no code needed.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tiers.map((t, i) => (
                  <button
                    key={t.minQty}
                    onClick={() => setQty(t.minQty)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      i === tierIndex
                        ? "border-flame bg-flame-lt"
                        : "border-transparent bg-shell hover:border-ink-5"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-4">
                      {i === tiers.length - 1
                        ? `${t.minQty}+`
                        : `${t.minQty} – ${tiers[i + 1].minQty - 1}`}
                    </p>
                    <p className="mt-0.5 font-display text-base font-extrabold text-ink">
                      {formatINR(t.price)}
                    </p>
                  </button>
                ))}
              </div>
              <Link
                href="/bulk?custom"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-flame hover:underline"
              >
                Need a custom quote? Talk to the wholesale desk
                <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TierMeter({ tiers, tierIndex, nextTier, qty, unit }) {
  const fill = useRef(null);

  const pct = useMemo(() => {
    const slice = 100 / tiers.length;
    const base = tierIndex * slice;
    if (!nextTier) return 100;
    const from = tiers[tierIndex].minQty;
    const span = nextTier.minQty - from;
    return base + Math.min(1, (qty - from) / span) * slice;
  }, [tiers, tierIndex, nextTier, qty]);

  useGSAP(
    () => {
      gsap.to(fill.current, {
        width: `${pct}%`,
        duration: prefersReducedMotion() ? 0 : 0.5,
        ease: "expo.out",
      });
    },
    { dependencies: [pct] }
  );

  return (
    <div className="mt-6 rounded-2xl border border-line p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink">
          {tierIndex === 0 ? "Retail price" : `Bulk tier ${tierIndex}`} —{" "}
          <span className="text-flame">{formatINR(unit)}/unit</span>
        </p>
        {nextTier ? (
          <p className="text-xs font-semibold text-ink-3">
            {nextTier.minQty - qty} more → {formatINR(nextTier.price)}
          </p>
        ) : (
          <p className="text-xs font-bold text-leaf">Best rate unlocked</p>
        )}
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-canvas">
        <div
          ref={fill}
          className="h-full rounded-full bg-gradient-to-r from-gold to-flame"
          style={{ width: "0%" }}
        />
      </div>

      <div className="mt-3 flex justify-between">
        {tiers.map((t, i) => (
          <div
            key={t.minQty}
            className={`text-center ${
              i === tierIndex ? "text-flame" : "text-ink-4"
            }`}
          >
            <p className="text-[11px] font-extrabold">
              {t.minQty}
              {i === tiers.length - 1 ? "+" : ""}
            </p>
            <p className="text-[10px] font-semibold">{formatINR(t.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ n, title, value, children }) {
  return (
    <section className="mt-9 border-t border-line pt-7">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-display text-xs font-extrabold text-flame">{n}</span>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          {title}
        </h2>
        {value && (
          <span className="ml-auto truncate text-sm font-semibold text-ink-3">
            {value}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
