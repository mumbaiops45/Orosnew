"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CaretDown, CaretRight, X, Check } from "@phosphor-icons/react";
import ProductCard from "@/components/ProductCard";
import {
  PRODUCTS,
  CATEGORIES,
  MATERIALS,
  COLORS,
  getCategory,
  discountPct,
} from "@/lib/products";

const PRICE_BUCKETS = [
  { id: "u1500", label: "Under ₹1,500", min: 0, max: 1500 },
  { id: "1500-3000", label: "₹1,500 – ₹3,000", min: 1500, max: 3000 },
  { id: "3000-5000", label: "₹3,000 – ₹5,000", min: 3000, max: 5000 },
  { id: "o5000", label: "Over ₹5,000", min: 5000, max: Infinity },
];

const RATINGS = [4.5, 4, 3.5];

const SORTS = [
  { id: "popularity", label: "Popularity" },
  { id: "price-asc", label: "Price — low to high" },
  { id: "price-desc", label: "Price — high to low" },
  { id: "discount", label: "Discount" },
  { id: "rating", label: "Customer rating" },
];

const toggle = (list, v) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export default function ShopClient() {
  const params = useSearchParams();
  const q = params.get("q") || "";

  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [colors, setColors] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("popularity");
  const [openFilter, setOpenFilter] = useState(null);
  const bar = useRef(null);

  // The header search and the category rail both navigate here with query
  // params, so mirror those into filter state whenever the URL changes.
  useEffect(() => {
    const cat = params.get("category");
    setCategories(cat ? [cat] : []);
    const col = params.get("color");
    setColors(col && COLORS.some((c) => c.name === col) ? [col] : []);
    const s = params.get("sort");
    if (s && SORTS.some((x) => x.id === s)) setSort(s);
  }, [params]);

  // One popover at a time, closed by an outside click or Escape.
  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e) => {
      if (!bar.current?.contains(e.target)) setOpenFilter(null);
    };
    const onKey = (e) => e.key === "Escape" && setOpenFilter(null);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openFilter]);

  const results = useMemo(() => {
    const list = PRODUCTS.filter((p) => {
      if (categories.length && !categories.includes(p.category)) return false;
      if (materials.length && !p.materials.some((m) => materials.includes(m)))
        return false;
      if (colors.length && !p.colors.some((c) => colors.includes(c))) return false;
      if (minRating && p.rating < minRating) return false;
      if (buckets.length) {
        const hit = buckets.some((id) => {
          const b = PRICE_BUCKETS.find((x) => x.id === id);
          return b && p.price >= b.min && p.price < b.max;
        });
        if (!hit) return false;
      }
      if (q) {
        const hay =
          `${p.name} ${p.blurb} ${p.category} ${p.materials.join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });

    const by = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      discount: (a, b) => discountPct(b) - discountPct(a),
      rating: (a, b) => b.rating - a.rating,
      popularity: (a, b) => b.reviews - a.reviews,
    };
    return [...list].sort(by[sort] || by.popularity);
  }, [categories, materials, colors, buckets, minRating, sort, q]);

  /* Every applied filter as one removable chip list. */
  const chips = [
    ...buckets.map((id) => ({
      key: `b-${id}`,
      label: PRICE_BUCKETS.find((b) => b.id === id)?.label,
      clear: () => setBuckets((s) => s.filter((x) => x !== id)),
    })),
    ...materials.map((m) => ({
      key: `m-${m}`,
      label: m,
      clear: () => setMaterials((s) => s.filter((x) => x !== m)),
    })),
    ...colors.map((c) => ({
      key: `c-${c}`,
      label: c,
      clear: () => setColors((s) => s.filter((x) => x !== c)),
    })),
    ...(minRating
      ? [
          {
            key: "r",
            label: `${minRating} ★ & above`,
            clear: () => setMinRating(0),
          },
        ]
      : []),
  ];

  const clearAll = () => {
    setMaterials([]);
    setColors([]);
    setBuckets([]);
    setMinRating(0);
  };

  const activeCategory =
    categories.length === 1 ? getCategory(categories[0]) : null;
  const heading = q ? `“${q}”` : activeCategory?.name || "All products";
  const tagline = q
    ? `${results.length} match${results.length === 1 ? "" : "es"} across the catalogue`
    : activeCategory?.tagline || "Every object we print, in one place";

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 lg:px-8">
      {/* ══ Page head ══ */}
      <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <span className="font-semibold text-ink">{heading}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-extrabold leading-none tracking-[-0.03em] text-ink">
            {heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-3">{tagline}</p>
        </div>
        <p className="text-sm font-semibold text-ink-3">
          <span className="font-display text-2xl font-extrabold text-ink">
            {results.length}
          </span>{" "}
          of {PRODUCTS.length} products
        </p>
      </div>

      {/* ══ Category pills ══ */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-5 lg:mx-0 lg:px-0">
        <Pill active={categories.length === 0} onClick={() => setCategories([])}>
          All
        </Pill>
        {CATEGORIES.map((c) => (
          <Pill
            key={c.slug}
            active={categories.includes(c.slug)}
            onClick={() =>
              setCategories((s) => (s.includes(c.slug) ? [] : [c.slug]))
            }
          >
            {c.name}
          </Pill>
        ))}
      </div>

      {/* ══ Filter bar — sits under the collapsed header ══ */}
      <div
        ref={bar}
        className="sticky top-[99px] z-30 -mx-4 flex flex-wrap items-center gap-2 border-y border-line bg-canvas px-4 py-3 lg:mx-0 lg:rounded-xl lg:border"
      >
        <span className="hidden text-xs font-bold uppercase tracking-[0.14em] text-ink-4 lg:block">
          Filter
        </span>

        <FilterButton
          label="Price"
          count={buckets.length}
          open={openFilter === "price"}
          onToggle={() => setOpenFilter((o) => (o === "price" ? null : "price"))}
        >
          {PRICE_BUCKETS.map((b) => (
            <Option
              key={b.id}
              label={b.label}
              checked={buckets.includes(b.id)}
              onChange={() => setBuckets((s) => toggle(s, b.id))}
            />
          ))}
        </FilterButton>

        <FilterButton
          label="Material"
          count={materials.length}
          open={openFilter === "material"}
          onToggle={() =>
            setOpenFilter((o) => (o === "material" ? null : "material"))
          }
        >
          {MATERIALS.map((m) => (
            <Option
              key={m}
              label={m}
              checked={materials.includes(m)}
              onChange={() => setMaterials((s) => toggle(s, m))}
            />
          ))}
        </FilterButton>

        <FilterButton
          label="Colour"
          count={colors.length}
          open={openFilter === "colour"}
          onToggle={() => setOpenFilter((o) => (o === "colour" ? null : "colour"))}
          wide
        >
          <div className="grid grid-cols-2 gap-1">
            {COLORS.map((c) => {
              const on = colors.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => setColors((s) => toggle(s, c.name))}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    on ? "bg-flame-lt text-flame" : "text-ink-2 hover:bg-canvas"
                  }`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="font-semibold">{c.name}</span>
                </button>
              );
            })}
          </div>
        </FilterButton>

        <FilterButton
          label="Rating"
          count={minRating ? 1 : 0}
          open={openFilter === "rating"}
          onToggle={() => setOpenFilter((o) => (o === "rating" ? null : "rating"))}
        >
          {RATINGS.map((r) => (
            <Option
              key={r}
              label={`${r} ★ & above`}
              checked={minRating === r}
              onChange={() => setMinRating((cur) => (cur === r ? 0 : r))}
            />
          ))}
        </FilterButton>

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-3">
          <span className="hidden sm:block">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-line bg-shell px-3 py-2 text-xs font-bold text-ink outline-none focus:border-flame"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ══ Applied filters ══ */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.clear}
              className="group flex items-center gap-1.5 rounded-full border border-line bg-shell py-1.5 pl-3.5 pr-2.5 text-xs font-bold text-ink-2 transition-colors hover:border-flame hover:text-flame"
            >
              {c.label}
              <X
                size={12}
                weight="bold"
                className="text-ink-4 group-hover:text-flame"
              />
            </button>
          ))}
          <button
            onClick={clearAll}
            className="px-2 text-xs font-bold text-flame hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ══ Grid ══ */}
      {results.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-line bg-shell px-6 py-24 text-center">
          <p className="font-display text-xl font-extrabold text-ink">
            Nothing matched those filters
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-3">
            Try widening the price range, or clearing a filter or two.
          </p>
          <button
            onClick={clearAll}
            className="mt-6 rounded-lg bg-flame px-6 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-flame-dk"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {results.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────── */

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-shell text-ink-2 hover:border-ink-5 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FilterButton({ label, count, open, onToggle, wide, children }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors ${
          count > 0
            ? "border-flame bg-flame-lt text-flame"
            : open
              ? "border-ink-5 bg-shell text-ink"
              : "border-line bg-shell text-ink-2 hover:border-ink-5"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-flame px-1 text-[10px] text-white">
            {count}
          </span>
        )}
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-40 mt-2 rounded-xl border border-line bg-shell p-2 shadow-[0_18px_40px_-16px_rgba(43,27,77,0.4)] ${
            wide ? "w-[19rem]" : "w-56"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Option({ label, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
        checked ? "bg-flame-lt text-flame" : "text-ink-2 hover:bg-canvas"
      }`}
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${
          checked ? "border-flame bg-flame" : "border-ink-5"
        }`}
      >
        {checked && <Check size={10} weight="bold" className="text-white" />}
      </span>
      {label}
    </button>
  );
}
