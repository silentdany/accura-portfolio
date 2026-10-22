import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/require-session";
import { errorMessage } from "@/lib/http";
import { enrichNextQueued, queueForceEnrich } from "@/lib/enrich-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One enrich step per request. The admin loops. A dead call returns JSON, it does not reload the page. */
export async function POST(req: Request) {
  const session = await getServerSession().catch(() => null);
  if (!session) return Response.json({ error: "Session expirée. Recharge la page et reconnecte-toi." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  try {
    if (body.action === "start") {
      const queued = await queueForceEnrich();
      return Response.json({ ok: true, queued, message: queued ? `${queued} projets en file` : "Aucun projet à enrichir." });
    }
    const step = await enrichNextQueued();
    if (step.enriched) revalidatePath("/", "layout");
    return Response.json({ ok: true, ...step });
  } catch (err) {
    return Response.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
