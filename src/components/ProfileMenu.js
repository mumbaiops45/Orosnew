"use client";

import { useEffect, useRef, useState } from "react";
import { UserCircle, CaretDown, SignOut, PencilSimple } from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useUser } from "@/context/UserContext";

/**
 * Header identity. Signed out it is a Login button; signed in it becomes
 * "Hey Harish / Good morning" with a small menu.
 *
 * There is no auth backend yet, so "logging in" is completing a profile —
 * the name is captured once and kept in localStorage.
 */
export default function ProfileMenu() {
  const { isSignedIn, firstName, initial, greeting, signIn, signOut } = useUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const wrap = useRef(null);
  const greetRef = useRef(null);

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Greet on arrival, once the name is known.
  useGSAP(
    () => {
      if (!isSignedIn || !greetRef.current || prefersReducedMotion()) return;
      gsap.fromTo(
        greetRef.current,
        { autoAlpha: 0, x: 10 },
        { autoAlpha: 1, x: 0, duration: 0.6, ease: "expo.out" }
      );
    },
    { dependencies: [isSignedIn, firstName] }
  );

  const submit = (e) => {
    e.preventDefault();
    signIn(name, phone);
    setModalOpen(false);
    setName("");
    setPhone("");
  };

  return (
    <>
      <div ref={wrap} className="relative">
        {isSignedIn ? (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-neon/50 text-neon-2"
              title={initial}
            >
              <UserCircle size={20} />
            </span>
            <span ref={greetRef} className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-white">
                Hey {firstName}
              </span>
              <span className="block text-[11px] font-medium text-white/50">
                {greeting}
              </span>
            </span>
            <CaretDown
              size={13}
              className={`hidden text-white/45 transition-transform duration-300 sm:block ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-neon/50 text-neon-2">
              <UserCircle size={20} />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-white">Login</span>
              <span className="block text-[11px] text-white/50">Your account</span>
            </span>
          </button>
        )}

        {/* ── Menu ── */}
        {menuOpen && isSignedIn && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-shell shadow-[0_18px_40px_-16px_rgba(43,27,77,0.45)]"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-bold text-ink">Hey {firstName}</p>
              <p className="text-xs text-ink-3">{greeting} — good to see you</p>
            </div>
            <button
              role="menuitem"
              onClick={() => {
                setName(firstName);
                setMenuOpen(false);
                setModalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-canvas hover:text-ink"
            >
              <PencilSimple size={15} />
              Edit profile
            </button>
            <button
              role="menuitem"
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 border-t border-line px-4 py-3 text-sm font-semibold text-flame transition-colors hover:bg-flame-lt"
            >
              <SignOut size={15} />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* ── Profile modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Complete your profile"
            className="w-full max-w-sm rounded-2xl bg-shell p-6 shadow-2xl"
          >
            <h2 className="font-display text-xl font-extrabold text-ink">
              Complete your profile
            </h2>
            <p className="mt-1.5 text-sm text-ink-3">
              Tell us your name so we can greet you properly and keep your
              orders together.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
                  Your name
                </span>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Harish"
                  className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none transition-colors focus:border-flame"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
                  Mobile <span className="font-medium normal-case">(optional)</span>
                </span>
                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  inputMode="numeric"
                  placeholder="9876543210"
                  className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none transition-colors focus:border-flame"
                />
              </label>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-line py-3 text-sm font-bold text-ink-2 transition-colors hover:border-ink-5"
                >
                  Not now
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-lg bg-flame py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
                >
                  Save & continue
                </button>
              </div>
            </form>

            <p className="mt-4 text-center text-[11px] text-ink-4">
              Stored on this device only — no account is created yet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
