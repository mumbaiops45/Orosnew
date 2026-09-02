import { Suspense } from "react";
import ShopClient from "@/components/ShopClient";

export const metadata = {
  title: "Shop all products — OROS",
  description:
    "Browse 3D printed figurines, lighting, desk storage, decor and seasonal pieces. Filter by category, material, colour and price.",
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-20 text-sm text-ink-3 lg:px-6">
          Loading products…
        </div>
      }
    >
      <ShopClient />
    </Suspense>
  );
}
