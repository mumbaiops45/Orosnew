"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CaretDown, CaretRight, X, Check } from "@phosphor-icons/react";
import ProductCard from "@/components/ProductCard";
import PriceRange from "@/components/PriceRange";
import { discountPct, formatINR } from "@/lib/format";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/catalog";

const SORTS = [
  { id: "popularity", label: "Featured" },
  { id: "price-asc", label: "Price — low to high" },
  { id: "price-desc", label: "Price — high to low" },
  { id: "discount", label: "Discount" },
  { id: "new", label: "Newest" },
];

const apiSort = (s) =>
  s === "price-asc" ? "price_asc" : s === "price-desc" ? "price_desc" : undefined;

export default function ShopClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = params.get("q") || "";
  const categorySlug = params.get("category") || "";
  const subcategorySlug = params.get("subcategory") || "";

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bounds, setBounds] = useState({ min: 0, max: 10000 });
  const [price, setPrice] = useState([0, 10000]);
  const [applied, setApplied] = useState([0, 10000]);
  const [sort, setSort] = useState("popularity");
  const [openFilter, setOpenFilter] = useState(null);
  const bar = useRef(null);

  const priceTouched =
    price[0] > bounds.min || price[1] < bounds.max;

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) || null,
    [categories, categorySlug]
  );
  const activeSubcategory = useMemo(
    () => subcategories.find((s) => s.slug === subcategorySlug) || null,
    [subcategories, subcategorySlug]
  );

  // categories once
  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  // price bounds — the catalogue's real ceiling, once
  useEffect(() => {
    fetchProducts({ limit: 200, sort: "price_desc" }).then(({ products }) => {
      const maxP = products.reduce((m, p) => Math.max(m, p.price || 0), 0);
      const ceil = Math.max(1000, Math.ceil(maxP / 500) * 500);
      setBounds({ min: 0, max: ceil });
      setPrice(([lo, hi]) => [lo, hi === 10000 ? ceil : Math.min(hi, ceil)]);
      setApplied(([lo, hi]) => [lo, hi === 10000 ? ceil : Math.min(hi, ceil)]);
    });
  }, []);

  // debounce the slider before it hits the API
  useEffect(() => {
    const t = setTimeout(() => setApplied(price), 350);
    return () => clearTimeout(t);
  }, [price]);

  // subcategories follow the active category
  useEffect(() => {
    if (!activeCategory) {
      setSubcategories([]);
      return;
    }
    fetchSubcategories(activeCategory.id).then(setSubcategories);
  }, [activeCategory]);

  // products follow category / subcategory / search
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const apiParams = { limit: 100, sort: apiSort(sort) };
    if (activeCategory) apiParams.category = activeCategory.id;
    if (activeSubcategory) apiParams.subcategory = activeSubcategory.id;
    if (q) apiParams.search = q;
    if (applied[0] > bounds.min) apiParams.minPrice = applied[0];
    if (applied[1] < bounds.max) apiParams.maxPrice = applied[1];
    fetchProducts(apiParams).then(({ products }) => {
      if (alive) {
        setProducts(products);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [activeCategory, activeSubcategory, q, applied, bounds, sort]);

  useEffect(() => {
    const s = params.get("sort");
    if (s && SORTS.some((x) => x.id === s)) setSort(s);
  }, [params]);

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

  const setQuery = (next) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(sp.toString() ? `${pathname}?${sp}` : pathname);
  };

  const results = useMemo(() => {
    // price + category are filtered server-side; this only re-orders
    const by = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      discount: (a, b) => discountPct(b) - discountPct(a),
      new: (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
      popularity: (a, b) => (b.totalSold || 0) - (a.totalSold || 0),
    };
    return [...products].sort(by[sort] || by.popularity);
  }, [products, sort]);

  const chips = priceTouched
    ? [
        {
          key: "price",
          label: `${formatINR(price[0])} – ${
            price[1] >= bounds.max ? `${formatINR(bounds.max)}+` : formatINR(price[1])
          }`,
          clear: () => setPrice([bounds.min, bounds.max]),
        },
      ]
    : [];

  const heading = q
    ? `“${q}”`
    : activeSubcategory?.name || activeCategory?.name || "All products";
  const tagline = q
    ? `${results.length} match${results.length === 1 ? "" : "es"} across the catalogue`
    : activeCategory?.tagline ||
      activeCategory?.description ||
      "Every object we print, in one place";

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 lg:px-8">
      <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <Link href="/shop" className="hover:text-flame">
          Shop
        </Link>
        {activeCategory && (
          <>
            <CaretRight size={11} />
            <Link
              href={`/shop?category=${activeCategory.slug}`}
              className="hover:text-flame"
            >
              {activeCategory.name}
            </Link>
          </>
        )}
        {activeSubcategory && (
          <>
            <CaretRight size={11} />
            <span className="font-semibold text-ink">
              {activeSubcategory.name}
            </span>
          </>
        )}
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
          {results.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* ══ Category pills ══ */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-5 lg:mx-0 lg:px-0">
        <Pill
          active={!categorySlug}
          onClick={() => setQuery({ category: "", subcategory: "" })}
        >
          All
        </Pill>
        {categories.map((c) => (
          <Pill
            key={c.slug}
            active={categorySlug === c.slug}
            onClick={() =>
              setQuery({
                category: categorySlug === c.slug ? "" : c.slug,
                subcategory: "",
              })
            }
          >
            {c.name}
          </Pill>
        ))}
      </div>

      {/* ══ Subcategory pills (only under an active category) ══ */}
      {activeCategory && subcategories.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
          <Pill
            small
            active={!subcategorySlug}
            onClick={() => setQuery({ subcategory: "" })}
          >
            All {activeCategory.name}
          </Pill>
          {subcategories.map((s) => (
            <Pill
              key={s.slug}
              small
              active={subcategorySlug === s.slug}
              onClick={() =>
                setQuery({
                  subcategory: subcategorySlug === s.slug ? "" : s.slug,
                })
              }
            >
              {s.name}
            </Pill>
          ))}
        </div>
      )}

      {/* ══ Filter bar ══ */}
      <div
        ref={bar}
        className="sticky top-[99px] z-30 -mx-4 flex flex-wrap items-center gap-2 border-y border-line bg-canvas px-4 py-3 lg:mx-0 lg:rounded-xl lg:border"
      >
        <span className="hidden text-xs font-bold uppercase tracking-[0.14em] text-ink-4 lg:block">
          Filter
        </span>

        <FilterButton
          label={
            priceTouched
              ? `${formatINR(price[0])} – ${
                  price[1] >= bounds.max ? `${formatINR(bounds.max)}+` : formatINR(price[1])
                }`
              : "Price"
          }
          count={priceTouched ? 1 : 0}
          open={openFilter === "price"}
          onToggle={() => setOpenFilter((o) => (o === "price" ? null : "price"))}
          wide
        >
          <PriceRange
            min={bounds.min}
            max={bounds.max}
            step={50}
            value={price}
            onChange={setPrice}
          />
        </FilterButton>

        {activeCategory && subcategories.length > 0 && (
          <FilterButton
            label={activeSubcategory ? activeSubcategory.name : "Subcategory"}
            count={activeSubcategory ? 1 : 0}
            open={openFilter === "subcategory"}
            onToggle={() =>
              setOpenFilter((o) =>
                o === "subcategory" ? null : "subcategory"
              )
            }
            align="right"
          >
            <Option
              label={`All ${activeCategory.name}`}
              checked={!subcategorySlug}
              onChange={() => {
                setQuery({ subcategory: "" });
                setOpenFilter(null);
              }}
            />
            {subcategories.map((s) => (
              <Option
                key={s.slug}
                label={s.name}
                checked={subcategorySlug === s.slug}
                onChange={() => {
                  setQuery({
                    subcategory: subcategorySlug === s.slug ? "" : s.slug,
                  });
                  setOpenFilter(null);
                }}
              />
            ))}
          </FilterButton>
        )}

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
            onClick={() => setPrice([bounds.min, bounds.max])}
            className="px-2 text-xs font-bold text-flame hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ══ Grid ══ */}
      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-lg border border-line bg-shell"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-line bg-shell px-6 py-24 text-center">
          <p className="font-display text-xl font-extrabold text-ink">
            Nothing here yet
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-3">
            Try another category, or clear the price filter.
          </p>
          <Link
            href="/shop"
            className="mt-6 rounded-lg bg-flame px-6 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-flame-dk"
          >
            View everything
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {results.map((p) => (
            <ProductCard key={p.slug || p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children, small = false }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border font-bold transition-all ${
        small ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"
      } ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-shell text-ink-2 hover:border-ink-5 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FilterButton({ label, count, open, onToggle, wide, align = "left", children }) {
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
          className={`absolute top-full z-40 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-shell p-2 shadow-[0_18px_40px_-16px_rgba(43,27,77,0.4)] ${
            align === "right" ? "right-0" : "left-0"
          } ${wide ? "w-[19rem]" : "w-56"}`}
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
