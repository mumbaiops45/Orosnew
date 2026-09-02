"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  CaretRight,
  MapPin,
  Package,
  CreditCard,
  DeviceMobile,
  Bank,
  Money,
  ShoppingCart,
} from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { formatINR, colorHex } from "@/lib/products";

const PAYMENTS = [
  { id: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm", icon: DeviceMobile },
  { id: "card", label: "Credit / Debit card", sub: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "netbanking", label: "Net banking", sub: "All major banks", icon: Bank },
  { id: "cod", label: "Cash on delivery", sub: "₹40 handling fee", icon: Money },
];

export default function CheckoutClient() {
  const { lines, count, subtotal, savings, delivery, total, clear } = useCart();

  const [step, setStep] = useState(1);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [address, setAddress] = useState({
    house: "",
    street: "",
    city: "",
    state: "",
    pin: "",
    type: "Home",
  });
  const [payment, setPayment] = useState("upi");
  const [placed, setPlaced] = useState(null);

  const codFee = payment === "cod" ? 40 : 0;
  const payable = total + codFee;

  if (placed) return <OrderPlaced order={placed} />;
  if (lines.length === 0) return <EmptyState />;

  const submitContact = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const submitAddress = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const placeOrder = () => {
    const order = {
      id: `OROS${Date.now().toString().slice(-8)}`,
      total: payable,
      count,
      payment: PAYMENTS.find((p) => p.id === payment)?.label,
      name: contact.name,
      pin: address.pin,
    };
    clear();
    setPlaced(order);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/cart" className="hover:text-flame">
          Cart
        </Link>
        <CaretRight size={12} />
        <span className="font-semibold text-ink">Checkout</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {/* ── 1. Contact ── */}
          <Step
            n={1}
            title="Contact details"
            done={step > 1}
            active={step === 1}
            summary={`${contact.name} · ${contact.phone}`}
            onEdit={() => setStep(1)}
          >
            <form onSubmit={submitContact} className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Full name"
                value={contact.name}
                onChange={(v) => setContact({ ...contact, name: v })}
                placeholder="Aditi Rao"
              />
              <Field
                label="Mobile number"
                value={contact.phone}
                onChange={(v) =>
                  setContact({ ...contact, phone: v.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="9876543210"
                inputMode="numeric"
                pattern="\d{10}"
                title="Enter a 10-digit mobile number"
              />
              <div className="sm:col-span-2">
                <Field
                  label="Email"
                  type="email"
                  value={contact.email}
                  onChange={(v) => setContact({ ...contact, email: v })}
                  placeholder="aditi@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-flame px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
                >
                  Continue
                </button>
              </div>
            </form>
          </Step>

          {/* ── 2. Address ── */}
          <Step
            n={2}
            title="Delivery address"
            icon={MapPin}
            done={step > 2}
            active={step === 2}
            summary={`${address.house}, ${address.city} ${address.pin}`}
            onEdit={() => setStep(2)}
          >
            <form onSubmit={submitAddress} className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Flat / house no, building"
                value={address.house}
                onChange={(v) => setAddress({ ...address, house: v })}
                placeholder="12B, Indira Residency"
              />
              <Field
                label="Area, street"
                value={address.street}
                onChange={(v) => setAddress({ ...address, street: v })}
                placeholder="HSR Layout Sector 2"
              />
              <Field
                label="City"
                value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })}
                placeholder="Bengaluru"
              />
              <Field
                label="State"
                value={address.state}
                onChange={(v) => setAddress({ ...address, state: v })}
                placeholder="Karnataka"
              />
              <Field
                label="PIN code"
                value={address.pin}
                onChange={(v) =>
                  setAddress({ ...address, pin: v.replace(/\D/g, "").slice(0, 6) })
                }
                placeholder="560102"
                inputMode="numeric"
                pattern="\d{6}"
                title="Enter a 6-digit PIN code"
              />

              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-4">
                  Address type
                </p>
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddress({ ...address, type: t })}
                      className={`rounded-md border px-4 py-2 text-xs font-bold transition-colors ${
                        address.type === t
                          ? "border-flame bg-flame-lt text-flame"
                          : "border-line text-ink-2 hover:border-ink-5"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-flame px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
                >
                  Deliver here
                </button>
              </div>
            </form>
          </Step>

          {/* ── 3. Summary ── */}
          <Step
            n={3}
            title="Order summary"
            icon={Package}
            done={step > 3}
            active={step === 3}
            summary={`${count} item${count > 1 ? "s" : ""}`}
            onEdit={() => setStep(3)}
          >
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.key} className="flex items-center gap-3">
                  <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas">
                    <ProductImage
                      src={l.product.image}
                      alt={l.product.name}
                      sizes="56px"
                      overlay
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">{l.product.name}</p>
                    <p className="text-xs text-ink-3">
                      {l.color} · {l.material} · Qty {l.qty}
                    </p>
                  </div>
                  <p className="font-display text-sm font-extrabold text-ink">
                    {formatINR(l.lineTotal)}
                  </p>
                </div>
              ))}
              <button
                onClick={() => setStep(4)}
                className="mt-2 rounded-md bg-flame px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Continue to payment
              </button>
            </div>
          </Step>

          {/* ── 4. Payment ── */}
          <Step n={4} title="Payment" icon={CreditCard} active={step === 4}>
            <div className="space-y-2">
              {PAYMENTS.map(({ id, label, sub, icon: Icon }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-colors ${
                    payment === id
                      ? "border-flame bg-flame-lt"
                      : "border-line hover:border-ink-5"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === id}
                    onChange={() => setPayment(id)}
                    className="h-4 w-4 accent-flame"
                  />
                  <Icon size={18} className="text-ink-2" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink">{label}</span>
                    <span className="block text-xs text-ink-3">{sub}</span>
                  </span>
                </label>
              ))}

              <button
                onClick={placeOrder}
                className="mt-3 w-full rounded-md bg-flame py-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Pay {formatINR(payable)}
              </button>
              <p className="text-center text-[11px] text-ink-3">
                Demo checkout — no payment gateway is connected yet.
              </p>
            </div>
          </Step>
        </div>

        {/* ── Price panel ── */}
        <aside className="lg:sticky lg:top-[99px] lg:self-start">
          <div className="rounded-lg border border-line bg-shell">
            <h2 className="border-b border-line px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-4">
              Price details
            </h2>
            <div className="space-y-3 px-5 py-4 text-sm">
              <Row label={`Price (${count} items)`}>{formatINR(subtotal)}</Row>
              <Row label="Discount" accent>
                − {formatINR(savings)}
              </Row>
              <Row label="Delivery" accent={delivery === 0}>
                {delivery === 0 ? "Free" : formatINR(delivery)}
              </Row>
              {codFee > 0 && <Row label="COD handling">{formatINR(codFee)}</Row>}
              <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
                <span className="font-display text-base font-extrabold text-ink">
                  Total payable
                </span>
                <span className="font-display text-xl font-extrabold text-ink">
                  {formatINR(payable)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────── */

function Step({ n, title, icon: Icon, active, done, summary, onEdit, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-shell">
      <header
        className={`flex items-center gap-3 px-5 py-4 ${
          active ? "bg-ink text-white" : ""
        }`}
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded text-[11px] font-extrabold ${
            active
              ? "bg-white text-ink"
              : done
                ? "bg-leaf text-white"
                : "bg-canvas text-ink-3"
          }`}
        >
          {done ? <Check size={13} weight="bold" /> : n}
        </span>

        <h2
          className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide ${
            active ? "text-white" : "text-ink-2"
          }`}
        >
          {Icon && <Icon size={15} />}
          {title}
        </h2>

        {done && !active && (
          <>
            <span className="ml-2 truncate text-xs text-ink-3">{summary}</span>
            <button
              onClick={onEdit}
              className="ml-auto rounded border border-line px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt"
            >
              Change
            </button>
          </>
        )}
      </header>

      {active && <div className="px-5 py-5">{children}</div>}
    </section>
  );
}

function Field({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </span>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-flame"
        {...rest}
      />
    </label>
  );
}

function Row({ label, children, accent = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3">{label}</span>
      <span className={accent ? "font-bold text-leaf" : "font-semibold text-ink"}>
        {children}
      </span>
    </div>
  );
}

function OrderPlaced({ order }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <div className="grid place-items-center rounded-lg border border-line bg-shell px-6 py-20 text-center">
        <Image
          src="/brand/oros-logo.jpg"
          alt="OROS"
          width={150}
          height={150}
          className="mb-6 h-12 w-12 object-contain"
        />
        <span className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-leaf-lt">
          <Check size={38} className="text-leaf" weight="bold" />
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          Order confirmed
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-3">
          Thanks {order.name || "— your order is in"}. We have queued{" "}
          {order.count} item{order.count > 1 ? "s" : ""} for printing and will
          email tracking as soon as it dispatches.
        </p>

        <dl className="mt-8 grid w-full max-w-md gap-3 rounded-lg border border-line bg-canvas p-5 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-3">Order ID</dt>
            <dd className="font-bold text-ink">{order.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Amount paid</dt>
            <dd className="font-bold text-ink">{formatINR(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Payment method</dt>
            <dd className="font-bold text-ink">{order.payment}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Delivering to</dt>
            <dd className="font-bold text-ink">PIN {order.pin}</dd>
          </div>
        </dl>

        <Link
          href="/shop"
          className="mt-8 rounded-md bg-flame px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
        >
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <div className="grid place-items-center rounded-lg border border-line bg-shell px-6 py-24 text-center">
        <span className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-canvas">
          <ShoppingCart size={32} className="text-ink-4" />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Nothing to check out
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink-3">
          Your cart is empty, so there is nothing to pay for yet.
        </p>
        <Link
          href="/shop"
          className="mt-7 rounded-md bg-flame px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
        >
          Shop now
        </Link>
      </div>
    </div>
  );
}
