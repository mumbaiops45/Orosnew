"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Lightning, Eye, Check, X } from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore, useUser } from "@/store/authStore";
import { formatINR, discountPct, colorHex } from "@/lib/format";

export function PriceBlock({ product, size = "md" }) {
  const off = discountPct(product);
  const big = size === "lg";
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={`font-display font-extrabold text-ink ${
          big ? "text-3xl" : "text-lg"
        }`}
      >
        {formatINR(product.price)}
      </span>
      {off > 0 && (
        <>
          <span
            className={`text-ink-4 line-through ${big ? "text-base" : "text-sm"}`}
          >
            {formatINR(product.compareAt)}
          </span>
          <span
            className={`font-bold text-leaf ${big ? "text-base" : "text-sm"}`}
          >
            {off}% off
          </span>
        </>
      )}
    </div>
  );
}

export default function ProductCard({ product: p, className = "", onNavigate }) {
  const add = useCartStore((s) => s.add);
  const token = useAuthStore((s) => s.token);
  const { isSignedIn, isCustomer } = useUser();
  const art = useRef(null);

  const options = p.options || [];
  const configurable = options.length > 0;

  // when a configurable product's "+ Add" is clicked we don't leave the
  // grid — a variant picker opens over the card image instead
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState({});
  const [hint, setHint] = useState("");

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // auth gates + the actual cart push, shared by both paths
  const commit = (chosen) => {
    if (!token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return false;
    }
    if (isSignedIn && !isCustomer) {
      window.dispatchEvent(
        new CustomEvent("oros:require-customer", {
          detail: { message: "Cart is for customer accounts only." },
        })
      );
      return false;
    }
    add(p, {
      options: chosen,
      qty: p.minQty || 1,
      origin: art.current?.getBoundingClientRect(),
    });
    return true;
  };

  const onAddClick = (e) => {
    stop(e);
    if (configurable) {
      setHint("");
      setPicking(true);
      return;
    }
    commit([]);
  };

  const pick = (e, name, value) => {
    stop(e);
    setHint("");
    setSelected((s) => ({
      ...s,
      [name]: s[name] === value ? undefined : value,
    }));
  };

  const confirmAdd = (e) => {
    stop(e);
    const missing = options.find((o) => !selected[o.name]);
    if (missing) {
      setHint(`Select ${missing.name}`);
      return;
    }
    const chosen = options.map((o) => {
      const v = (o.values || []).find((x) => x.value === selected[o.name]);
      return {
        name: o.name,
        value: selected[o.name],
        priceDelta: Number(v?.priceDelta) || 0,
        priceMultiplier:
          v?.priceMultiplier != null ? Number(v.priceMultiplier) : 1,
      };
    });
    if (commit(chosen)) {
      setPicking(false);
      setSelected({});
    }
  };

  const shortBlurb = p.blurb
    ? p.blurb.length > 68
      ? `${p.blurb.slice(0, 68).trimEnd()}…`
      : p.blurb
    : "";

  return (
    <Link
      href={`/shop/${p.slug}`}
      onClick={onNavigate}
      className={`group relative flex flex-col rounded-lg border border-line bg-shell p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-5 hover:shadow-[0_10px_28px_-14px_rgba(43,27,77,0.4)] ${className}`}
    >
      <div
        ref={art}
        className="relative mb-3 grid aspect-square place-items-center overflow-hidden rounded-md bg-canvas"
      >
        <ProductImage
          src={p.image}
          alt={p.name}
          overlay
          imgClassName="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />

        {p.bulkTiers?.length > 0 && (
          <span className="absolute left-2 top-2 rounded bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Bulk pricing
          </span>
        )}

        <span className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1.5 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-md bg-shell/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink shadow-md">
            <Eye size={12} weight="bold" />
            View
          </span>
          <button
            onClick={onAddClick}
            aria-label={`Add ${p.name} to cart`}
            className="rounded-md bg-gold px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink shadow-md transition-colors hover:bg-gold-dk"
          >
            + Add
          </button>
        </span>

        {/* ── Variant picker — opens over the image on "+ Add" ── */}
        {picking && (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
          <div
            className="absolute inset-0 z-20 flex flex-col bg-shell/95 p-3 backdrop-blur-[2px]"
            onClick={stop}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-4">
                Choose options
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={(e) => {
                  stop(e);
                  setPicking(false);
                  setHint("");
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-canvas"
              >
                <X size={13} weight="bold" />
              </button>
            </div>

            <div className="mt-1.5 flex-1 space-y-2.5 overflow-y-auto">
              {options.map((opt) => (
                <div key={opt.id || opt.name}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-4">
                    {opt.name}
                    {selected[opt.name] && (
                      <span className="ml-1 normal-case text-ink-2">
                        · {selected[opt.name]}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(opt.values || []).map((v) => {
                      const on = selected[opt.name] === v.value;
                      return opt.type === "COLOR" ? (
                        <button
                          key={v.id || v.value}
                          type="button"
                          onClick={(e) => pick(e, opt.name, v.value)}
                          aria-pressed={on}
                          title={v.value}
                          className={`grid h-6 w-6 place-items-center rounded-full ring-1 ring-inset ring-black/10 transition ${
                            on ? "shadow-[0_0_0_2px_var(--color-ink)]" : ""
                          }`}
                          style={{ backgroundColor: colorHex(v.value) }}
                        >
                          {on && (
                            <Check
                              size={11}
                              weight="bold"
                              className="text-white mix-blend-difference"
                            />
                          )}
                        </button>
                      ) : (
                        <button
                          key={v.id || v.value}
                          type="button"
                          onClick={(e) => pick(e, opt.name, v.value)}
                          aria-pressed={on}
                          className={`rounded-md border px-2 py-1 text-[11px] font-bold transition ${
                            on
                              ? "border-ink bg-ink text-white"
                              : "border-line text-ink-2 hover:border-ink-5"
                          }`}
                        >
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hint && (
              <p className="mt-1 text-[10px] font-bold text-flame">{hint}</p>
            )}

            <button
              type="button"
              onClick={confirmAdd}
              className="mt-2 w-full rounded-md bg-gold px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
            >
              Add to cart
            </button>
          </div>
        )}
      </div>

      <h3 className="line-clamp-1 text-sm font-bold text-ink transition-colors group-hover:text-flame">
        {p.name}
      </h3>

      {shortBlurb && (
        <p className="mt-1.5 line-clamp-1 text-xs text-ink-3">{shortBlurb}</p>
      )}

      <div className="mt-2">
        <PriceBlock product={p} />
      </div>

      {p.leadTimeDays != null && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-leaf">
          <Lightning size={11} weight="fill" />
          {p.leadTimeDays === 0
            ? "Ships in 48h"
            : `Made in ${p.leadTimeDays} day${p.leadTimeDays === 1 ? "" : "s"}`}
        </div>
      )}
    </Link>
  );
}
