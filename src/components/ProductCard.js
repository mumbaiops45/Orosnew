"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightning } from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatINR, discountPct } from "@/lib/format";

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

export default function ProductCard({ product: p, className = "" }) {
  const add = useCartStore((s) => s.add);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const art = useRef(null);

  const quickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // no login, no cart — ask them to sign in
    if (!token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return;
    }

    // a product with variants can't be quick-added — send them to the page
    if (p.options?.length > 0) {
      router.push(`/shop/${p.slug}`);
      return;
    }

    add(p, {
      qty: p.minQty || 1,
      origin: art.current?.getBoundingClientRect(),
    });
  };

  const shortBlurb = p.blurb
    ? p.blurb.length > 68
      ? `${p.blurb.slice(0, 68).trimEnd()}…`
      : p.blurb
    : "";

  return (
    <Link
      href={`/shop/${p.slug}`}
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

        <button
          onClick={quickAdd}
          aria-label={`Add ${p.name} to cart`}
          className="absolute bottom-2 right-2 translate-y-2 rounded-md bg-gold px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink opacity-0 shadow-md transition-all duration-300 hover:bg-gold-dk group-hover:translate-y-0 group-hover:opacity-100"
        >
          + Add
        </button>
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
