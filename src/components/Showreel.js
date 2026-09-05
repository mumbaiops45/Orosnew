import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/ssr";
import TwoToneHeading from "@/components/TwoToneHeading";

/**
 * The admin-managed /Banner API's SHOWREEL strip — full-width cover plates,
 * same layout + tone system as the hero BannerCarousel, stacked one after
 * another instead of cycling.
 *
 * Sized off the photo's own aspect ratio (w-full h-auto) rather than a
 * fixed box — a forced height + object-contain left side gaps whenever an
 * admin photo's shape didn't match the box, which is exactly what broke
 * "full width" on some banners. Letting height follow the image guarantees
 * full width and zero cropping for any photo, at the cost of a uniform
 * height across banners.
 */
const TONE = {
  light: {
    bg: "bg-cream",
    sub: "text-ink-2",
    kicker: "bg-ink/10 text-ink",
    cta: "bg-ink text-white hover:bg-flame",
  },
  dark: {
    bg: "bg-navy",
    sub: "text-white/80",
    kicker: "bg-white/20 text-white",
    cta: "bg-white text-ink hover:bg-cream",
  },
};

export default function Showreel({ banners = [] }) {
  if (banners.length === 0) return null;

  return (
    <section className="bg-shell">
      <div className="space-y-3 py-4">
        {banners.map((b, i) => {
          const t = TONE[b.tone] || TONE.light;
          return (
            <div key={b.id} className={`relative w-full overflow-hidden ${t.bg}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.imageMobile}
                alt=""
                className="block w-full h-auto lg:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.imageDesktop}
                alt=""
                className="hidden w-full h-auto lg:block"
              />

              <div className="absolute inset-0 grid items-center gap-6 px-6 py-12 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
                <div className="max-w-xl">
                  {b.kicker && (
                    <span
                      className={`mb-5 inline-block rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] ${t.kicker}`}
                    >
                      {b.kicker}
                    </span>
                  )}

                  <TwoToneHeading
                    text={b.title}
                    className="max-w-xl font-display text-[clamp(2rem,4.8vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]"
                  />
                  {b.subTitle && (
                    <p className={`mt-4 max-w-lg text-sm leading-relaxed sm:text-base ${t.sub}`}>
                      {b.subTitle}
                    </p>
                  )}

                  {b.ctaLabel && b.ctaUrl && (
                    <Link
                      href={b.ctaUrl}
                      className={`mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-extrabold transition-all duration-300 hover:-translate-y-0.5 ${t.cta}`}
                    >
                      {b.ctaLabel}
                      <CaretRight size={15} weight="bold" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
