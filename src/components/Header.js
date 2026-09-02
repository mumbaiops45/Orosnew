"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Diamond,
  Horse,
  Lamp,
  Toolbox,
  PottedPlant,
  Snowflake,
  Armchair,
  Crown,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useCart } from "@/context/CartContext";
import { CATEGORIES, formatINR } from "@/lib/products";
import ProfileMenu from "@/components/ProfileMenu";
import SearchBox from "@/components/SearchBox";

const CATEGORY_ICON = {
  figurines: Horse,
  lighting: Lamp,
  desk: Toolbox,
  decor: PottedPlant,
  seasonal: Snowflake,
  furniture: Armchair,
};

/**
 * Hexagon plate behind a category icon. Drawn as an SVG outline rather than a
 * clip-path so the stroke stays crisp at any size.
 */
function Hex({ children, tone = "neon" }) {
  const stroke = tone === "gold" ? "#f5b301" : "#a855f7";
  return (
    <span className="relative grid h-[58px] w-[50px] shrink-0 place-items-center">
      <svg
        viewBox="0 0 100 112"
        fill="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-105"
      >
        <path
          d="M50 3 94 28.5v55L50 109 6 83.5v-55z"
          stroke={stroke}
          strokeWidth="3.5"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

export default function Header() {
  const [compact, setCompact] = useState(false);
  const { count, subtotal, openDrawer } = useCart();
  const badge = useRef(null);

  // At rest the header shows the full rail; once you start scrolling the rail
  // folds away so the sticky chrome does not eat a quarter of the viewport.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pop the badge whenever the count changes, so the number itself
  // acknowledges the add even if the flying ghost was missed.
  useGSAP(
    () => {
      if (!badge.current || !count || prefersReducedMotion()) return;
      gsap.fromTo(
        badge.current,
        { scale: 0.4 },
        { scale: 1, duration: 0.45, ease: "back.out(4)" }
      );
    },
    { dependencies: [count] }
  );

  return (
    <header className="sticky top-0 z-50 bg-night">
      {/* Ambient purple wash. Flat paint on an opaque bar — no translucency
          or backdrop blur, so nothing behind it shows through. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 180% at 12% 0%, #2a1250 0%, #12071f 55%, #0a0514 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1600px] px-3 py-3 lg:px-8">
        {/* ══ Top row ══ */}
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Mark only — the supplied lockup already contains the OROS
              wordmark, so any text beside it would be a second one. */}
          <Link href="/" aria-label="OROS — home" className="group shrink-0">
            <Image
              src="/brand/oros-logo.jpg"
              alt="OROS"
              width={150}
              height={150}
              priority
              className="h-12 w-12 rounded-xl bg-white object-contain p-1 ring-1 ring-neon/50 transition-all duration-300 group-hover:ring-2 group-hover:ring-neon lg:h-14 lg:w-14"
            />
          </Link>

          {/* ── Who you are, kept on the left beside the mark ── */}
          <span className="hidden h-10 w-px shrink-0 bg-white/12 lg:block" />
          <ProfileMenu />

          <SearchBox />

          {/* ── Actions ── */}
          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <Link
              href="/bulk"
              className="hidden items-center gap-2.5 rounded-xl border border-neon/35 bg-night-2 px-4 py-2 transition-colors hover:border-neon xl:flex"
            >
              <Diamond size={20} className="text-neon-2" />
              <span className="leading-tight">
                <span className="block text-sm font-bold text-white">
                  Bulk Orders
                </span>
                <span className="block text-[11px] text-white/50">
                  Best deals
                </span>
              </span>
            </Link>

            <span className="hidden h-9 w-px bg-white/12 lg:block" />

            <button
              onClick={openDrawer}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
            >
              {/* data-cart-icon is the landing target for the fly-to-cart
                  animation — CartFly measures this element. */}
              <span
                data-cart-icon
                className="relative inline-grid place-items-center"
              >
                <ShoppingCart size={24} className="text-white" />
                {count > 0 && (
                  <span
                    ref={badge}
                    className="absolute -right-2 -top-2 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-neon px-1 text-[10px] font-extrabold text-white"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-bold text-white">Cart</span>
                <span className="block text-[11px] text-neon-2">
                  {formatINR(subtotal)}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* ══ Category rail ══ */}
        <nav
          className={`overflow-hidden rounded-2xl border-neon/25 bg-night-2 px-2 transition-all duration-300 ease-out ${
            compact
              ? "mt-0 max-h-0 border-0 opacity-0"
              : "mt-3 max-h-40 border opacity-100"
          }`}
        >
          <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto py-2.5 lg:gap-2">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c.slug];
              return (
                <li key={c.slug} className="shrink-0 lg:flex-1">
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="group flex w-[108px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/5 lg:w-full"
                  >
                    <Hex>
                      <Icon size={23} className="text-white" />
                    </Hex>
                    <span className="block text-center leading-tight">
                      <span className="block text-[9px] font-extrabold uppercase tracking-[0.22em] text-neon">
                        OROS
                      </span>
                      <span className="mt-0.5 block whitespace-nowrap text-[13px] font-semibold text-white/90 group-hover:text-white">
                        {c.name}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}

            {/* Wholesale gets its own gold treatment — it is the highest-value
                path in the store, not just another category. */}
            <li className="shrink-0 lg:flex-1">
              <Link
                href="/bulk"
                className="group flex w-[108px] flex-col items-center gap-1 rounded-xl border border-gold/60 px-2 py-1.5 transition-colors hover:bg-gold/10 lg:w-full"
              >
                <Hex tone="gold">
                  <Crown size={23} className="text-gold" weight="fill" />
                </Hex>
                <span className="block text-center leading-tight">
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.22em] text-gold">
                    OROS
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-[13px] font-bold text-gold">
                    Wholesale Zone
                  </span>
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
