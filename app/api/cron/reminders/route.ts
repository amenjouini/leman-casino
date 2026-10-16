import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/email/notifications";

export const dynamic = "force-dynamic";

/**
 * Sends reminder emails. Called by Vercel Cron (see vercel.json) or any scheduler
 * with the header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const result = await sendDueReminders();
  return NextResponse.json(result);
}
