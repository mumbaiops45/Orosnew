"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { getProduct, unitPriceFor, FREE_DELIVERY_OVER } from "@/lib/products";

const CartContext = createContext(null);
const STORAGE_KEY = "oros.cart.v1";

/* A line is identified by product + chosen variant, so the same object in
   two colours occupies two lines. */
const lineKey = (slug, color, material) => `${slug}|${color}|${material}`;

function reducer(state, action) {
  switch (action.type) {
    case "hydrate":
      return action.lines;

    case "add": {
      const { slug, color, material, qty } = action;
      const key = lineKey(slug, color, material);
      const existing = state.find((l) => l.key === key);
      if (existing) {
        return state.map((l) =>
          l.key === key ? { ...l, qty: Math.min(l.qty + qty, 9999) } : l
        );
      }
      return [...state, { key, slug, color, material, qty }];
    }

    case "setQty":
      return state
        .map((l) =>
          l.key === action.key
            ? { ...l, qty: Math.max(0, Math.min(action.qty, 9999)) }
            : l
        )
        .filter((l) => l.qty > 0);

    case "remove":
      return state.filter((l) => l.key !== action.key);

    case "clear":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(reducer, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [justAddedKey, setJustAddedKey] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // The in-flight "product flies to the cart icon" animation. Holds the
  // origin rect so the flying ghost can start exactly where the click did.
  const [flight, setFlight] = useState(null);

  // Read once on mount. Deliberately not in useReducer's initialiser — that
  // would run during SSR and mismatch on hydration.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) {
        dispatch({ type: "hydrate", lines: saved });
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Never write before the read above has been applied. Without this guard the
  // first persist runs in the same commit as the read and saves the still-empty
  // initial state — and under StrictMode's double-invoked effects the second
  // pass then reads that empty array back, wiping the cart on every reload.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, hydrated]);

  // Lock the page behind the drawer. Lenis respects this via .lenis-stopped.
  useEffect(() => {
    const root = document.documentElement;
    if (drawerOpen) root.classList.add("lenis-stopped");
    else root.classList.remove("lenis-stopped");
    return () => root.classList.remove("lenis-stopped");
  }, [drawerOpen]);

  const add = useCallback((slug, { color, material, qty = 1, origin = null }) => {
    const product = getProduct(slug);
    if (!product) return;

    dispatch({ type: "add", slug, color, material, qty });
    setJustAddedKey(lineKey(slug, color, material));

    // With an origin rect we fly first and open the drawer on landing;
    // without one (keyboard, reduced motion) just open it straight away.
    if (origin) {
      setFlight({
        id: `${Date.now()}-${slug}`,
        rect: origin,
        image: product.image,
      });
    } else {
      setDrawerOpen(true);
    }
  }, []);

  const endFlight = useCallback(() => {
    setFlight(null);
    setDrawerOpen(true);
  }, []);

  const value = useMemo(() => {
    // Join lines against the catalogue and apply bulk tier pricing.
    const detailed = lines
      .map((l) => {
        const product = getProduct(l.slug);
        if (!product) return null;
        const unit = unitPriceFor(product, l.qty);
        const listUnit = product.compareAt || product.price;
        const nextTier = (product.bulkTiers || []).find((t) => l.qty < t.minQty);
        return {
          ...l,
          product,
          unit,
          listUnit,
          nextTier,
          lineTotal: unit * l.qty,
          lineSaving: Math.max(0, (listUnit - unit) * l.qty),
          tiered: unit < product.price,
        };
      })
      .filter(Boolean);

    const count = detailed.reduce((n, l) => n + l.qty, 0);
    const subtotal = detailed.reduce((n, l) => n + l.lineTotal, 0);
    const savings = detailed.reduce((n, l) => n + l.lineSaving, 0);
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_OVER ? 0 : 79;

    return {
      lines: detailed,
      count,
      subtotal,
      savings,
      delivery,
      total: subtotal + delivery,

      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      justAddedKey,
      justAdded: detailed.find((l) => l.key === justAddedKey) || null,

      flight,
      endFlight,

      add,
      setQty: (key, qty) => dispatch({ type: "setQty", key, qty }),
      remove: (key) => dispatch({ type: "remove", key }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [lines, drawerOpen, justAddedKey, flight, add, endFlight]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};
