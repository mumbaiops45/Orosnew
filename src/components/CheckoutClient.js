"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  CaretRight,
  MapPin,
  Tag,
  ShoppingCart,
  X,
} from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatINR } from "@/lib/format";
import * as addressApi from "@/api/address.api";
import * as couponApi from "@/api/coupon.api";
import * as shippingApi from "@/api/shipping.api";
import * as orderApi from "@/api/order.api";
import * as paymentApi from "@/api/payment.api";

const RZP_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = RZP_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const EMPTY_ADDRESS = {
  name: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
};

export default function CheckoutClient() {
  const { lines, count, subtotal, savings, clear } = useCart();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState(null);

  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, discount, finalAmount }
  const [couponErr, setCouponErr] = useState("");
  const [showCoupons, setShowCoupons] = useState(false);
  const [available, setAvailable] = useState([]);

  const [shipping, setShipping] = useState(null); // { quoteId, rates }
  const [courierId, setCourierId] = useState(null);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

  // prefill from the saved address
  useEffect(() => {
    if (!token) return;
    addressApi
      .getAddress()
      .then(({ address }) => {
        if (address) {
          setSavedAddress(address);
          setAddress((a) => ({ ...EMPTY_ADDRESS, ...address }));
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (user) {
      setAddress((a) => ({
        ...a,
        name: a.name || user.name || "",
        phone: a.phone || user.phone || "",
      }));
    }
  }, [user]);

  const selectedRate = useMemo(
    () =>
      shipping?.rates?.find(
        (r) => Number(r.courierId) === Number(courierId)
      ) || null,
    [shipping, courierId]
  );

  const deliveryCharge = selectedRate?.totalCharge ?? 0;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryCharge - discount);

  if (placed) return <OrderPlaced order={placed} />;
  if (lines.length === 0) return <EmptyState />;

  const useSaved = () => {
    if (savedAddress) setAddress({ ...EMPTY_ADDRESS, ...savedAddress });
  };

  const applyCoupon = async (code = couponCode) => {
    const c = (code || "").trim().toUpperCase();
    setCouponErr("");
    if (!c) return;
    try {
      const data = await couponApi.validateCoupon(c, subtotal);
      setCoupon({ code: c, ...data });
      setCouponCode(c);
      setShowCoupons(false);
    } catch (e) {
      setCoupon(null);
      setCouponErr(e.message);
    }
  };

  const toggleCoupons = async () => {
    const next = !showCoupons;
    setShowCoupons(next);
    if (next && available.length === 0) {
      try {
        const { coupons } = await couponApi.listCoupons({ limit: 50 });
        const now = Date.now();
        setAvailable(
          (coupons || []).filter(
            (x) =>
              x.isActive !== false &&
              (!x.endDate || new Date(x.endDate).getTime() >= now)
          )
        );
      } catch {}
    }
  };

  const addressComplete = [
    "name",
    "phone",
    "addressLine1",
    "city",
    "state",
    "country",
    "pincode",
  ].every((k) => address[k]?.toString().trim());

  const fetchRates = async () => {
    setError("");
    if (!/^\d{6}$/.test(address.pincode))
      throw new Error("Enter a valid 6-digit pincode");
    await addressApi.saveAddress(address);
    const data = await shippingApi.getShippingRates({
      deliveryPincode: address.pincode,
    });
    setShipping(data);
    const cheapest = [...(data.rates || [])].sort(
      (a, b) => (a.totalCharge || 0) - (b.totalCharge || 0)
    )[0];
    setCourierId(cheapest ? cheapest.courierId : null);
    return { data, courier: cheapest?.courierId };
  };

  const payNow = async () => {
    setError("");
    if (!token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return;
    }
    if (!addressComplete) {
      setError("Please complete the delivery address");
      return;
    }
    setPlacing(true);
    try {
      // 1. address + shipping rate
      let quoteId = shipping?.quoteId;
      let courier = courierId;
      if (!quoteId || !courier) {
        const r = await fetchRates();
        quoteId = r.data.quoteId;
        courier = r.courier;
      }
      if (!quoteId || !courier)
        throw new Error("No delivery option available for this pincode");

      // 2. order
      const { order } = await orderApi.createOrder({
        shippingQuoteId: quoteId,
        shippingCourierId: courier,
        couponCode: coupon?.code || undefined,
      });

      // 3. razorpay order
      const rzpOrder = await paymentApi.createPaymentOrder(order._id);

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load the payment gateway");

      // 4. open checkout
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || "INR",
          name: "OROS",
          description: `Order ${order._id}`,
          prefill: {
            name: address.name,
            contact: address.phone,
            email: user?.email || "",
          },
          theme: { color: "#ff5a2c" },
          handler: async (resp) => {
            try {
              await paymentApi.verifyPayment({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        rzp.open();
      });

      clear();
      setPlaced({
        id: order._id,
        total: order.pricing?.total ?? total,
        count,
        name: address.name,
        pin: address.pincode,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
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
          {/* ── Address ── */}
          <section className="rounded-lg border border-line bg-shell p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
                <MapPin size={15} /> Delivery address
              </h2>
              {savedAddress && (
                <button
                  onClick={useSaved}
                  className="rounded-lg border border-flame px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt"
                >
                  Use current address
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Full name"
                value={address.name}
                onChange={(v) => setAddress({ ...address, name: v })}
              />
              <Field
                label="Phone"
                value={address.phone}
                inputMode="numeric"
                onChange={(v) =>
                  setAddress({
                    ...address,
                    phone: v.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
              <div className="sm:col-span-2">
                <Field
                  label="Address line 1"
                  value={address.addressLine1}
                  onChange={(v) =>
                    setAddress({ ...address, addressLine1: v })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Address line 2 (optional)"
                  required={false}
                  value={address.addressLine2}
                  onChange={(v) =>
                    setAddress({ ...address, addressLine2: v })
                  }
                />
              </div>
              <Field
                label="Landmark (optional)"
                required={false}
                value={address.landmark}
                onChange={(v) => setAddress({ ...address, landmark: v })}
              />
              <Field
                label="City"
                value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })}
              />
              <Field
                label="State"
                value={address.state}
                onChange={(v) => setAddress({ ...address, state: v })}
              />
              <Field
                label="Country"
                value={address.country}
                onChange={(v) => setAddress({ ...address, country: v })}
              />
              <Field
                label="Pincode"
                value={address.pincode}
                inputMode="numeric"
                onChange={(v) =>
                  setAddress({
                    ...address,
                    pincode: v.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />
            </div>

            {shipping?.rates?.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-4">
                  Delivery option
                </p>
                <div className="space-y-2">
                  {shipping.rates.map((r) => (
                    <label
                      key={r.courierId}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                        Number(courierId) === Number(r.courierId)
                          ? "border-flame bg-flame-lt"
                          : "border-line hover:border-ink-5"
                      }`}
                    >
                      <input
                        type="radio"
                        name="courier"
                        checked={Number(courierId) === Number(r.courierId)}
                        onChange={() => setCourierId(r.courierId)}
                        className="h-4 w-4 accent-flame"
                      />
                      <span className="flex-1 font-semibold text-ink">
                        {r.courierName}
                      </span>
                      <span className="font-bold text-ink">
                        {formatINR(r.totalCharge)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Items ── */}
          <section className="rounded-lg border border-line bg-shell p-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-ink-2">
              Order summary ({count} item{count === 1 ? "" : "s"})
            </h2>
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
                    <p className="line-clamp-1 text-sm font-bold text-ink">
                      {l.product.name}
                    </p>
                    <p className="text-xs text-ink-3">
                      {l.variantLabel ? `${l.variantLabel} · ` : ""}Qty {l.qty}
                    </p>
                  </div>
                  <p className="font-display text-sm font-extrabold text-ink">
                    {formatINR(l.lineTotal)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Coupon ── */}
          <section className="rounded-lg border border-line bg-shell p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
              <Tag size={15} /> Coupon
            </h2>

            {coupon ? (
              <div className="flex items-center justify-between rounded-md border border-leaf/40 bg-leaf-lt px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-leaf">
                    {coupon.code} applied
                  </p>
                  <p className="text-xs text-ink-3">
                    You save {formatINR(coupon.discount)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponCode("");
                  }}
                  className="text-ink-3 hover:text-flame"
                  aria-label="Remove coupon"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter code"
                    className="h-11 flex-1 rounded-md border border-line px-3.5 text-sm font-bold uppercase text-ink outline-none focus:border-flame"
                  />
                  <button
                    onClick={() => applyCoupon()}
                    className="rounded-md bg-ink px-5 text-sm font-extrabold text-white transition-colors hover:bg-ink-2"
                  >
                    Apply
                  </button>
                </div>
                {couponErr && (
                  <p className="mt-2 text-xs font-semibold text-flame">
                    {couponErr}
                  </p>
                )}
              </>
            )}

            <button
              onClick={toggleCoupons}
              className="mt-3 text-xs font-bold text-flame hover:underline"
            >
              {showCoupons ? "Hide" : "See available coupons"}
            </button>

            {showCoupons && (
              <ul className="mt-3 space-y-2">
                {available.length === 0 && (
                  <li className="text-xs text-ink-3">No coupons right now.</li>
                )}
                {available.map((c) => (
                  <li
                    key={c._id || c.code}
                    className="flex items-center justify-between rounded-md border border-dashed border-flame/40 bg-flame-lt px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-flame">
                        {c.code}
                      </p>
                      <p className="text-[11px] text-ink-3">
                        {c.discountType === "PERCENTAGE"
                          ? `${c.discountValue}% off`
                          : `${formatINR(c.discountValue)} off`}
                        {c.minOrderValue > 0
                          ? ` · min ${formatINR(c.minOrderValue)}`
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => applyCoupon(c.code)}
                      className="rounded bg-flame px-3 py-1.5 text-[11px] font-extrabold uppercase text-white hover:bg-flame-dk"
                    >
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Price panel ── */}
        <aside className="lg:sticky lg:top-[99px] lg:self-start">
          <div className="rounded-lg border border-line bg-shell">
            <h2 className="border-b border-line px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-4">
              Price details
            </h2>
            <div className="space-y-3 px-5 py-4 text-sm">
              <Row label={`Price (${count} item${count === 1 ? "" : "s"})`}>
                {formatINR(subtotal + savings)}
              </Row>
              {savings > 0 && (
                <Row label="Item savings" accent>
                  − {formatINR(savings)}
                </Row>
              )}
              {discount > 0 && (
                <Row label={`Coupon ${coupon.code}`} accent>
                  − {formatINR(discount)}
                </Row>
              )}
              <Row label="Delivery" accent={selectedRate && deliveryCharge === 0}>
                {selectedRate
                  ? deliveryCharge === 0
                    ? "Free"
                    : formatINR(deliveryCharge)
                  : "At payment"}
              </Row>
              <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
                <span className="font-display text-base font-extrabold text-ink">
                  Total payable
                </span>
                <span className="font-display text-xl font-extrabold text-ink">
                  {formatINR(total)}
                </span>
              </div>
            </div>

            <div className="px-5 pb-5">
              {error && (
                <p className="mb-2 rounded bg-flame-lt px-3 py-2 text-xs font-semibold text-flame">
                  {error}
                </p>
              )}
              <button
                onClick={payNow}
                disabled={placing}
                className="w-full rounded-md bg-flame py-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
              >
                {placing
                  ? "Processing…"
                  : token
                    ? `Pay ${formatINR(total)} with Razorpay`
                    : "Log in to pay"}
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-3">
                Secured by Razorpay. Orders are printed after payment.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = true, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </span>
      <input
        required={required}
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
          Payment successful
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-3">
          Thanks {order.name || ""}. We have queued {order.count} item
          {order.count === 1 ? "" : "s"} for printing and will email tracking as
          soon as it dispatches.
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
            <dt className="text-ink-3">Delivering to</dt>
            <dd className="font-bold text-ink">PIN {order.pin}</dd>
          </div>
        </dl>

        <div className="mt-8 flex gap-3">
          <Link
            href="/account/orders"
            className="rounded-md border border-line px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:border-ink-5"
          >
            View orders
          </Link>
          <Link
            href="/shop"
            className="rounded-md bg-flame px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
          >
            Keep shopping
          </Link>
        </div>
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
