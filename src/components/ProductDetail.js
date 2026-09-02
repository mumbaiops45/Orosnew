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
  Truck,
  ArrowsClockwise,
  ShieldCheck,
  Check,
  Star,
  Cube,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { formatINR, colorHex, unitPriceFor, getCategory } from "@/lib/products";

export default function ProductDetail({ product: p }) {
  const router = useRouter();
  const { add } = useCart();

  const [color, setColor] = useState(p.colors[0]);
  const [material, setMaterial] = useState(p.materials[0]);
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState("");
  const [pinResult, setPinResult] = useState(null);
  const [added, setAdded] = useState(false);
  const art = useRef(null);

  const hex = colorHex(color);
  const unit = useMemo(() => unitPriceFor(p, qty), [p, qty]);
  const tiered = unit < p.price;
  const lineTotal = unit * qty;
  const saving = Math.max(0, (p.compareAt || p.price) - unit) * qty;
  const off =
    p.compareAt > unit
      ? Math.round(((p.compareAt - unit) / p.compareAt) * 100)
      : 0;
  const category = getCategory(p.category);

  // Tier 0 is the retail price; the rest come from the catalogue.
  const tiers = useMemo(
    () => [{ minQty: 1, price: p.price }, ...p.bulkTiers],
    [p]
  );
  const tierIndex = tiers.reduce(
    (best, t, i) => (qty >= t.minQty ? i : best),
    0
  );
  const nextTier = tiers[tierIndex + 1];

  const handleAdd = () => {
    add(p.slug, {
      color,
      material,
      qty,
      origin: art.current?.getBoundingClientRect(),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuy = () => {
    add(p.slug, { color, material, qty });
    router.push("/checkout");
  };

  const checkPin = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setPinResult({ ok: false, msg: "Enter a valid 6-digit PIN code" });
      return;
    }
    // Placeholder for a real serviceability lookup.
    const days = (Number(pin[5]) % 3) + 2;
    setPinResult({
      ok: true,
      msg: `Delivery in ${days}–${days + 2} days · Free over ₹2,000`,
    });
  };

  return (
    <div className="bg-shell">
      {/* ── Breadcrumb ── */}
      <nav className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-1.5 px-5 py-3 text-xs text-ink-3 lg:px-8">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <Link href="/shop" className="hover:text-flame">
          Shop
        </Link>
        <CaretRight size={11} />
        <Link href={`/shop?category=${p.category}`} className="hover:text-flame">
          {category?.name}
        </Link>
        <CaretRight size={11} />
        <span className="font-semibold text-ink">{p.name}</span>
      </nav>

      <div className="mx-auto max-w-[1500px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,545px)] lg:items-start">
        {/* ══════════ LEFT — the stage ══════════ */}
        <Stage
          product={p}
          color={color}
          hex={hex}
          material={material}
          off={off}
          artRef={art}
        />

        {/* ══════════ RIGHT — the configurator ══════════ */}
        <div className="px-5 pb-16 pt-8 lg:px-10 lg:pb-24 lg:pt-10">
          {/* ── Identity ── */}
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-flame">
            {category?.name}
          </p>
          <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink">
            {p.name}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-2">{p.blurb}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 rounded bg-leaf px-2 py-1 text-xs font-bold text-white">
              {p.rating.toFixed(1)}
              <Star size={10} weight="fill" />
            </span>
            <span className="text-sm font-semibold text-ink-3">
              {p.reviews.toLocaleString("en-IN")} ratings
            </span>
            <span className="h-3.5 w-px bg-line" />
            <span className="text-sm font-semibold text-leaf">
              {p.stock} in stock
            </span>
          </div>

          {/* ── Price ── */}
          <div className="mt-7 flex flex-wrap items-baseline gap-3 border-t border-line pt-7">
            <span className="font-display text-[2.75rem] font-extrabold leading-none text-ink">
              {formatINR(unit)}
            </span>
            {off > 0 && (
              <>
                <span className="text-lg text-ink-4 line-through">
                  {formatINR(p.compareAt)}
                </span>
                <span className="rounded bg-leaf-lt px-2 py-1 text-sm font-bold text-leaf">
                  {off}% off
                </span>
              </>
            )}
            <span className="w-full text-xs text-ink-3">
              per unit · inclusive of all taxes
            </span>
          </div>

          {/* ── 01 Colour ── */}
          <Section n="01" title="Choose a colour" value={color}>
            <div className="flex flex-wrap gap-2.5">
              {p.colors.map((c) => {
                const on = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-pressed={on}
                    className={`group flex items-center gap-2.5 rounded-full border-2 py-1.5 pl-1.5 pr-4 transition-all ${
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-line text-ink-2 hover:border-ink-5"
                    }`}
                  >
                    <span
                      className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: colorHex(c) }}
                    />
                    <span className="text-sm font-bold">{c}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── 02 Material ── */}
          <Section n="02" title="Pick a material" value={material}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {p.materials.map((m) => {
                const on = material === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMaterial(m)}
                    aria-pressed={on}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                      on
                        ? "border-flame bg-flame-lt"
                        : "border-line hover:border-ink-5"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                        on ? "border-flame bg-flame" : "border-ink-5"
                      }`}
                    >
                      {on && <Check size={11} className="text-white" weight="bold" />}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink">{m}</span>
                      <span className="block text-xs text-ink-3">
                        {MATERIAL_NOTE[m] || "Standard finish"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── 03 Quantity + tier meter ── */}
          <Section n="03" title="How many?" value={`${qty} unit${qty > 1 ? "s" : ""}`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-xl border-2 border-line">
                <button
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  aria-label="Decrease quantity"
                  className="grid h-12 w-12 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                >
                  <Minus size={16} weight="bold" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))
                  }
                  aria-label="Quantity"
                  className="no-spin h-12 w-20 border-x-2 border-line text-center font-display text-lg font-extrabold text-ink outline-none"
                />
                <button
                  onClick={() => setQty((n) => Math.min(9999, n + 1))}
                  aria-label="Increase quantity"
                  className="grid h-12 w-12 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                >
                  <Plus size={16} weight="bold" />
                </button>
              </div>

              <div className="flex gap-1.5">
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
            </div>

            <TierMeter
              tiers={tiers}
              tierIndex={tierIndex}
              nextTier={nextTier}
              qty={qty}
              unit={unit}
            />
          </Section>

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
              {saving > 0 && (
                <p className="rounded-lg bg-leaf/20 px-3 py-2 text-sm font-bold text-mint">
                  Save {formatINR(saving)}
                </p>
              )}
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

          {/* ── Delivery ── */}
          <div className="mt-6 rounded-2xl border border-line p-5">
            <div className="flex items-center gap-2">
              <Truck size={17} className="text-ink-2" />
              <p className="text-sm font-bold text-ink">Check delivery</p>
            </div>
            <form onSubmit={checkPin} className="mt-3 flex gap-2">
              <input
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinResult(null);
                }}
                placeholder="6-digit PIN code"
                inputMode="numeric"
                aria-label="PIN code"
                className="h-11 flex-1 rounded-lg border border-line px-3.5 text-sm outline-none focus:border-flame"
              />
              <button
                type="submit"
                className="rounded-lg border-2 border-flame px-5 text-sm font-bold text-flame transition-colors hover:bg-flame-lt"
              >
                Check
              </button>
            </form>
            {pinResult && (
              <p
                className={`mt-2.5 text-xs font-semibold ${
                  pinResult.ok ? "text-leaf" : "text-flame"
                }`}
              >
                {pinResult.msg}
              </p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
              {[
                { icon: Lightning, label: "48h dispatch" },
                { icon: ArrowsClockwise, label: "14-day returns" },
                { icon: ShieldCheck, label: "Secure payment" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                  <Icon size={17} className="text-ink-3" />
                  <span className="text-[11px] font-semibold text-ink-3">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── About ── */}
          <div className="mt-12 border-t border-line pt-9">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              About this object
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              {p.description}
            </p>
          </div>

          {/* ── Specs ── */}
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
              <div className="bg-shell px-4 py-3.5">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-4">
                  Materials
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">
                  {p.materials.join(", ")}
                </dd>
              </div>
              <div className="bg-shell px-4 py-3.5">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-4">
                  Colours
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">
                  {p.colors.join(", ")}
                </dd>
              </div>
            </dl>
          </div>

          {/* ── Bulk ── */}
          <div className="mt-10 rounded-2xl bg-canvas p-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              Buying for a business?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Because nothing here is tooled, the price drops with volume and
              there is no mould bill up front. Tiers apply automatically in the
              cart — no code, no negotiation.
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
                    {i === 0 ? "1 – 24" : `${t.minQty}+`}
                  </p>
                  <p className="mt-0.5 font-display text-base font-extrabold text-ink">
                    {formatINR(t.price)}
                  </p>
                </button>
              ))}
            </div>
            <Link
              href="/bulk"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-flame hover:underline"
            >
              Need more than 5,000? Talk to the wholesale desk
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LEFT STAGE — sticky, re-tints to the chosen colour
══════════════════════════════════════════════════════ */
function Stage({ product: p, color, hex, material, off, artRef }) {
  const scope = useRef(null);
  const ring = useRef(null);

  // The photograph cannot recolour, so the selection is acknowledged by the
  // ring and caption instead — a fake tint over real product photography
  // would misrepresent what actually ships.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        ring.current,
        { borderColor: `${hex}00`, scale: 0.995 },
        { borderColor: hex, scale: 1, duration: 0.55, ease: "expo.out" }
      );
    },
    { dependencies: [hex], scope }
  );

  return (
    <div className="lg:sticky lg:top-[99px] lg:h-[calc(100vh-115px)] lg:pl-8">
      <div
        ref={scope}
        className="relative flex h-[62vh] flex-col overflow-hidden rounded-3xl bg-canvas lg:h-full"
      >
        <div ref={artRef} className="absolute inset-0">
          <ProductImage
            src={p.image}
            alt={p.name}
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
            overlay
          />
        </div>

        {/* Selected-colour ring */}
        <div
          ref={ring}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl border-[3px]"
          style={{ borderColor: hex }}
        />

        {/* Scrim so the overlaid chips stay legible on any photograph */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/45 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/55 to-transparent"
        />

        {/* Badges */}
        <div className="relative flex items-start justify-between p-5">
          <div className="flex flex-col items-start gap-2">
            {off > 0 && (
              <span className="rounded-full bg-leaf px-3 py-1.5 text-xs font-extrabold text-white">
                {off}% off
              </span>
            )}
            {p.badge && (
              <span className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                {p.badge}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-ink backdrop-blur-sm">
            <Cube size={13} weight="bold" />
            Printed to order
          </span>
        </div>

        {/* Caption */}
        <div className="relative mt-auto flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-ink backdrop-blur-sm">
            Shown in {p.shownIn} · yours in {color} {material}
          </p>
          <p className="text-[11px] font-semibold text-white/85">
            {p.specs.Dimensions || ""}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TIER METER — the page's centrepiece for a bulk business
══════════════════════════════════════════════════════ */
function TierMeter({ tiers, tierIndex, nextTier, qty, unit }) {
  const fill = useRef(null);

  // Each tier owns an equal slice of the track; within a slice the bar
  // fills by progress toward the next threshold.
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
              {i === 0 ? "1" : t.minQty}
              {i === tiers.length - 1 ? "+" : ""}
            </p>
            <p className="text-[10px] font-semibold">{formatINR(t.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Numbered step wrapper for the configurator ─────────── */
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

const MATERIAL_NOTE = {
  "PLA+": "Matte, rigid, everyday",
  "Recycled PLA": "Reclaimed from our waste",
  PETG: "Translucent, food-safe",
  ABS: "Heat resistant, tough",
  "Carbon-fill nylon": "Stiffest, load bearing",
  Resin: "Finest detail, smooth",
};
