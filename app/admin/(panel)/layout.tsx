import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration Léman" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("dashboard.view");
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.status, "pending"));
  return (
    <AdminShell user={user} pendingCount={Number(n)}>
      {children}
    </AdminShell>
  );
}
