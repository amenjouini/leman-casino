import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { occupiedSeats } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/** Occupied seats of a published tournament (no personal data). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const db = await getDb();
  const [t] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(and(eq(tournaments.id, id), eq(tournaments.status, "published")))
    .limit(1);
  if (!t) return NextResponse.json({ error: "Tournoi introuvable." }, { status: 404 });
  return NextResponse.json({ occupied: await occupiedSeats(id) }, { headers: { "Cache-Control": "no-store" } });
}
