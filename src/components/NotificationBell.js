"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRinging,
  X,
  FileText,
  Package,
  ChatCircleText,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useUser } from "@/store/authStore";
import { listNotifications } from "@/api/notification.api";

const SEEN_KEY = "oros.notif.seen";
const POLL_MS = 60_000;

const readSeen = () => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};
const writeSeen = (iso) => {
  try {
    localStorage.setItem(SEEN_KEY, iso);
  } catch {}
};

/** Newest createdAt in the list, as an ISO string. */
const newestAt = (items) =>
  items.reduce(
    (max, n) => (n.createdAt && n.createdAt > max ? n.createdAt : max),
    ""
  );

/** icon + where the notification points, keyed off the backend `type` enum.
 *  `referenceId` is the quotation / order id — carried through as `?focus=` so
 *  the target list scrolls to and highlights that exact row. */
function metaFor(type, isAdmin, referenceId) {
  const focus = referenceId ? `&focus=${referenceId}` : "";
  const qs = `${isAdmin ? "/admin" : "/account"}?tab=quotations${focus}`;
  const os = `${isAdmin ? "/admin" : "/account"}?tab=orders${focus}`;
  switch (type) {
    case "ORDER_PAID_AND_PAYMENT_RECEIVED":
      return { Icon: Package, href: os };
    case "QUOTATION_ACCEPTED":
      return { Icon: CheckCircle, href: qs };
    case "QUOTATION_CANCEL":
      return { Icon: XCircle, href: qs };
    case "QUOTATION_MESSAGE":
      return { Icon: ChatCircleText, href: qs };
    case "QUOTATION_FILE":
    case "QUOTATION_CREATED":
    case "QUOTATION":
    default:
      return { Icon: FileText, href: qs };
  }
}

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell() {
  const { isSignedIn, isAdmin } = useUser();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seen, setSeen] = useState(null);

  useEffect(() => {
    setMounted(true);
    setSeen(readSeen());
  }, []);

  const signedIn = mounted && isSignedIn;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // fetch on sign-in, then poll while signed in
  useEffect(() => {
    if (!signedIn) {
      setItems([]);
      return;
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [signedIn, load]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // opening the panel marks everything currently shown as seen
  const openPanel = () => {
    setOpen(true);
    const top = newestAt(items);
    if (top) {
      writeSeen(top);
      setSeen(top);
    }
  };

  const unread = items.filter((n) =>
    seen ? n.createdAt > seen : !n.isRead
  ).length;

  if (!signedIn) return null;

  return (
    <>
      <button
        onClick={openPanel}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        className="relative flex items-center rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
      >
        {unread > 0 ? (
          <BellRinging size={24} className="text-white" weight="fill" />
        ) : (
          <Bell size={24} className="text-white" />
        )}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-neon px-1 text-[10px] font-extrabold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <div
        className="fixed inset-0 z-[76]"
        style={{ pointerEvents: open ? "auto" : "none" }}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-label="Notifications"
          className={`absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col bg-shell shadow-[-16px_0_48px_-16px_rgba(43,27,77,0.4)] transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <header className="flex items-center justify-between border-b border-line px-5 py-5">
            <div>
              <p className="font-display text-lg font-extrabold text-ink">
                Notifications
              </p>
              <p className="text-xs text-ink-3">
                {isAdmin ? "Store activity" : "Updates on your orders & quotes"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
            >
              <X size={18} weight="bold" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-5 py-8 text-sm text-ink-3">Loading…</p>
            ) : error ? (
              <div className="px-5 py-8">
                <p className="text-sm font-semibold text-flame">{error}</p>
                <button
                  onClick={load}
                  className="mt-3 text-xs font-bold text-flame hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="grid place-items-center px-6 py-20 text-center">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-canvas">
                  <Bell size={24} className="text-ink-4" />
                </span>
                <p className="font-display text-base font-extrabold text-ink">
                  You&apos;re all caught up
                </p>
                <p className="mt-1.5 max-w-[220px] text-sm text-ink-3">
                  New updates on your orders and quotations show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => {
                  const { Icon, href } = metaFor(
                    n.type,
                    isAdmin,
                    n.referenceId
                  );
                  const isNew = seen ? n.createdAt > seen : !n.isRead;
                  return (
                    <li key={n._id}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 px-5 py-4 transition-colors hover:bg-canvas ${
                          isNew ? "bg-flame-lt" : ""
                        }`}
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-2">
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-ink-2">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        {isNew && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-flame" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
