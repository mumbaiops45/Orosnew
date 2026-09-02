"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const UserContext = createContext(null);
const STORAGE_KEY = "oros.profile.v1";

/** Time-of-day greeting, computed on the client only. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);

  // `hydrated` keeps the first client render identical to the server's — the
  // profile lives in localStorage and the greeting depends on the clock, so
  // rendering either during SSR would guarantee a hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.name) setProfile(saved);
    } catch {}
    setGreeting(greetingFor());
    setHydrated(true);
  }, []);

  // Keep the greeting honest if the tab is left open across a boundary.
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => setGreeting(greetingFor()), 60_000);
    return () => clearInterval(id);
  }, [hydrated]);

  const signIn = useCallback((name, phone = "") => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return;
    const next = { name: clean, phone };
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const signOut = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value = useMemo(() => {
    const firstName = profile?.name?.split(" ")[0] || "";
    return {
      profile,
      hydrated,
      greeting,
      firstName,
      initial: firstName.charAt(0).toUpperCase(),
      // Only treat someone as signed in once we have actually read storage,
      // so the header never flashes a greeting for the wrong person.
      isSignedIn: hydrated && !!profile?.name,
      signIn,
      signOut,
    };
  }, [profile, hydrated, greeting, signIn, signOut]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
};
