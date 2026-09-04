"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Diamond,
  Crown,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useCart } from "@/store/cartStore";
import { formatINR } from "@/lib/format";
import { fetchCategories } from "@/lib/catalog";
import ProfileMenu from "@/components/ProfileMenu";
import SearchBox from "@/components/SearchBox";

const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

/** Hexagon plate — a category image clipped to fill it edge to edge. */
function HexImage({ src, alt, tone = "neon" }) {
  const ring = tone === "gold" ? "#f5b301" : "#a855f7";
  return (
    <span
      className="relative block h-[54px] w-[48px] shrink-0 transition-transform duration-300 group-hover:scale-105"
      style={{ clipPath: HEX_CLIP }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: ring, opacity: 0.9 }}
      />
      <span
        className="absolute inset-[2px] overflow-hidden"
        style={{ clipPath: HEX_CLIP, background: "#12071f" }}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : null}
      </span>
    </span>
  );
}

export default function Header() {
  const [compact, setCompact] = useState(false);
  const [categories, setCategories] = useState([]);
  const { count, subtotal, openDrawer } = useCart();
  const badge = useRef(null);
  const rail = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const syncRail = () => {
    const el = rail.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    syncRail();
    const el = rail.current;
    if (!el) return;
    el.addEventListener("scroll", syncRail, { passive: true });
    window.addEventListener("resize", syncRail);
    return () => {
      el.removeEventListener("scroll", syncRail);
      window.removeEventListener("resize", syncRail);
    };
  }, [categories, compact]);

  const pageRail = (dir) => {
    rail.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 180% at 12% 0%, #2a1250 0%, #12071f 55%, #0a0514 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1600px] px-3 py-3 lg:px-8">
        <div className="flex items-center gap-3 lg:gap-6">
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

          <span className="hidden h-10 w-px shrink-0 bg-white/12 lg:block" />
          <ProfileMenu />

          <SearchBox />

          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <Link
              href="/custom"
              className="hidden items-center gap-2.5 rounded-xl border border-neon/35 bg-night-2 px-4 py-2 transition-colors hover:border-neon xl:flex"
            >
              <Diamond size={20} className="text-neon-2" />
              <span className="leading-tight">
                <span className="block text-sm font-bold text-white">
                  Custom Order
                </span>
                <span className="block text-[11px] text-white/50">
                  Made to spec
                </span>
              </span>
            </Link>

            <span className="hidden h-9 w-px bg-white/12 lg:block" />

            <button
              onClick={openDrawer}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
            >
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
          className={`relative overflow-hidden rounded-2xl border-neon/25 bg-night-2 px-2 transition-all duration-300 ease-out ${
            compact
              ? "mt-0 max-h-0 border-0 opacity-0"
              : "mt-3 max-h-40 border opacity-100"
          }`}
        >
          {canLeft && (
            <button
              onClick={() => pageRail(-1)}
              aria-label="Scroll categories left"
              className="absolute left-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-night text-white shadow-lg ring-1 ring-neon/40 hover:bg-night-2"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
          )}
          {canRight && (
            <button
              onClick={() => pageRail(1)}
              aria-label="Scroll categories right"
              className="absolute right-1 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-night text-white shadow-lg ring-1 ring-neon/40 hover:bg-night-2"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          )}

          <ul
            ref={rail}
            className="no-scrollbar flex items-start justify-start gap-0 overflow-x-auto px-1 py-2.5"
          >
            {categories.map((c) => (
              <li key={c.slug} className="w-[104px] shrink-0">
                <Link
                  href={`/shop?category=${c.slug}`}
                  title={c.name}
                  className="group flex w-full min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors hover:bg-white/5"
                >
                  <HexImage src={c.image} alt={c.name} />
                  <span className="block w-full min-w-0 text-center leading-tight">
                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.22em] text-neon">
                      OROS
                    </span>
                    <span className="mt-0.5 block w-full truncate text-[13px] font-semibold text-white/90 group-hover:text-white">
                      {c.name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}

            <li className="w-[104px] shrink-0">
              <Link
                href="/custom"
                title="Custom order"
                className="group flex w-full min-w-0 flex-col items-center gap-1 rounded-xl border border-gold/60 px-1 py-1.5 transition-colors hover:bg-gold/10"
              >
                <span
                  className="relative grid h-[54px] w-[48px] shrink-0 place-items-center transition-transform duration-300 group-hover:scale-105"
                  style={{ clipPath: HEX_CLIP, background: "#f5b30122" }}
                >
                  <Crown size={22} className="text-gold" weight="fill" />
                </span>
                <span className="block w-full min-w-0 text-center leading-tight">
                  <span className="block text-[9px] font-extrabold uppercase tracking-[0.22em] text-gold">
                    OROS
                  </span>
                  <span className="mt-0.5 block w-full truncate text-[13px] font-bold text-gold">
                    Custom
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
