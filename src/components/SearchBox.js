"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  CaretDown,
  ArrowUpRight,
  Check,
} from "@phosphor-icons/react";
import { PRODUCTS, CATEGORIES, formatINR, getCategory } from "@/lib/products";

const MAX_PRODUCTS = 6;
const MAX_CATEGORIES = 2;

/** "All" plus every category, as the search-scope options. */
const SCOPES = [{ slug: "", name: "All Categories" }, ...CATEGORIES];

/** Rank matches so the most literal ones surface first. */
function scoreProduct(p, needle) {
  const name = p.name.toLowerCase();
  if (name.startsWith(needle)) return 0;
  if (name.includes(needle)) return 1;
  if (getCategory(p.category)?.name.toLowerCase().includes(needle)) return 2;
  if (p.blurb.toLowerCase().includes(needle)) return 3;
  if (p.materials.some((m) => m.toLowerCase().includes(needle))) return 4;
  return -1;
}

/** Wrap the matched run so the shopper can see why a row came back. */
function Highlight({ text, needle }) {
  const at = text.toLowerCase().indexOf(needle);
  if (!needle || at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-extrabold text-flame">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
}

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("");
  const [open, setOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef(null);
  const listId = useId();

  const needle = q.trim().toLowerCase();
  const scopeLabel = scope ? getCategory(scope)?.name : "All Categories";

  const { products, cats } = useMemo(() => {
    if (needle.length < 1) return { products: [], cats: [] };

    const pool = scope ? PRODUCTS.filter((p) => p.category === scope) : PRODUCTS;
    const products = pool
      .map((p) => ({ p, s: scoreProduct(p, needle) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s || b.p.reviews - a.p.reviews)
      .slice(0, MAX_PRODUCTS)
      .map((x) => x.p);

    const cats = scope
      ? []
      : CATEGORIES.filter((c) => c.name.toLowerCase().includes(needle)).slice(
          0,
          MAX_CATEGORIES
        );

    return { products, cats };
  }, [needle, scope]);

  // One flat list so the arrow keys can walk everything, ending on the
  // "see all results" row.
  const rows = useMemo(
    () => [
      ...products.map((p) => ({ type: "product", key: p.slug, item: p })),
      ...cats.map((c) => ({ type: "category", key: c.slug, item: c })),
      ...(needle ? [{ type: "all", key: "__all" }] : []),
    ],
    [products, cats, needle]
  );

  useEffect(() => setActive(-1), [needle]);

  // Close both popovers on an outside click or Escape.
  useEffect(() => {
    if (!open && !scopeOpen) return;
    const close = () => {
      setOpen(false);
      setScopeOpen(false);
    };
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, scopeOpen]);

  const goToSearch = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (scope) params.set("category", scope);
    setOpen(false);
    router.push(params.toString() ? `/shop?${params}` : "/shop");
  };

  const choose = (row) => {
    setOpen(false);
    if (row.type === "product") router.push(`/shop/${row.item.slug}`);
    else if (row.type === "category")
      router.push(`/shop?category=${row.item.slug}`);
    else goToSearch();
  };

  const onKeyDown = (e) => {
    if (!open || rows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (active >= 0) {
        e.preventDefault();
        choose(rows[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && needle.length > 0;

  return (
    <div ref={wrap} className="relative flex-1 lg:max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch();
        }}
        className="flex h-12 items-center rounded-full border border-neon/40 bg-night-2 px-1"
      >
        {/* A native <select> draws its list with the OS, which lands as a
            white Windows menu on this dark bar and cannot be styled. This is
            a real listbox so it can match the header. */}
        <div className="relative hidden shrink-0 sm:block">
          <button
            type="button"
            onClick={() => {
              setScopeOpen((o) => !o);
              setOpen(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={scopeOpen}
            className="flex h-10 items-center gap-2 rounded-full pl-4 pr-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            {scopeLabel}
            <CaretDown
              size={13}
              weight="bold"
              className={`text-white/50 transition-transform duration-200 ${
                scopeOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {scopeOpen && (
            <ul
              role="listbox"
              aria-label="Search within category"
              className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-neon/40 bg-night-2 p-1.5 shadow-[0_24px_60px_-20px_rgba(10,5,20,0.85)]"
            >
              {SCOPES.map((c) => {
                const on = scope === c.slug;
                return (
                  <li key={c.slug || "all"}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => {
                        setScope(c.slug);
                        setScopeOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        on
                          ? "bg-neon/25 text-white"
                          : "text-white/65 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {c.name}
                      {on && (
                        <Check size={13} weight="bold" className="text-neon-2" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <span className="hidden h-6 w-px shrink-0 bg-white/15 sm:block" />

        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setScopeOpen(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for dragons, lamps, caddies…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35"
        />

        <button
          type="submit"
          aria-label="Search"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon text-white transition-colors hover:bg-neon-2"
        >
          <MagnifyingGlass size={18} weight="bold" />
        </button>
      </form>

      {/* ── Suggestions ── */}
      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-shell shadow-[0_24px_60px_-20px_rgba(10,5,20,0.6)]"
        >
          {rows.length === 1 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-3">
              No products match “{q.trim()}”. Press Enter to search anyway.
            </p>
          ) : null}

          {products.length > 0 && (
            <ul className="py-1.5">
              {products.map((p, i) => (
                <li key={p.slug}>
                  <button
                    role="option"
                    aria-selected={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(rows[i])}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      active === i ? "bg-canvas" : "hover:bg-canvas"
                    }`}
                  >
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-canvas">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        <Highlight text={p.name} needle={needle} />
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        {getCategory(p.category)?.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-sm font-extrabold text-ink">
                      {formatINR(p.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {cats.length > 0 && (
            <ul className="border-t border-line py-1.5">
              {cats.map((c, j) => {
                const i = products.length + j;
                return (
                  <li key={c.slug}>
                    <button
                      role="option"
                      aria-selected={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(rows[i])}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        active === i ? "bg-canvas" : "hover:bg-canvas"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-4">
                        Category
                      </span>
                      <span className="text-sm font-bold text-ink">
                        <Highlight text={c.name} needle={needle} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            role="option"
            aria-selected={active === rows.length - 1}
            onMouseEnter={() => setActive(rows.length - 1)}
            onClick={goToSearch}
            className={`flex w-full items-center justify-between gap-2 border-t border-line px-4 py-3 text-left transition-colors ${
              active === rows.length - 1 ? "bg-canvas" : "hover:bg-canvas"
            }`}
          >
            <span className="text-sm font-bold text-flame">
              See all results for “{q.trim()}”
            </span>
            <ArrowUpRight size={15} weight="bold" className="text-flame" />
          </button>
        </div>
      )}
    </div>
  );
}
