"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore, useUser } from "@/store/authStore";

export default function AdminLogin() {
  const router = useRouter();
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const loading = useAuthStore((s) => s.loading);
  const { isAdmin, hydrated } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (hydrated && isAdmin) router.replace("/admin");
  }, [hydrated, isAdmin, router]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await adminLogin(email.trim(), password);
      router.replace("/admin");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-shell p-8 shadow-xl"
      >
        <Image
          src="/brand/oros-logo.jpg"
          alt="OROS"
          width={48}
          height={48}
          className="mx-auto h-12 w-12 rounded-xl object-contain"
        />
        <div className="text-center">
          <h1 className="font-display text-xl font-extrabold text-ink">
            Admin panel
          </h1>
          <p className="mt-1 text-sm text-ink-3">Sign in with your credentials</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Password
          </span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
          />
        </label>

        {err && <p className="text-xs font-semibold text-flame">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-flame py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <Link
          href="/"
          className="block text-center text-xs font-bold text-ink-3 hover:text-ink"
        >
          ← Back to store
        </Link>
      </form>
    </div>
  );
}
