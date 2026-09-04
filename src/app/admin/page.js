import { Suspense } from "react";
import AdminClient from "@/components/admin/AdminClient";

export const metadata = { title: "Admin panel — OROS" };

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-sm text-ink-3">
          Loading…
        </div>
      }
    >
      <AdminClient />
    </Suspense>
  );
}
