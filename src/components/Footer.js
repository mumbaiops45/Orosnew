import Link from "next/link";
import Image from "next/image";
import {
  Truck,
  Printer,
  Cube,
  Tag,
  ArrowUpRight,
  EnvelopeSimple,
  MapPin,
} from "@phosphor-icons/react/ssr";
import NotifyForm from "@/components/NotifyForm";
import { fetchCategories, fetchProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Footer() {
  const [categories, pool] = await Promise.all([
    fetchCategories(),
    fetchProducts({ limit: 1 }),
  ]);
  const productCount = pool.pagination?.total || 0;

  const FACTS = [
    { icon: Cube, value: productCount, label: "objects in the catalogue" },
    { icon: Printer, value: 40, label: "printers on the floor" },
    { icon: Truck, value: "48h", label: "dispatch on in-stock items" },
    { icon: Tag, value: "40%", label: "off per unit at 500+" },
  ];

  return (
    <footer className="mt-6 bg-night text-white">
      {/* Matches the header's wash so the page is bookended by the same
          chrome instead of three different dark surfaces. */}
      <div
        aria-hidden="true"
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, #a855f7aa 30%, #a855f7aa 70%, transparent)",
        }}
      />

      <div className="mx-auto max-w-[1600px] px-4 lg:px-8">
        {/* ══ Facts ══ */}
        <ul className="grid gap-6 border-b border-white/10 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neon/30 bg-night-2">
                <Icon size={19} className="text-neon-2" />
              </span>
              <span>
                <span className="block font-display text-xl font-extrabold leading-none">
                  {value}
                </span>
                <span className="mt-1 block text-xs text-white/45">{label}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* ══ Body ══ */}
        <div className="grid gap-10 py-12 lg:grid-cols-[1.5fr_1fr_1.3fr] lg:gap-16">
          {/* ── Studio ── */}
          <div>
            <Link href="/" aria-label="OROS — home" className="inline-block">
              <Image
                src="/brand/oros-logo.jpg"
                alt="OROS"
                width={150}
                height={150}
                className="h-14 w-14 rounded-xl bg-white object-contain p-1.5"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              An additive manufacturing studio in Bengaluru. Forty machines, no
              moulds, and nothing sitting in a warehouse waiting for you — every
              object on this site is printed after you order it.
            </p>

            <dl className="mt-6 space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="shrink-0 text-white/35" />
                <dd className="text-white/70">Bengaluru, Karnataka</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <EnvelopeSimple size={15} className="shrink-0 text-white/35" />
                <dd>
                  <a
                    href="mailto:hello@oros.in"
                    className="text-white/70 transition-colors hover:text-neon-2"
                  >
                    hello@oros.in
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* ── Shop: every link here resolves to a real page ── */}
          <nav>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Shop
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/shop"
                  className="text-sm font-semibold text-white/80 transition-colors hover:text-neon-2"
                >
                  All {productCount} products
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="group flex items-baseline gap-2 text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Wholesale + notify ── */}
          <div className="space-y-8">
            <div>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                Wholesale
              </h3>
              <Link
                href="/bulk"
                className="group block rounded-2xl border border-gold/40 bg-gold/8 p-5 transition-colors hover:bg-gold/15"
              >
                <p className="font-display text-lg font-extrabold text-gold">
                  Price a production run
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  Per-unit rates at every tier, machine hours and a realistic
                  lead time — worked out on the live catalogue.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold">
                  Open the calculator
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </span>
              </Link>
            </div>

            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                New objects
              </h3>
              <p className="mb-3 text-sm text-white/55">
                We add a few every month. No other email, ever.
              </p>
              <NotifyForm />
            </div>
          </div>
        </div>

        {/* ══ Bottom ══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} OROS Additive Pvt Ltd
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
            <span>Printed to order</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span>14-day returns</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span className="flex items-center gap-2">
              {["UPI", "Visa", "Mastercard", "RuPay"].map((m) => (
                <span
                  key={m}
                  className="rounded border border-white/15 px-2 py-1 text-[10px] font-bold text-white/55"
                >
                  {m}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
