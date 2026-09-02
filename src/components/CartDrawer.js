"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  X,
  Check,
  Minus,
  Plus,
  Trash,
  Truck,
  Tag,
  CaretRight,
  ShoppingCart,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import {
  formatINR,
  colorHex,
  recommendFor,
  FREE_DELIVERY_OVER,
} from "@/lib/products";

export default function CartDrawer() {
  const {
    lines,
    count,
    subtotal,
    savings,
    drawerOpen,
    closeDrawer,
    justAddedKey,
    setQty,
    remove,
    add,
  } = useCart();

  const root = useRef(null);
  const panel = useRef(null);
  const backdrop = useRef(null);

  // Close on Escape while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  // The panel stays mounted so it can animate out; GSAP owns its visibility.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();

      // The panel ships with an inline translateX(100%) so it is off-screen
      // before JS runs. The browser resolves that percentage into a pixel
      // matrix, which GSAP reads back as `x`, NOT `xPercent` — so every
      // xPercent tween must zero `x` alongside it or the panel never moves.
      if (drawerOpen) {
        gsap.set(root.current, { pointerEvents: "auto" });
        if (reduced) {
          gsap.set(backdrop.current, { autoAlpha: 1 });
          gsap.set(panel.current, { xPercent: 0, x: 0 });
          return;
        }
        gsap.to(backdrop.current, { autoAlpha: 1, duration: 0.3, ease: "power2.out" });
        gsap.to(panel.current, {
          xPercent: 0,
          x: 0,
          duration: 0.55,
          ease: "expo.out",
        });

        // Empty cart means no rows to stagger; GSAP warns on empty targets.
        const rows = panel.current.querySelectorAll("[data-drawer-anim]");
        if (rows.length) {
          gsap.fromTo(
            rows,
            { autoAlpha: 0, x: 26 },
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.5,
              stagger: 0.05,
              ease: "expo.out",
              delay: 0.14,
            }
          );
        }
      } else {
        if (reduced) {
          gsap.set(backdrop.current, { autoAlpha: 0 });
          gsap.set(panel.current, { xPercent: 100, x: 0 });
          gsap.set(root.current, { pointerEvents: "none" });
          return;
        }
        gsap.to(backdrop.current, { autoAlpha: 0, duration: 0.25 });
        gsap.to(panel.current, {
          xPercent: 100,
          x: 0,
          duration: 0.4,
          ease: "power3.in",
          onComplete: () => gsap.set(root.current, { pointerEvents: "none" }),
        });
      }
    },
    { dependencies: [drawerOpen] }
  );

  // Flash the row that was just added so the eye lands on it.
  useGSAP(
    () => {
      if (!justAddedKey || !drawerOpen || prefersReducedMotion()) return;
      const row = panel.current?.querySelector("[data-just-added]");
      if (!row) return;
      gsap.fromTo(
        row,
        { backgroundColor: "#fff6e4", scale: 0.97 },
        { backgroundColor: "#ffffff", scale: 1, duration: 1.1, ease: "power2.out" }
      );
    },
    { dependencies: [justAddedKey, drawerOpen] }
  );

  // Just-added first, so it is never buried under an older line.
  const ordered = useMemo(() => {
    const hit = lines.find((l) => l.key === justAddedKey);
    return hit ? [hit, ...lines.filter((l) => l.key !== justAddedKey)] : lines;
  }, [lines, justAddedKey]);

  const recommended = useMemo(
    () => recommendFor(lines.map((l) => l.slug), 4),
    [lines]
  );

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[70]"
      style={{ pointerEvents: "none" }}
      aria-hidden={!drawerOpen}
      // The panel stays mounted for its exit animation, so it must be made
      // inert while closed — otherwise you can Tab into an off-screen cart.
      inert={!drawerOpen}
    >
      <div
        ref={backdrop}
        onClick={closeDrawer}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        style={{ opacity: 0, visibility: "hidden" }}
      />

      <aside
        ref={panel}
        role="dialog"
        aria-label="Shopping cart"
        className="absolute right-0 top-0 flex h-full w-full max-w-[430px] flex-col bg-shell shadow-[-16px_0_48px_-16px_rgba(43,27,77,0.4)]"
        style={{ transform: "translateX(100%)" }}
      >
        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-leaf-lt">
              <Check size={15} className="text-leaf" weight="bold" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold text-ink">
                Added to cart
              </p>
              <p className="text-xs text-ink-3">
                {count} item{count === 1 ? "" : "s"} · {formatINR(subtotal)}
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
          >
            <X size={18} weight="bold" />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <EmptyDrawer onClose={closeDrawer} />
          ) : (
            <>
              <ul className="divide-y divide-line">
                {ordered.map((l) => (
                  <li
                    key={l.key}
                    data-drawer-anim
                    data-just-added={l.key === justAddedKey ? "" : undefined}
                    className="flex gap-3 px-5 py-4"
                  >
                    <Link
                      href={`/shop/${l.slug}`}
                      onClick={closeDrawer}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-canvas"
                    >
                      <ProductImage
                        src={l.product.image}
                        alt={l.product.name}
                        sizes="80px"
                        overlay
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/shop/${l.slug}`}
                          onClick={closeDrawer}
                          className="line-clamp-1 text-sm font-bold text-ink hover:text-flame"
                        >
                          {l.product.name}
                        </Link>
                        <span className="whitespace-nowrap font-display text-sm font-extrabold text-ink">
                          {formatINR(l.lineTotal)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-ink-3">
                        {l.color} · {l.material}
                      </p>

                      {l.tiered && (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-leaf-lt px-1.5 py-0.5 text-[10px] font-bold text-leaf">
                          <Tag size={10} weight="fill" />
                          Bulk {formatINR(l.unit)}/unit
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center rounded border border-line">
                          <button
                            onClick={() => setQty(l.key, l.qty - 1)}
                            aria-label="Decrease quantity"
                            className="grid h-7 w-7 place-items-center text-ink-2 hover:bg-canvas"
                          >
                            <Minus size={12} weight="bold" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-ink">
                            {l.qty}
                          </span>
                          <button
                            onClick={() => setQty(l.key, l.qty + 1)}
                            aria-label="Increase quantity"
                            className="grid h-7 w-7 place-items-center text-ink-2 hover:bg-canvas"
                          >
                            <Plus size={12} weight="bold" />
                          </button>
                        </div>
                        <button
                          onClick={() => remove(l.key)}
                          aria-label={`Remove ${l.product.name}`}
                          className="text-ink-3 transition-colors hover:text-flame"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div data-drawer-anim className="px-5 py-4">
                <DrawerBanner subtotal={subtotal} lines={lines} />
              </div>

              {recommended.length > 0 && (
                <section data-drawer-anim className="border-t border-line px-5 py-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-4">
                    Goes well with this
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {recommended.map((p) => (
                      <div
                        key={p.slug}
                        className="group rounded-lg border border-line p-2.5"
                      >
                        <Link
                          href={`/shop/${p.slug}`}
                          onClick={closeDrawer}
                          className="block"
                        >
                          <span className="relative block aspect-square overflow-hidden rounded-md bg-canvas">
                            <ProductImage
                              src={p.image}
                              alt={p.name}
                              sizes="160px"
                              overlay
                              imgClassName="transition-transform duration-500 group-hover:scale-105"
                            />
                          </span>
                          <p className="mt-2 line-clamp-1 text-xs font-bold text-ink group-hover:text-flame">
                            {p.name}
                          </p>
                          <p className="font-display text-sm font-extrabold text-ink">
                            {formatINR(p.price)}
                          </p>
                        </Link>
                        <button
                          onClick={() =>
                            add(p.slug, {
                              color: p.colors[0],
                              material: p.materials[0],
                              qty: 1,
                            })
                          }
                          className="mt-2 w-full rounded bg-gold py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {lines.length > 0 && (
          <footer className="border-t border-line bg-shell px-5 py-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-ink-3">Subtotal</span>
              <span className="font-display text-xl font-extrabold text-ink">
                {formatINR(subtotal)}
              </span>
            </div>
            {savings > 0 && (
              <p className="mb-3 text-xs font-bold text-leaf">
                You save {formatINR(savings)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="rounded-md border border-line py-3 text-center text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:border-ink-5"
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="rounded-md bg-flame py-3 text-center text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Checkout
              </Link>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ── The contextual banner under the cart lines ─────────── */

function DrawerBanner({ subtotal, lines }) {
  const remaining = FREE_DELIVERY_OVER - subtotal;

  // 1. Closest, most actionable win: free delivery.
  if (remaining > 0) {
    const pct = Math.min(100, (subtotal / FREE_DELIVERY_OVER) * 100);
    return (
      <div className="rounded-lg border border-line bg-gold-lt p-4">
        <div className="flex items-center gap-2">
          <Truck size={17} className="text-gold-dk" weight="fill" />
          <p className="text-sm font-bold text-ink">
            {formatINR(remaining)} away from free delivery
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-gold-dk transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // 2. Next best: nudge toward the next bulk tier on a real line.
  const near = lines.find((l) => l.nextTier);
  if (near) {
    const need = near.nextTier.minQty - near.qty;
    return (
      <Link
        href={`/shop/${near.slug}`}
        className="block rounded-lg border border-lilac/25 bg-lilac-lt p-4 transition-colors hover:border-lilac/50"
      >
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-lilac" weight="fill" />
          <p className="text-sm font-bold text-ink">Unlock bulk pricing</p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
          Add {need} more {near.product.name} to drop to{" "}
          <span className="font-bold text-lilac">
            {formatINR(near.nextTier.price)}/unit
          </span>{" "}
          — saving {formatINR((near.unit - near.nextTier.price) * near.nextTier.minQty)}{" "}
          on the run.
        </p>
      </Link>
    );
  }

  // 3. Everything unlocked — point at the wholesale desk.
  return (
    <Link
      href="/bulk"
      className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-4 transition-colors hover:border-ink-5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf-lt">
        <Check size={16} className="text-leaf" weight="bold" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold text-ink">Free delivery unlocked</p>
        <p className="text-xs text-ink-3">
          Ordering for a business? See wholesale rates.
        </p>
      </div>
      <CaretRight size={15} className="text-ink-3" weight="bold" />
    </Link>
  );
}

function EmptyDrawer({ onClose }) {
  return (
    <div className="grid place-items-center px-6 py-20 text-center">
      <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-canvas">
        <ShoppingCart size={28} className="text-ink-4" />
      </span>
      <p className="font-display text-lg font-extrabold text-ink">
        Your cart is empty
      </p>
      <p className="mt-1.5 max-w-[240px] text-sm text-ink-3">
        Everything is printed to order — add something and we start the queue.
      </p>
      <Link
        href="/shop"
        onClick={onClose}
        className="mt-6 rounded-md bg-flame px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
      >
        Shop now
      </Link>
    </div>
  );
}
