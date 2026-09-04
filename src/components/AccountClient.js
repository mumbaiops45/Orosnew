"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SquaresFour,
  Package,
  PencilSimple,
  SignOut,
  UserCircle,
  Check,
} from "@phosphor-icons/react";
import { useAuthStore, useUser } from "@/store/authStore";
import { formatINR } from "@/lib/format";
import * as userApi from "@/api/user.api";
import * as orderApi from "@/api/order.api";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: SquaresFour },
  { id: "orders", label: "My orders", icon: Package },
  { id: "profile", label: "Edit profile", icon: PencilSimple },
];

const STATUS_TONE = {
  PENDING_PAYMENT: "bg-gold-lt text-gold-dk",
  PAID: "bg-leaf-lt text-leaf",
  CONFIRMED: "bg-leaf-lt text-leaf",
  PROCESSING: "bg-sky-lt text-sky",
  IN_PRODUCTION: "bg-sky-lt text-sky",
  COMPLETED: "bg-leaf-lt text-leaf",
  CANCELLED: "bg-flame-lt text-flame",
};

export default function AccountClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") || "dashboard";

  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const { user, firstName, greeting } = useUser();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // gate — no token, no account
  useEffect(() => {
    if (hydrated && !token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      router.replace("/");
    }
  }, [hydrated, token, router]);

  useEffect(() => {
    if (!token) return;
    orderApi
      .getMyOrders()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.orders || [];
        setOrders(list);
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [token]);

  const stats = useMemo(() => {
    const paid = orders.filter((o) =>
      ["PAID", "CONFIRMED", "PROCESSING", "IN_PRODUCTION", "COMPLETED"].includes(
        o.status
      )
    );
    const spent = paid.reduce((n, o) => n + (o.pricing?.total || 0), 0);
    return { total: orders.length, paid: paid.length, spent };
  }, [orders]);

  const go = (id) =>
    router.push(id === "dashboard" ? "/account" : `/account?tab=${id}`);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-6">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-canvas text-ink">
          {user?.profileImage ? (
            <Image
              src={user.profileImage}
              alt={firstName}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-xl font-extrabold">
              {firstName.charAt(0).toUpperCase() || <UserCircle size={26} />}
            </span>
          )}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            {greeting}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {user?.name || firstName}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ── side nav ── */}
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                tab === id
                  ? "bg-ink text-white"
                  : "text-ink-2 hover:bg-canvas"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-flame transition-colors hover:bg-flame-lt"
          >
            <SignOut size={16} />
            Sign out
          </button>
        </nav>

        {/* ── panel ── */}
        <div>
          {tab === "dashboard" && (
            <Dashboard stats={stats} orders={orders} loading={ordersLoading} onGo={go} />
          )}
          {tab === "orders" && (
            <Orders orders={orders} loading={ordersLoading} />
          )}
          {tab === "profile" && <ProfileForm />}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-shell p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink">
        {value}
      </p>
    </div>
  );
}

function Dashboard({ stats, orders, loading, onGo }) {
  const recent = orders.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Orders" value={stats.total} />
        <Card label="Paid" value={stats.paid} />
        <Card label="Total spent" value={formatINR(stats.spent)} />
      </div>

      <div className="rounded-xl border border-line bg-shell">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-2">
            Recent orders
          </h2>
          <button
            onClick={() => onGo("orders")}
            className="text-xs font-bold text-flame hover:underline"
          >
            View all
          </button>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-ink-3">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-3">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((o) => (
              <OrderRow key={o._id} order={o} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Orders({ orders, loading }) {
  if (loading)
    return <p className="text-sm text-ink-3">Loading your orders…</p>;
  if (orders.length === 0)
    return (
      <div className="rounded-xl border border-line bg-shell px-6 py-16 text-center">
        <p className="font-display text-lg font-extrabold text-ink">
          No orders yet
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-md bg-flame px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-flame-dk"
        >
          Start shopping
        </Link>
      </div>
    );
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o._id} className="rounded-xl border border-line bg-shell">
          <OrderRow order={o} expanded />
        </li>
      ))}
    </ul>
  );
}

function OrderRow({ order, expanded = false }) {
  const items = order.items || [];
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">
            #{String(order._id).slice(-8).toUpperCase()}
          </p>
          <p className="text-xs text-ink-3">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {items.reduce((n, i) => n + (i.qty || 0), 0)} item(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded px-2 py-1 text-[11px] font-bold ${
              STATUS_TONE[order.status] || "bg-canvas text-ink-2"
            }`}
          >
            {order.status?.replace(/_/g, " ")}
          </span>
          <span className="font-display text-base font-extrabold text-ink">
            {formatINR(order.pricing?.total || 0)}
          </span>
        </div>
      </div>

      {expanded && items.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {items.map((it) => (
            <li
              key={it._id}
              className="flex items-center justify-between text-xs text-ink-2"
            >
              <span className="truncate">
                {it.nameSnapshot} × {it.qty}
              </span>
              <span className="font-semibold">{formatINR(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}
      {expanded && order.payment?.status && (
        <p className="mt-2 text-[11px] text-ink-3">
          Payment: {order.payment.status}
          {order.payment.transactionId
            ? ` · ${order.payment.transactionId}`
            : ""}
        </p>
      )}
    </div>
  );
}

function ProfileForm() {
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ name: "", email: "" });
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    userApi
      .getProfile()
      .then(({ user }) => {
        setForm({ name: user.name || "", email: user.email || "" });
        setPreview(user.profileImage || null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (file) fd.append("profileImage", file);
      const { user } = await userApi.updateProfile(fd);
      setUser(user);
      setPreview(user.profileImage || preview);
      setFile(null);
      setMsg("Profile updated");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-sm text-ink-3">Loading…</p>;

  return (
    <form
      onSubmit={submit}
      className="max-w-md space-y-4 rounded-xl border border-line bg-shell p-5"
    >
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-canvas">
          {preview ? (
            <Image
              src={preview}
              alt="Profile"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircle size={30} className="text-ink-3" />
          )}
        </span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 hover:border-ink-5"
        >
          Change photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }
          }}
        />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
          Name
        </span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="h-11 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
          Email
        </span>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="h-11 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
        />
      </label>

      {err && <p className="text-xs font-semibold text-flame">{err}</p>}
      {msg && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
          <Check size={13} weight="bold" /> {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-flame px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
