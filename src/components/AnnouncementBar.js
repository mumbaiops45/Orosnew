import Link from "next/link";
import { Tag } from "@phosphor-icons/react/ssr";
import { formatINR } from "@/lib/format";
import { fetchCoupons } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function label(c) {
  const off =
    c.discountType === "PERCENTAGE"
      ? `${c.discountValue}% OFF`
      : `${formatINR(c.discountValue)} OFF`;
  return `${off} with ${c.code}`;
}

export default async function AnnouncementBar() {
  const coupons = await fetchCoupons();

  if (coupons.length === 0) {
    return (
      <div className="bg-night text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 py-2.5 text-xs lg:px-8">
          <Link href="/bulk" className="group flex items-center gap-2.5">
            <Tag size={16} className="text-neon" weight="bold" />
            <span className="font-bold text-white group-hover:text-neon-2">
              Bulk Orders. Bigger Savings.
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-night text-white">
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 overflow-x-auto px-4 py-2.5 text-xs lg:justify-center lg:px-8 no-scrollbar">
        {coupons.slice(0, 6).map((c) => (
          <span
            key={c._id || c.code}
            className="flex shrink-0 items-center gap-2 font-bold text-white"
          >
            <Tag size={14} weight="fill" className="text-neon-2" />
            {label(c)}
            {c.minOrderValue > 0 && (
              <span className="font-medium text-white/55">
                on orders over {formatINR(c.minOrderValue)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
