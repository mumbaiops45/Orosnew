import Link from "next/link";
import { Package, Truck, ShieldCheck } from "@phosphor-icons/react/ssr";

/**
 * Top strip above the header. Scrolls away — only the header itself sticks,
 * so the sticky chrome stays a manageable height on small screens.
 */
export default function AnnouncementBar() {
  return (
    <div className="bg-night text-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-x-8 gap-y-1 px-4 py-2.5 text-xs lg:justify-between lg:px-8">
        <Link href="/bulk" className="group flex items-center gap-2.5">
          <Package size={16} className="text-neon" weight="bold" />
          <span className="font-bold text-white group-hover:text-neon-2">
            Bulk Orders. Bigger Savings.
          </span>
          <span className="hidden text-white/55 sm:inline">
            Get up to <span className="font-bold text-neon-2">40% OFF</span> on
            orders above 500 units.
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          <span className="flex items-center gap-2 text-white/70">
            <Truck size={16} className="text-white/45" />
            Free shipping on orders above ₹2,000
          </span>
          <span className="h-3.5 w-px bg-white/15" />
          <span className="flex items-center gap-2 text-white/70">
            <ShieldCheck size={16} className="text-white/45" />
            Secure payments
          </span>
        </div>
      </div>
    </div>
  );
}
