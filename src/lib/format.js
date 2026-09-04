/** Money + pricing helpers. No catalogue data lives here. */

export const formatINR = (v) =>
  `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

/** Percentage off list price, or 0 when there is no saving. */
export function discountPct(p) {
  if (!p) return 0;
  const price = Number(p.price) || 0;
  const compareAt = Number(p.compareAt) || 0;
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Unit price for a given quantity, walking down the bulk tiers. */
export function unitPriceFor(product, qty) {
  const tier = [...(product?.bulkTiers || [])]
    .sort((a, b) => b.minQty - a.minQty)
    .find((t) => qty >= t.minQty);
  return tier ? tier.price : product?.price || 0;
}

/** A small named palette so colour-typed options can still render a swatch. */
export const COLORS = [
  { name: "Flame", hex: "#ff5a2c" },
  { name: "Amber", hex: "#ffb627" },
  { name: "Lilac", hex: "#7c5cff" },
  { name: "Mint", hex: "#00c9a7" },
  { name: "Sky", hex: "#4cb8ff" },
  { name: "Bone", hex: "#e8ddc8" },
  { name: "Aubergine", hex: "#2b1b4d" },
  { name: "Charcoal", hex: "#3f3f46" },
  { name: "Black", hex: "#18181b" },
  { name: "White", hex: "#f4f4f5" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
];

export const colorHex = (name) => {
  if (!name) return "#ff5a2c";
  const hit = COLORS.find(
    (c) => c.name.toLowerCase() === String(name).toLowerCase()
  );
  if (hit) return hit.hex;
  // allow a raw hex value straight from a COLOR option
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(name)) return name;
  return "#ff5a2c";
};
