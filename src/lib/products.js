/**
 * Catalogue. Prices in INR.
 *
 * `bulkTiers` drives both the PDP volume table and the cart's automatic
 * tier pricing — the unit price drops as quantity crosses each `minQty`.
 *
 * `image` points at a real photograph in /public/products. Because every
 * object is printed to order, `colors` lists the filament colours available
 * rather than separately photographed variants — the shot shows `shownIn`.
 */

export const CATEGORIES = [
  { slug: "figurines", name: "Figurines", tagline: "Articulated dragons, skeletons and desk companions", accent: "#ff5a2c", tint: "#fff1ec", hero: "blossom-dragon" },
  { slug: "lighting", name: "Lighting", tagline: "Shades and lamps that glow through their own print layers", accent: "#ffb627", tint: "#fff6e4", hero: "bellflower-lamp" },
  { slug: "desk", name: "Desk & storage", tagline: "Caddies, organisers and displays that actually fit", accent: "#4cb8ff", tint: "#eaf6ff", hero: "tool-caddy" },
  { slug: "decor", name: "Home decor", tagline: "Quiet objects for shelves, entryways and side tables", accent: "#00c9a7", tint: "#e6fbf6", hero: "madonna-tray" },
  { slug: "seasonal", name: "Seasonal", tagline: "Tealights and lanterns for the time of year", accent: "#7c5cff", tint: "#f1ecff", hero: "gnome-tealights" },
  { slug: "furniture", name: "Furniture", tagline: "Generative forms, printed at full scale", accent: "#ff5a2c", tint: "#fff1ec", hero: "branch-table" },
];

export const MATERIALS = [
  "PLA+",
  "Recycled PLA",
  "PETG",
  "ABS",
  "Carbon-fill nylon",
  "Resin",
];

export const COLORS = [
  { name: "Flame", hex: "#ff5a2c" },
  { name: "Amber", hex: "#ffb627" },
  { name: "Lilac", hex: "#7c5cff" },
  { name: "Mint", hex: "#00c9a7" },
  { name: "Sky", hex: "#4cb8ff" },
  { name: "Bone", hex: "#e8ddc8" },
  { name: "Aubergine", hex: "#2b1b4d" },
  { name: "Charcoal", hex: "#3f3f46" },
];

const tiers = (a, b, c) => [
  { minQty: 25, price: a },
  { minQty: 100, price: b },
  { minQty: 500, price: c },
];

export const PRODUCTS = [
  {
    slug: "bellflower-table-lamp",
    name: "Bellflower Table Lamp",
    category: "lighting",
    blurb: "Translucent petal shade on a hand-painted vine stem.",
    description:
      "The shade is printed in translucent PETG at a 1.1 mm wall so the light diffuses through the petals rather than glaring out of them. Stem and leaves print separately in matte PLA and press-fit together — no glue, no hardware. Ships with a 1.8 m braided cable and inline switch.",
    price: 3900,
    compareAt: 4600,
    bulkTiers: tiers(3320, 2870, 2420),
    rating: 4.9,
    reviews: 186,
    materials: ["PETG", "PLA+"],
    colors: ["Bone", "Mint", "Amber"],
    shownIn: "Bone shade, Mint stem",
    image: "/products/bellflower-lamp.webp",
    badge: "Bestseller",
    stock: 24,
    bestseller: true,
    featured: true,
    specs: {
      Dimensions: "210 × 190 × 420 mm",
      Weight: "640 g",
      "Print time": "16 h 40 m",
      "Wall thickness": "1.1 mm shade",
      Fitting: "E14 · warm-white bulb included",
    },
  },
  {
    slug: "welder-led-desk-lamp",
    name: "Welder LED Desk Lamp",
    category: "lighting",
    blurb: "Figurative desk lamp with a working arc-blue accent LED.",
    description:
      "A kneeling welder under a ring light, printed in four parts and finished with a bronze dry-brush over matte black. Two circuits run inside: warm white in the overhead ring, and a blue accent at the torch tip. USB-C powered with an inline dimmer.",
    price: 4600,
    compareAt: 5400,
    bulkTiers: tiers(3910, 3380, 2860),
    rating: 4.8,
    reviews: 94,
    materials: ["PLA+", "Resin"],
    colors: ["Charcoal", "Amber", "Bone"],
    shownIn: "Charcoal with bronze finish",
    image: "/products/welder-lamp.webp",
    badge: "Studio pick",
    stock: 16,
    featured: true,
    specs: {
      Dimensions: "150 × 150 × 190 mm",
      Weight: "520 g",
      "Print time": "19 h 15 m",
      Power: "USB-C, 5 V",
      Finish: "Hand dry-brushed",
    },
  },
  {
    slug: "modular-tool-caddy",
    name: "Modular Tool Caddy",
    category: "desk",
    blurb: "Rotating four-sided caddy with swappable holder tiles.",
    description:
      "A turntable core with four faces, each taking any combination of printed tiles — screwdriver slots, bit strips, bottle cradles, deep bins. Buy the core and pick your tiles; the whole thing reconfigures in seconds as your kit changes.",
    price: 2400,
    compareAt: 2900,
    bulkTiers: tiers(2040, 1760, 1490),
    rating: 4.7,
    reviews: 271,
    materials: ["PLA+", "PETG", "Recycled PLA"],
    colors: ["Sky", "Charcoal", "Bone", "Mint"],
    shownIn: "Sky and Charcoal",
    image: "/products/tool-caddy.webp",
    stock: 63,
    bestseller: true,
    featured: true,
    specs: {
      Dimensions: "160 × 160 × 240 mm",
      Weight: "480 g",
      "Print time": "11 h 30 m",
      Faces: "4, fully modular",
      Bearing: "Printed lazy-susan core",
    },
  },
  {
    slug: "fluted-remote-caddy",
    name: "Fluted Remote Caddy",
    category: "desk",
    blurb: "Ribbed three-bay holder that keeps remotes upright.",
    description:
      "Angled bays hold remotes tilted forward so you can read them at a glance, and the fluted skirt hides fingerprints in a way flat walls never do. The weighted base cavity takes sand if you want it planted. Sold as a three-bay or a single.",
    price: 1200,
    compareAt: 1500,
    bulkTiers: tiers(1020, 880, 730),
    rating: 4.6,
    reviews: 342,
    materials: ["PLA+", "Recycled PLA"],
    colors: ["Charcoal", "Bone", "Aubergine"],
    shownIn: "Charcoal, matte",
    image: "/products/remote-caddy.webp",
    stock: 188,
    bestseller: true,
    specs: {
      Dimensions: "180 × 110 × 130 mm",
      Weight: "260 g",
      "Print time": "6 h 20 m",
      Bays: "3 (single also available)",
      Texture: "Fluted outer wall",
    },
  },
  {
    slug: "pegboard-storage-display",
    name: "Pegboard Storage Display",
    category: "desk",
    blurb: "Tiered bin display with an LED-lit pegboard back.",
    description:
      "Three tiers of angled bins under a pegboard panel with a warm LED strip along the top edge. Bins lift out for refilling, and the pegboard takes any standard 5 mm hook. Designed to sit on a bench or mount to a wall.",
    price: 3400,
    compareAt: 4000,
    bulkTiers: tiers(2890, 2500, 2110),
    rating: 4.7,
    reviews: 118,
    materials: ["PLA+", "PETG"],
    colors: ["Bone", "Mint", "Charcoal"],
    shownIn: "Bone with Mint back panel",
    image: "/products/pegboard-display.webp",
    stock: 29,
    specs: {
      Dimensions: "260 × 180 × 380 mm",
      Weight: "890 g",
      "Print time": "23 h 10 m",
      Bins: "9 across 3 tiers",
      Lighting: "USB LED strip included",
    },
  },
  {
    slug: "branch-side-table",
    name: "Branch Side Table",
    category: "furniture",
    blurb: "Organic root-form base under a lace-pattern top.",
    description:
      "The base grows from a single generative branch model, printed hollow in six sections and bonded on a steel spine for rigidity. The top is a perforated lace disc that stays stiff at 12 mm through geometry alone. Rated to 15 kg.",
    price: 7800,
    compareAt: 9200,
    bulkTiers: tiers(6630, 5730, 4840),
    rating: 4.8,
    reviews: 47,
    materials: ["PLA+", "ABS"],
    colors: ["Bone", "Charcoal", "Aubergine"],
    shownIn: "Bone, matte",
    image: "/products/branch-table.webp",
    badge: "Limited",
    stock: 9,
    featured: true,
    specs: {
      Dimensions: "480 × 480 × 550 mm",
      Weight: "3.6 kg",
      "Load rating": "15 kg",
      "Print time": "62 h 00 m",
      Core: "Steel spine, bonded",
    },
  },
  {
    slug: "madonna-rosary-tray",
    name: "Madonna Rosary Tray",
    category: "decor",
    blurb: "Draped figure rising from a shallow catch-all dish.",
    description:
      "A single continuous drape flows from the crowned figure down into a shallow rimmed dish sized for a rosary, rings or keys. Printed in bone-white PLA and sanded to a soft matte that reads closer to cast stone than plastic.",
    price: 1400,
    compareAt: 1750,
    bulkTiers: tiers(1190, 1030, 870),
    rating: 4.9,
    reviews: 203,
    materials: ["PLA+", "Resin"],
    colors: ["Bone", "Amber"],
    shownIn: "Bone, hand-sanded",
    image: "/products/madonna-tray.webp",
    stock: 74,
    bestseller: true,
    specs: {
      Dimensions: "150 × 150 × 175 mm",
      Weight: "290 g",
      "Print time": "8 h 05 m",
      Finish: "Sanded matte",
      "Dish depth": "18 mm",
    },
  },
  {
    slug: "gnome-tealight-trio",
    name: "Gnome Tealight Trio",
    category: "seasonal",
    blurb: "Set of three pierced-star gnome lanterns.",
    description:
      "Three gnomes with different hats, each pierced with a star field that throws points of light across the table. Printed in thin-wall vase mode so the whole body glows, with a recessed well sized for a standard LED tealight. Tealights included.",
    price: 1650,
    compareAt: 2000,
    bulkTiers: tiers(1400, 1210, 1020),
    rating: 4.8,
    reviews: 289,
    materials: ["PLA+", "PETG"],
    colors: ["Bone", "Amber", "Mint"],
    shownIn: "Bone, thin-wall",
    image: "/products/gnome-tealights.webp",
    badge: "New",
    stock: 132,
    featured: true,
    specs: {
      Dimensions: "90 × 90 × 175 mm (each)",
      "Set size": "3 + 3 LED tealights",
      Weight: "165 g each",
      "Print time": "9 h 40 m (set)",
      "Wall thickness": "0.9 mm",
    },
  },
  {
    slug: "ghost-lantern-tealight",
    name: "Ghost Lantern Tealight",
    category: "seasonal",
    blurb: "Reading ghost under a hanging lantern on a log base.",
    description:
      "A small ghost sits reading on a printed log slice while a lantern swings overhead on a branch arm. The lantern body takes an LED tealight; the ghost, sign and base print in separate colours and assemble without glue.",
    price: 1100,
    compareAt: 1400,
    bulkTiers: tiers(935, 810, 680),
    rating: 4.7,
    reviews: 156,
    materials: ["PLA+", "Recycled PLA"],
    colors: ["Bone", "Charcoal", "Amber"],
    shownIn: "Bone ghost, Amber base",
    image: "/products/ghost-lantern.webp",
    stock: 96,
    specs: {
      Dimensions: "120 × 120 × 190 mm",
      Weight: "210 g",
      "Print time": "7 h 15 m",
      Parts: "4, press-fit",
      Includes: "1 LED tealight",
    },
  },
  {
    slug: "fall-apple-tealight",
    name: "Fall Apple Tealight",
    category: "seasonal",
    blurb: "Openwork apple with oak leaves and acorns.",
    description:
      "An apple silhouette cut through with oak leaves and acorns, so candle light rakes across the relief and throws leaf shadows outward. Printed in a warm ochre with a light sanding pass to soften the layer lines on the raised leaves.",
    price: 950,
    compareAt: 1200,
    bulkTiers: tiers(810, 700, 590),
    rating: 4.6,
    reviews: 134,
    materials: ["PLA+", "Recycled PLA"],
    colors: ["Amber", "Flame", "Bone"],
    shownIn: "Amber, sanded",
    image: "/products/apple-tealight.webp",
    stock: 118,
    specs: {
      Dimensions: "130 × 75 × 145 mm",
      Weight: "185 g",
      "Print time": "5 h 50 m",
      Relief: "Pierced openwork",
      Includes: "1 LED tealight",
    },
  },
  {
    slug: "shelf-skeleton-pair",
    name: "Shelf Skeleton Pair",
    category: "figurines",
    blurb: "Two articulated skeletons built to sit on a ledge.",
    description:
      "Print-in-place joints at the hip, knee, shoulder and elbow mean they arrive already posable — no assembly, no pins. Weighted feet keep them seated on a shelf edge without tipping. Sold as a pair; hats and bows are swappable.",
    price: 1800,
    compareAt: 2200,
    bulkTiers: tiers(1530, 1320, 1120),
    rating: 4.8,
    reviews: 227,
    materials: ["PLA+", "Recycled PLA"],
    colors: ["Flame", "Sky", "Bone", "Lilac"],
    shownIn: "Flame and Sky",
    image: "/products/skeleton-pair.webp",
    stock: 58,
    bestseller: true,
    specs: {
      Dimensions: "80 × 60 × 230 mm (each)",
      "Set size": "2",
      Weight: "140 g each",
      "Print time": "12 h 30 m (pair)",
      Joints: "Print-in-place, 8 per figure",
    },
  },
  {
    slug: "cherry-blossom-dragon",
    name: "Cherry Blossom Dragon",
    category: "figurines",
    blurb: "Articulated dragon with sculpted blossom scales.",
    description:
      "Forty-two print-in-place segments give it a full range of coil and twist straight off the plate. Blossoms are modelled into the scale plates rather than painted on, so the detail survives handling. A genuinely satisfying desk object.",
    price: 1600,
    compareAt: 1950,
    bulkTiers: tiers(1360, 1180, 990),
    rating: 4.9,
    reviews: 412,
    materials: ["PLA+", "PETG"],
    colors: ["Flame", "Lilac", "Bone", "Mint"],
    shownIn: "Blossom dual-tone",
    image: "/products/blossom-dragon.webp",
    badge: "Bestseller",
    stock: 87,
    bestseller: true,
    featured: true,
    specs: {
      Dimensions: "420 × 130 × 70 mm",
      Weight: "230 g",
      "Print time": "14 h 20 m",
      Segments: "42, print-in-place",
      Support: "None required",
    },
  },
  {
    slug: "flexi-cuttlefish",
    name: "Flexi Cuttlefish",
    category: "figurines",
    blurb: "Palm-sized articulated cuttlefish with a rippled mantle.",
    description:
      "Every tentacle and the full mantle fringe are articulated, printed in one piece with no supports. Small enough to live in a pocket, detailed enough to sit on a shelf. The mantle stripes are modelled geometry, not a paint pass.",
    price: 700,
    compareAt: 900,
    bulkTiers: tiers(595, 515, 435),
    rating: 4.7,
    reviews: 368,
    materials: ["PLA+", "Recycled PLA"],
    colors: ["Lilac", "Sky", "Mint", "Flame"],
    shownIn: "Lilac and Sky",
    image: "/products/flexi-cuttlefish.webp",
    stock: 240,
    bestseller: true,
    specs: {
      Dimensions: "95 × 55 × 30 mm",
      Weight: "38 g",
      "Print time": "3 h 10 m",
      Articulation: "Full mantle and tentacles",
      Support: "None required",
    },
  },
  {
    slug: "cartoon-duck-figure",
    name: "Cartoon Duck Figure",
    category: "figurines",
    blurb: "Two-tone desk figure with a lacquered bill.",
    description:
      "A stylised duck in matte black with a high-gloss orange bill and feet, printed as five parts and seam-sanded before assembly. Flat-bottomed so it stands unaided on a desk or shelf.",
    price: 1300,
    compareAt: 1600,
    bulkTiers: tiers(1105, 955, 810),
    rating: 4.5,
    reviews: 76,
    materials: ["PLA+", "Resin"],
    colors: ["Charcoal", "Flame", "Amber"],
    shownIn: "Charcoal with Flame bill",
    image: "/products/duck-figure.webp",
    stock: 41,
    specs: {
      Dimensions: "90 × 80 × 145 mm",
      Weight: "155 g",
      "Print time": "7 h 40 m",
      Parts: "5, bonded and sanded",
      Finish: "Matte body, gloss bill",
    },
  },
  {
    slug: "armoured-hero-figure",
    name: "Armoured Hero Figure",
    category: "figurines",
    blurb: "Poseable armoured figure with metallic panel detailing.",
    description:
      "Ball joints at the shoulders, elbows, hips and knees hold a pose without sagging. Panel lines are modelled in and picked out with a metallic dry-brush over a red base, then sealed matte.",
    price: 2800,
    compareAt: 3400,
    bulkTiers: tiers(2380, 2060, 1740),
    rating: 4.6,
    reviews: 129,
    materials: ["PLA+", "Resin"],
    colors: ["Flame", "Amber", "Charcoal"],
    shownIn: "Flame with Amber panels",
    image: "/products/armoured-hero.webp",
    stock: 22,
    specs: {
      Dimensions: "80 × 70 × 200 mm",
      Weight: "245 g",
      "Print time": "17 h 50 m",
      Joints: "10 ball joints",
      Finish: "Metallic dry-brush, matte sealed",
    },
  },
  {
    slug: "kaiju-kitten-figure",
    name: "Kaiju Kitten Figure",
    category: "figurines",
    blurb: "Cat figure in a scaled monster hood, matte finish.",
    description:
      "A round-bodied cat wearing an oversized scaled hood with sculpted teeth and a segmented tail. Printed in three colours with no painting required — the whole thing comes off the plate finished.",
    price: 1500,
    compareAt: 1850,
    bulkTiers: tiers(1275, 1105, 930),
    rating: 4.8,
    reviews: 198,
    materials: ["PLA+", "Recycled PLA"],
    colors: ["Charcoal", "Bone", "Flame"],
    shownIn: "Charcoal and Bone",
    image: "/products/kaiju-kitty.webp",
    badge: "New",
    stock: 64,
    specs: {
      Dimensions: "95 × 110 × 130 mm",
      Weight: "175 g",
      "Print time": "8 h 30 m",
      Colours: "3-colour, no painting",
      Support: "None required",
    },
  },
];

/* ── helpers ───────────────────────────────────────────── */

export const formatINR = (v) =>
  `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const getProduct = (slug) => PRODUCTS.find((p) => p.slug === slug);

export const getCategory = (slug) => CATEGORIES.find((c) => c.slug === slug);

export const colorHex = (name) =>
  COLORS.find((c) => c.name === name)?.hex || "#ff5a2c";

/** Unit price for a given quantity, walking down the bulk tiers. */
export function unitPriceFor(product, qty) {
  const tier = [...(product.bulkTiers || [])]
    .sort((a, b) => b.minQty - a.minQty)
    .find((t) => qty >= t.minQty);
  return tier ? tier.price : product.price;
}

export const relatedTo = (product, n = 3) =>
  PRODUCTS.filter(
    (p) => p.category === product.category && p.slug !== product.slug
  ).slice(0, n);

/**
 * Cross-sell for the mini cart: prefer things in the same categories as
 * what is already in the basket, then fall back to the most-reviewed items,
 * always excluding what the shopper has already added.
 */
export function recommendFor(slugsInCart = [], n = 6) {
  const inCart = new Set(slugsInCart);
  const cats = new Set(
    PRODUCTS.filter((p) => inCart.has(p.slug)).map((p) => p.category)
  );

  const sameCategory = PRODUCTS.filter(
    (p) => !inCart.has(p.slug) && cats.has(p.category)
  ).sort((a, b) => b.reviews - a.reviews);

  const everythingElse = PRODUCTS.filter(
    (p) => !inCart.has(p.slug) && !cats.has(p.category)
  ).sort((a, b) => b.reviews - a.reviews);

  return [...sameCategory, ...everythingElse].slice(0, n);
}

/** Free-delivery threshold, shared by the cart, drawer and checkout. */
export const FREE_DELIVERY_OVER = 2000;

/** Percentage off list price, or 0 when there is no saving. */
export function discountPct(p) {
  if (!p.compareAt || p.compareAt <= p.price) return 0;
  return Math.round(((p.compareAt - p.price) / p.compareAt) * 100);
}

/** Image for a category tile, resolved from its hero product. */
export const categoryImage = (slug) =>
  `/products/${getCategory(slug)?.hero || "tool-caddy"}.webp`;
