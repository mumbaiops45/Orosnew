import Link from "next/link";
import { ArrowRight, Percent } from "@phosphor-icons/react/ssr";
import BannerCarousel from "@/components/BannerCarousel";
import Rail from "@/components/Rail";
import ProductImage from "@/components/ProductImage";
import {
  PRODUCTS,
  CATEGORIES,
  formatINR,
  discountPct,
  categoryImage,
} from "@/lib/products";

export default function Home() {
  const bestsellers = PRODUCTS.filter((p) => p.bestseller);
  const featured = PRODUCTS.filter((p) => p.featured);
  const desk = PRODUCTS.filter((p) => p.category === "desk");
  const deals = [...PRODUCTS].sort((a, b) => discountPct(b) - discountPct(a)).slice(0, 6);

  return (
    <div className="space-y-3 pb-3">
      <BannerCarousel />

      <Rail
        title="Bestsellers this month"
        subtitle="What everyone else is printing"
        products={bestsellers}
        href="/shop"
      />

      {/* ── Deals grid ── */}
      <section className="bg-shell">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-lt">
                <Percent size={16} className="text-gold-dk" />
              </span>
              <div>
                <h2 className="font-display text-xl font-extrabold tracking-tight text-ink lg:text-2xl">
                  Biggest discounts
                </h2>
                <p className="mt-0.5 text-xs text-ink-3 lg:text-sm">
                  Ends when the print queue clears
                </p>
              </div>
            </div>
            <Link
              href="/shop?sort=discount"
              className="shrink-0 rounded-md bg-flame px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk lg:text-sm"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3 lg:grid-cols-6">
            {deals.map((p) => (
              <Link
                key={p.slug}
                href={`/shop/${p.slug}`}
                className="group rounded-lg border border-line p-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(43,27,77,0.4)]"
              >
                <div className="relative mb-2 aspect-square overflow-hidden rounded-md bg-canvas">
                  <ProductImage
                    src={p.image}
                    alt={p.name}
                    sizes="(max-width: 640px) 50vw, 16vw"
                    overlay
                    imgClassName="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="line-clamp-1 text-sm font-bold text-ink">{p.name}</p>
                <p className="mt-1 text-base font-extrabold text-leaf">
                  {discountPct(p)}% off
                </p>
                <p className="text-xs text-ink-3">from {formatINR(p.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Rail
        title="Best of desk"
        subtitle="Caddies, organisers and displays that actually fit"
        products={desk}
        href="/shop?category=desk"
      />

      {/* ── Bulk strip ── */}
      <section className="bg-shell">
        <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
          <Link
            href="/bulk"
            className="group relative flex flex-col gap-6 overflow-hidden rounded-xl bg-ink px-6 py-9 sm:px-10 lg:flex-row lg:items-center lg:justify-between"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
              style={{
                background: "radial-gradient(circle, #7c5cff 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <span className="mb-3 inline-block rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink">
                Bulk & wholesale
              </span>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
                Buying 25 or more? Your price drops automatically.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/65 lg:text-base">
                Corporate gifts, retail stock, event merch, spare parts. Tier
                pricing is applied in the cart — no negotiation needed.
              </p>
            </div>
            <span className="relative inline-flex shrink-0 items-center gap-2 rounded-md bg-flame px-7 py-3.5 text-sm font-extrabold text-white transition-colors group-hover:bg-gold group-hover:text-ink">
              Get a bulk quote
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </Link>
        </div>
      </section>

      <Rail
        title="New & noteworthy"
        subtitle="Fresh off the print farm"
        products={featured}
        href="/shop"
      />

      {/* ── Category tiles ── */}
      <section className="bg-shell">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6">
          <h2 className="py-5 font-display text-xl font-extrabold tracking-tight text-ink lg:text-2xl">
            Shop by category
          </h2>
          <div className="grid grid-cols-2 gap-3 pb-8 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => {
              const count = PRODUCTS.filter((p) => p.category === c.slug).length;
              return (
                <Link
                  key={c.slug}
                  href={`/shop?category=${c.slug}`}
                  className="group overflow-hidden rounded-lg border border-line transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(43,27,77,0.4)]"
                >
                  <div className="relative aspect-4/3 overflow-hidden">
                    <ProductImage
                      src={categoryImage(c.slug)}
                      alt={c.name}
                      sizes="(max-width: 640px) 50vw, 16vw"
                      overlay
                      imgClassName="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-ink group-hover:text-flame">
                      {c.name}
                    </p>
                    <p className="text-xs text-ink-3">
                      {count} product{count === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
