"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PaperPlaneRight,
  Paperclip,
  DownloadSimple,
  ShieldCheck,
  ArrowRight,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import { updateQuotation } from "@/api/quotation.api";
import { createQuotationOrder } from "@/api/order.api";
import { payForOrder } from "@/lib/razorpay";
import { useUser } from "@/store/authStore";

const STATUS_TONE = {
  PENDING: "bg-gold-lt text-gold-dk",
  IN_REVIEW: "bg-gold-lt text-gold-dk",
  QUOTED: "bg-neon/15 text-neon",
  ACCEPTED: "bg-leaf-lt text-leaf",
  CONVERTED: "bg-leaf-lt text-leaf",
  REJECTED: "bg-flame-lt text-flame",
  EXPIRED: "bg-canvas text-ink-3",
  CANCELLED: "bg-flame-lt text-flame",
};

const STATUS_NOTE = {
  PENDING: "Sent to the desk. You'll get a price here once they've reviewed it.",
  IN_REVIEW: "The desk is working on your numbers.",
  QUOTED:
    "The desk has priced this. Talk it through below — they'll mark it accepted when it's final.",
  ACCEPTED: "This quote is final. Pay below to turn it into an order.",
  CONVERTED: "Converted to an order.",
  REJECTED: "The desk couldn't take this one on.",
  EXPIRED: "This quote lapsed. Start a new request if you still need it.",
  CANCELLED: "You cancelled this request.",
};

const CANCELLABLE = ["PENDING", "IN_REVIEW", "QUOTED"];

// Cloudinary serves files inline by default, so a plain <a download> is
// ignored for these cross-origin URLs — the browser just opens the file
// instead of saving it. Inserting fl_attachment makes Cloudinary itself
// send Content-Disposition: attachment, which actually forces the save.
function withAttachmentFlag(url) {
  if (!url) return url;
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1 || url.includes("fl_attachment")) return url;
  return `${url.slice(0, i + marker.length)}fl_attachment/${url.slice(i + marker.length)}`;
}

/**
 * One quotation, end to end: the desk's pricing, the running conversation,
 * and — once the desk marks it ACCEPTED — the button that pays for it and
 * turns it into an order. `onChange` should re-fetch and hand back a fresh
 * copy of this quotation.
 */
export default function QuotationThread({
  quotation: q,
  productMap,
  onChange,
}) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [payErr, setPayErr] = useState("");
  const [paying, setPaying] = useState(false);
  const fileRef = useRef(null);

  const messages = useMemo(
    () =>
      [...(q.messages || [])].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    [q.messages]
  );

  const priced =
    (q.total || 0) > 0 ||
    ["QUOTED", "ACCEPTED", "CONVERTED"].includes(q.status);

  const expired =
    q.validTill && new Date(q.validTill).getTime() < Date.now();

  const itemName = (it) => {
    const p = productMap?.get?.(String(it.product));
    if (p) return p.name;
    return it.product ? "Catalogue item" : "Custom item";
  };

  const send = async () => {
    if (!text.trim() && files.length === 0) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("message", text.trim());
      for (const f of files) fd.append("files", f);
      await updateQuotation(q._id, fd);
      setText("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      await onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this quotation request?")) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("status", "CANCELLED");
      await updateQuotation(q._id, fd);
      await onChange?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setPayErr("");
    setPaying(true);
    try {
      const { order } = await createQuotationOrder(q._id);
      await payForOrder(order, {
        name: q.shippingAddress?.name || q.name || user?.name,
        contact: q.shippingAddress?.phone || q.phone,
        email: q.email || user?.email,
      });
      await onChange?.();
    } catch (e) {
      // the order is created before payment — a dismissed widget leaves it
      // waiting in My Orders
      setPayErr(
        e.message === "Payment cancelled"
          ? "Payment cancelled. Your order is waiting in My Orders — you can finish paying there."
          : e.message
      );
      await onChange?.();
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-base font-extrabold text-ink">
            {q.refNumber}
            <span className="ml-2 text-xs font-bold uppercase tracking-wider text-ink-4">
              {q.type}
            </span>
          </p>
          <p className="text-xs text-ink-3">
            {new Date(q.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {q.version > 1 ? ` · rev ${q.version}` : ""}
          </p>
        </div>
        <span
          className={`rounded px-2.5 py-1 text-[11px] font-bold ${
            STATUS_TONE[q.status] || "bg-canvas text-ink-2"
          }`}
        >
          {q.status?.replace(/_/g, " ")}
        </span>
      </div>

      <p className="rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink-2">
        {STATUS_NOTE[q.status] || ""}
      </p>

      {/* ── line items (amounts appear only once the desk has priced them) ── */}
      {(q.items || []).length > 0 && (
        <div className="space-y-1.5">
          {q.items.map((it) => {
            const lineAmount = it.amount || (it.unitPrice ? it.unitPrice * it.qty : 0);
            return (
              <div
                key={it._id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-ink-2">
                  {itemName(it)}
                  {/* a custom item with no catalogue product carries a
                      placeholder qty, not a real one — don't show it */}
                  {it.product ? ` × ${it.qty}` : ""}
                </span>
                {lineAmount > 0 && (
                  <span className="font-semibold text-ink">
                    {formatINR(lineAmount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {q.requirements && (
        <p className="whitespace-pre-line rounded-lg border border-line bg-shell px-3 py-2 text-xs text-ink-2">
          {q.requirements}
        </p>
      )}

      {(q.files || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {q.files.map((f) => (
            <span
              key={f._id}
              className="inline-flex items-center gap-1 rounded-lg border border-line py-1 pl-2.5 pr-1"
            >
              <a
                href={f.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-flame hover:underline"
              >
                <Paperclip size={12} />
                {f.fileName || "file"}
              </a>
              <a
                href={withAttachmentFlag(f.fileUrl)}
                download={f.fileName || true}
                aria-label={`Download ${f.fileName || "file"}`}
                className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-canvas hover:text-ink"
              >
                <DownloadSimple size={12} />
              </a>
            </span>
          ))}
        </div>
      )}

      {/* ── pricing ── */}
      {priced && (
        <dl className="space-y-2 rounded-xl border border-line bg-shell p-4 text-sm">
          <Row label="Subtotal">{formatINR(q.subTotal || 0)}</Row>
          <Row label="Tax">{formatINR(q.tax || 0)}</Row>
          <Row label="Shipping">{formatINR(q.shipping || 0)}</Row>
          <div className="flex items-center justify-between border-t border-dashed border-line pt-2">
            <span className="font-display text-base font-extrabold text-ink">
              Quoted total
            </span>
            <span className="font-display text-lg font-extrabold text-ink">
              {formatINR(q.total || 0)}
            </span>
          </div>
          {q.validTill && (
            <p className="text-[11px] text-ink-3">
              {expired ? "Lapsed on " : "Valid till "}
              {new Date(q.validTill).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </dl>
      )}

      {/* ── conversation ── */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-4">
          Conversation
        </p>
        {messages.length === 0 ? (
          <p className="text-xs text-ink-3">
            No messages yet — ask the desk anything about this quote.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const mine = m.sender === "CUSTOMER";
              return (
                <li
                  key={m._id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "bg-ink text-white"
                        : "border border-line bg-shell text-ink-2"
                    }`}
                  >
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider opacity-60">
                      {mine ? "You" : "OROS desk"}
                    </span>
                    {m.message}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── composer ── */}
      {!["CONVERTED", "REJECTED", "EXPIRED", "CANCELLED"].includes(
        q.status
      ) && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write to the desk…"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-flame"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 hover:border-ink-5"
            >
              <Paperclip size={13} />
              {files.length > 0 ? `${files.length} file(s)` : "Attach"}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) =>
                setFiles(Array.from(e.target.files || []).slice(0, 10))
              }
            />
            <button
              onClick={send}
              disabled={busy || (!text.trim() && files.length === 0)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-flame px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-50"
            >
              <PaperPlaneRight size={13} weight="fill" />
              {busy ? "Sending…" : "Send"}
            </button>
            {CANCELLABLE.includes(q.status) && (
              <button
                onClick={cancel}
                disabled={busy}
                className="ml-auto rounded-lg border border-flame px-3 py-2 text-xs font-bold text-flame transition-colors hover:bg-flame-lt disabled:opacity-50"
              >
                Cancel request
              </button>
            )}
          </div>
          {err && (
            <p className="text-xs font-semibold text-flame">{err}</p>
          )}
        </div>
      )}

      {/* ── pay ── */}
      {q.status === "ACCEPTED" && !expired && (
        <div className="rounded-xl border-2 border-neon bg-neon/10 p-4">
          <p className="text-sm font-bold text-ink">
            This quote is ready to pay
          </p>
          <p className="mt-0.5 text-xs text-ink-2">
            You'll pay {formatINR(q.total || 0)}. We start production once
            payment clears.
          </p>
          <button
            onClick={pay}
            disabled={paying}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
          >
            <ShieldCheck size={16} weight="fill" />
            {paying ? "Processing…" : `Pay ${formatINR(q.total || 0)}`}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-ink-3">
            Secured by Razorpay
          </p>
          {payErr && (
            <p className="mt-2 rounded bg-flame-lt px-3 py-2 text-xs font-semibold text-flame">
              {payErr}
            </p>
          )}
        </div>
      )}

      {q.status === "ACCEPTED" && expired && (
        <p className="rounded-xl bg-flame-lt px-3 py-2 text-xs font-semibold text-flame">
          This quote has lapsed — message the desk to reissue it.
        </p>
      )}

      {q.status === "CONVERTED" && (
        <Link
          href="/account?tab=orders"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-ink-2"
        >
          Track your order
          <ArrowRight size={14} weight="bold" />
        </Link>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}
