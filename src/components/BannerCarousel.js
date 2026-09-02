"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * Every slide is a photograph with a scrim over the copy side.
 *
 *   scrim  — sampled from that plate's own left edge so the fade has no seam.
 *   tone   — "dark" plates take white type, "light" plates take ink. Getting
 *            this wrong is the difference between legible and invisible, so
 *            it is declared per slide rather than guessed.
 *   accent — the run of words inside `title` to highlight, keeping the copy
 *            in one readable string instead of a pile of nested spans.
 */
const SLIDES = [
  {
    kicker: "Eight filament colours",
    title: "Pick the colour. We print it.",
    accent: "We print it.",
    accentColor: "#ff5a2c",
    sub: "Flame, Amber, Lilac, Mint, Sky, Bone, Aubergine, Charcoal — chosen before the run starts, never dyed afterwards.",
    cta: "See the colours",
    href: "/shop",
    image: "/banner/studio-spectrum.png",
    scrim: "#f1efec",
    tone: "light",
  },
  {
    kicker: "Home decor",
    title: "Quiet objects for calm rooms",
    accent: "calm rooms",
    accentColor: "#00a58a",
    sub: "Trays, bowls and tealight holders in muted matte finishes, sanded by hand until they read closer to stone than plastic.",
    cta: "Shop home decor",
    href: "/shop?category=decor",
    image: "/banner/studio-sage.png",
    scrim: "#e7efe7",
    tone: "light",
  },
  {
    kicker: "Bone colourway",
    title: "One filament. Every shape.",
    accent: "Every shape.",
    accentColor: "#b07a3f",
    sub: "A warm off-white that sands to a soft matte. The whole catalogue prints in it, if a single palette is what your shelf needs.",
    cta: "See everything in Bone",
    href: "/shop?color=Bone",
    image: "/banner/studio-cream.png",
    scrim: "#f6ebdf",
    tone: "light",
  },
  {
    kicker: "Desk & home",
    title: "Something for every surface",
    accent: "every surface",
    accentColor: "#e0562a",
    sub: "Pen pots, planters, castles and foxes — printed after you order, never sat in a warehouse waiting for you.",
    cta: "Browse the shop",
    href: "/shop",
    image: "/banner/studio-warm.png",
    scrim: "#f4eee5",
    tone: "light",
  },
];

/* Everything that has to flip when a plate is light instead of dark. */
const TONE = {
  dark: {
    title: "text-white",
    sub: "text-white/80",
    kicker: "bg-white/20 text-white",
    cta: "bg-white text-ink hover:bg-cream",
    arrow: "bg-white/85 text-ink hover:bg-white",
    dotOn: "bg-white",
    dotOff: "bg-white/50",
  },
  light: {
    title: "text-ink",
    sub: "text-ink-2",
    kicker: "bg-ink/10 text-ink",
    cta: "bg-ink text-white hover:bg-flame",
    arrow: "bg-ink/80 text-white hover:bg-ink",
    dotOn: "bg-ink",
    dotOff: "bg-ink/25",
  },
};

/** Split a headline around its accent phrase so one run can be coloured. */
function Headline({ title, accent, color }) {
  const at = accent ? title.indexOf(accent) : -1;
  if (at === -1) return title;
  return (
    <>
      {title.slice(0, at)}
      <span style={{ color }}>{accent}</span>
      {title.slice(at + accent.length)}
    </>
  );
}

export default function BannerCarousel() {
  const [idx, setIdx] = useState(0);
  const scope = useRef(null);
  const timer = useRef(null);

  const go = useCallback((next) => {
    setIdx((cur) => (next + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-advance, restarted whenever the slide changes so a manual click
  // gives you a full interval rather than a stub of one.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    timer.current = setTimeout(() => go(idx + 1), 6000);
    return () => clearTimeout(timer.current);
  }, [idx, go]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const active = scope.current.querySelector("[data-slide-active]");
      if (!active) return;

      gsap.fromTo(
        active.querySelectorAll("[data-slide-anim]"),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.08, ease: "expo.out" }
      );

      // Slow push-in on the photo so the banner never feels static.
      const photo = active.querySelector("[data-slide-photo]");
      if (photo) {
        gsap.fromTo(photo, { scale: 1.08 }, { scale: 1, duration: 6.5, ease: "none" });
      }
    },
    { dependencies: [idx], scope }
  );

  const slide = SLIDES[idx];
  const t = TONE[slide.tone];

  return (
    <section ref={scope} className="bg-shell">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-8">
        <div
          data-slide-active
          key={idx}
          className="relative min-h-[400px] overflow-hidden rounded-2xl lg:min-h-[470px]"
          style={{ backgroundColor: slide.scrim }}
        >
          <div data-slide-photo className="absolute inset-0">
            <Image
              src={slide.image}
              alt=""
              fill
              priority={idx === 0}
              sizes="(max-width: 1600px) 100vw, 1600px"
              className="object-cover object-right"
            />
          </div>

          {/* Scrim — every plate puts its subject right of centre, so the copy
              side is washed hardest and the product itself stays visible. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, ${slide.scrim} 0%, ${slide.scrim}e0 40%, ${slide.scrim}00 80%)`,
            }}
          />
          {/* On narrow screens the copy sits over the subject itself, so the
              whole plate needs knocking back. */}
          <div
            className="absolute inset-0 lg:hidden"
            style={{ backgroundColor: `${slide.scrim}bb` }}
          />

          <div className="relative grid h-full items-center gap-6 px-6 py-12 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
            <div className="max-w-xl">
              <span
                data-slide-anim
                className={`mb-5 inline-block rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] ${t.kicker}`}
              >
                {slide.kicker}
              </span>

              <h2
                data-slide-anim
                className={`max-w-xl font-display text-[clamp(2rem,4.8vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] ${t.title}`}
              >
                <Headline
                  title={slide.title}
                  accent={slide.accent}
                  color={slide.accentColor}
                />
              </h2>

              <p
                data-slide-anim
                className={`mt-4 max-w-lg text-sm leading-relaxed sm:text-base ${t.sub}`}
              >
                {slide.sub}
              </p>

              <Link
                data-slide-anim
                href={slide.href}
                className={`mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-extrabold transition-all duration-300 hover:-translate-y-0.5 ${t.cta}`}
              >
                {slide.cta}
                <CaretRight size={15} weight="bold" />
              </Link>
            </div>
          </div>

          {/* ── Controls ── */}
          <button
            onClick={() => go(idx - 1)}
            aria-label="Previous banner"
            className={`absolute left-0 top-1/2 grid h-16 w-9 -translate-y-1/2 place-items-center rounded-r-md transition-colors ${t.arrow}`}
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <button
            onClick={() => go(idx + 1)}
            aria-label="Next banner"
            className={`absolute right-0 top-1/2 grid h-16 w-9 -translate-y-1/2 place-items-center rounded-l-md transition-colors ${t.arrow}`}
          >
            <CaretRight size={20} weight="bold" />
          </button>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                onClick={() => go(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? `w-7 ${t.dotOn}` : `w-1.5 ${t.dotOff}`
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
