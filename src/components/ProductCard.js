"use client";

import { useRef } from "react";
import Link from "next/link";
import { Star, Lightning } from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { formatINR, colorHex, discountPct } from "@/lib/products";

export function RatingChip({ rating, reviews, compact = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 rounded bg-leaf px-1.5 py-0.5 text-[11px] font-bold text-white">
        {rating.toFixed(1)}
        <Star size={9} weight="fill" />
      </span>
      {!compact && (
        <span className="text-xs font-semibold text-ink-4">
          ({reviews.toLocaleString("en-IN")})
        </span>
      )}
    </div>
  );
}

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
  const { add } = useCart();
  const swatch = colorHex(p.colors[0]);
  const art = useRef(null);

  const quickAdd = (e) => {
    // The card is a link — stop the click before it navigates.
    e.preventDefault();
    e.stopPropagation();
    add(p.slug, {
      color: p.colors[0],
      material: p.materials[0],
      qty: 1,
      // Fly from the artwork, not the button, so the product is what moves.
      origin: art.current?.getBoundingClientRect(),
    });
  };

  return (
    <Link
      href={`/shop/${p.slug}`}
      className={`group relative flex flex-col rounded-lg border border-line bg-shell p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-5 hover:shadow-[0_10px_28px_-14px_rgba(43,27,77,0.4)] ${className}`}
    >
      {/* ── Artwork ── */}
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

        {p.badge && (
          <span className="absolute left-2 top-2 rounded bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {p.badge}
          </span>
        )}

        {p.stock <= 25 && (
          <span className="absolute bottom-2 left-2 rounded bg-flame-lt px-2 py-1 text-[10px] font-bold text-flame">
            Only {p.stock} left
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

      {/* ── Detail ── */}
      <h3 className="line-clamp-1 text-sm font-bold text-ink transition-colors group-hover:text-flame">
        {p.name}
      </h3>

      <div className="mt-1.5">
        <RatingChip rating={p.rating} reviews={p.reviews} />
      </div>

      <p className="mt-1.5 line-clamp-1 text-xs text-ink-3">{p.blurb}</p>

      <div className="mt-2">
        <PriceBlock product={p} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-leaf">
        <Lightning size={11} weight="fill" />
        Ships in 48h
      </div>
    </Link>
  );
}
