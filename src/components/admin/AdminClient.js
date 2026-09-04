"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChartBar,
  Package,
  CreditCard,
  Cube,
  SquaresFour,
  Stack,
  Tag,
  Users,
  Plus,
  SignOut,
  List,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { useAuthStore, useUser } from "@/store/authStore";
import {
  Overview,
  Orders,
  Payments,
  Products,
  Categories,
  Subcategories,
  Coupons,
  UsersTab,
  ManualOrder,
  Banners,
} from "@/components/admin/tabs";

const TABS = [
  { id: "overview", label: "Overview", icon: ChartBar, Comp: Overview },
  { id: "orders", label: "Orders", icon: Package, Comp: Orders },
  { id: "payments", label: "Payments", icon: CreditCard, Comp: Payments },
  { id: "products", label: "Products", icon: Cube, Comp: Products },
  { id: "categories", label: "Categories", icon: SquaresFour, Comp: Categories },
  { id: "subcategories", label: "Subcategories", icon: Stack, Comp: Subcategories },
  { id: "coupons", label: "Coupons", icon: Tag, Comp: Coupons },
  { id: "users", label: "Users", icon: Users, Comp: UsersTab },
  { id: "manual-order", label: "Manual order", icon: Plus, Comp: ManualOrder },
  { id: "banners", label: "Banners", icon: ImageIcon, Comp: Banners },
];

export default function AdminClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") || "overview";
  const { isAdmin, hydrated, user } = useUser();
  const logout = useAuthStore((s) => s.logout);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !isAdmin) router.replace("/admin/login");
  }, [hydrated, isAdmin, router]);

  if (!hydrated)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-3">
        Loading…
      </div>
    );
  if (!isAdmin) return null;

  const active = TABS.find((t) => t.id === tab) || TABS[0];
  const Comp = active.Comp;

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-line bg-shell transition-transform lg:static lg:flex lg:translate-x-0 ${
          navOpen ? "flex translate-x-0" : "hidden -translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <Image
            src="/brand/oros-logo.jpg"
            alt="OROS"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-display text-base font-extrabold">Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/admin?tab=${id}`}
              onClick={() => setNavOpen(false)}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                tab === id ? "bg-ink text-white" : "text-ink-2 hover:bg-canvas"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <p className="px-3 pb-2 text-xs text-ink-3">{user?.email}</p>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-flame hover:bg-flame-lt"
          >
            <SignOut size={16} /> Sign out
          </button>
          <Link
            href="/"
            className="mt-1 block px-3 py-2 text-xs font-bold text-ink-3 hover:text-ink"
          >
            ← View store
          </Link>
        </div>
      </aside>

      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-shell px-4 py-3 lg:px-8">
          <button
            onClick={() => setNavOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line lg:hidden"
            aria-label="Menu"
          >
            <List size={18} />
          </button>
          <h1 className="font-display text-lg font-extrabold">{active.label}</h1>
        </header>
        <main className="p-4 lg:p-8">
          <Comp />
        </main>
      </div>
    </div>
  );
}
