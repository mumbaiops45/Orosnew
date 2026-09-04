"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as cartApi from "@/api/cart.api";
import { tokenStore } from "@/lib/axios";
import { unitPriceFor } from "@/lib/format";

const variantKeyFor = (options = []) =>
  JSON.stringify(
    [...options].sort((a, b) => a.name.localeCompare(b.name))
  );

const lineKeyFor = (productId, options) =>
  `${productId}|${variantKeyFor(options)}`;

/** turn the selected options into display strings */
const readVariant = (options = []) => {
  const find = (re) =>
    options.find((o) => re.test(o.name || ""))?.value || "";
  return {
    color: find(/colou?r/i),
    material: find(/material|finish/i),
    // "Colour: Red · Size: Large" — every option the customer chose
    variantLabel: options
      .map((o) => `${o.name}: ${o.value}`)
      .join("  ·  "),
  };
};

const snapshotOf = (product) => ({
  name: product.name,
  slug: product.slug,
  image: product.image,
  price: product.price,
  compareAt: product.compareAt ?? null,
  taxRate: product.taxRate || 0,
  minQty: product.minQty || 1,
  bulkTiers: product.bulkTiers || [],
});

// best-effort server push — never blocks the UI, never throws
const pushToServer = (fn) => {
  if (!tokenStore.get()) return;
  Promise.resolve()
    .then(fn)
    .catch((e) => {
      if (process.env.NODE_ENV !== "production")
        console.warn("[cart sync]", e?.message || e);
    });
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      lines: [],
      drawerOpen: false,
      justAddedKey: null,
      flight: null,
      hydrated: false,

      add: (product, { options = [], qty = 1, origin = null } = {}) => {
        if (!product?.id && !product?._id) return;

        // the store is customer-only — no token, no cart
        if (!tokenStore.get()) {
          if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("oros:require-auth"));
          return;
        }

        const productId = product.id || product._id;
        const key = lineKeyFor(productId, options);
        const quantity = Math.max(1, Number(qty) || 1);

        set((state) => {
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key
                  ? { ...l, qty: Math.min(l.qty + quantity, 99999) }
                  : l
              ),
              justAddedKey: key,
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                key,
                productId,
                slug: product.slug,
                options,
                qty: quantity,
                snapshot: snapshotOf(product),
              },
            ],
            justAddedKey: key,
          };
        });

        pushToServer(() =>
          cartApi.addToCart({
            product: productId,
            qty: quantity,
            selectedOptions: options,
            personalisation: {},
          })
        );

        if (origin) {
          set({
            flight: {
              id: `${Date.now()}-${productId}`,
              rect: origin,
              image: product.image,
            },
          });
        } else {
          set({ drawerOpen: true });
        }
      },

      setQty: (key, qty) => {
        const next = Math.max(0, Math.min(Number(qty) || 0, 99999));
        set((state) => ({
          lines:
            next === 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) =>
                  l.key === key ? { ...l, qty: next } : l
                ),
        }));
        const line = get().lines.find((l) => l.key === key);
        if (line?.serverId) {
          pushToServer(() =>
            next === 0
              ? cartApi.removeCartItem(line.serverId)
              : cartApi.updateCartQty(line.serverId, next)
          );
        }
      },

      remove: (key) => {
        const line = get().lines.find((l) => l.key === key);
        set((state) => ({
          lines: state.lines.filter((l) => l.key !== key),
        }));
        if (line?.serverId)
          pushToServer(() => cartApi.removeCartItem(line.serverId));
      },

      clear: () => {
        set({ lines: [] });
        pushToServer(() => cartApi.clearCart());
      },

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      endFlight: () => set({ flight: null, drawerOpen: true }),

      /** merge whatever the server holds for this user into the local cart */
      syncFromServer: async () => {
        if (!tokenStore.get()) return;
        try {
          const data = await cartApi.getCart();
          const serverItems = data.items || [];
          set((state) => {
            const byKey = new Map(state.lines.map((l) => [l.key, l]));
            for (const item of serverItems) {
              const p = item.product || {};
              const pid = p._id || item.product;
              const options = item.selectedOptions || [];
              const key = lineKeyFor(pid, options);
              const local = byKey.get(key);
              byKey.set(key, {
                key,
                productId: pid,
                slug: p.slug,
                options,
                qty: local ? Math.max(local.qty, item.qty) : item.qty,
                serverId: item._id,
                snapshot: {
                  name: p.name,
                  slug: p.slug,
                  image: local?.snapshot?.image || "/placeholder.svg",
                  price: p.basePrice ?? item.unitPrice ?? 0,
                  compareAt: null,
                  taxRate: item.taxRate || 0,
                  minQty: p.minQty || 1,
                  bulkTiers: local?.snapshot?.bulkTiers || [],
                },
              });
            }
            return { lines: [...byKey.values()] };
          });
        } catch (e) {
          if (process.env.NODE_ENV !== "production")
            console.warn("[cart sync]", e?.message || e);
        }
      },
    }),
    {
      name: "oros.cart",
      partialize: (s) => ({ lines: s.lines }),
      onRehydrateStorage: () => () =>
        useCartStore.setState({ hydrated: true }),
    }
  )
);

/** Derived cart view — identical surface to the old CartContext. */
export function useCart() {
  const lines = useCartStore((s) => s.lines);
  const drawerOpen = useCartStore((s) => s.drawerOpen);
  const justAddedKey = useCartStore((s) => s.justAddedKey);
  const flight = useCartStore((s) => s.flight);

  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const endFlight = useCartStore((s) => s.endFlight);

  const detailed = lines.map((l) => {
    const snap = l.snapshot || {};
    const product = { ...snap, id: l.productId, _id: l.productId, slug: l.slug };
    const unit = unitPriceFor(product, l.qty);
    const listUnit = snap.compareAt || snap.price || unit;
    const tiers = [...(snap.bulkTiers || [])].sort(
      (a, b) => a.minQty - b.minQty
    );
    const nextTier = tiers.find((t) => l.qty < t.minQty) || null;
    const { color, material, variantLabel } = readVariant(l.options);
    return {
      ...l,
      product,
      color,
      material,
      variantLabel,
      unit,
      listUnit,
      nextTier,
      lineTotal: unit * l.qty,
      lineSaving: Math.max(0, (listUnit - unit) * l.qty),
      tiered: unit < (snap.price || unit),
    };
  });

  const count = detailed.reduce((n, l) => n + l.qty, 0);
  const subtotal = detailed.reduce((n, l) => n + l.lineTotal, 0);
  const savings = detailed.reduce((n, l) => n + l.lineSaving, 0);
  // real delivery is only known at checkout from the courier rate
  const delivery = 0;

  return {
    lines: detailed,
    count,
    subtotal,
    savings,
    delivery,
    total: subtotal,
    drawerOpen,
    openDrawer,
    closeDrawer,
    justAddedKey,
    justAdded: detailed.find((l) => l.key === justAddedKey) || null,
    flight,
    endFlight,
    add,
    setQty,
    remove,
    clear,
  };
}
