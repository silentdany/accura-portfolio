import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bearerOrSecret } from "@/lib/api-auth";
import { env } from "@/lib/env";
import { runSync, SyncBusy } from "@/lib/sync";
import { errorMessage } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Weekly Vercel Cron (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  if (!bearerOrSecret(req, env.cronSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const stats = await runSync("cron");
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: err instanceof SyncBusy ? 409 : 500 });
  }
}
