import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getHiddenPlaygroundGames, setPlaygroundGameHidden } from "@/lib/repo";
import { GAME_REGISTRY, isGameId } from "@/lib/games/registry";
import { requireAdmin, handleError } from "@/lib/api-guard";

/** GET /api/admin/playground/games — all games with their enabled state. */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    const hidden = new Set(await getHiddenPlaygroundGames());
    const games = GAME_REGISTRY.map((g) => ({
      id: g.id,
      title: g.title,
      tagline: g.tagline,
      emoji: g.emoji,
      enabled: !hidden.has(g.id),
    }));
    return NextResponse.json({ games });
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

/** PATCH /api/admin/playground/games — toggle a game's visibility for members. */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success || !isGameId(parsed.data.id)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    await connectDB();
    await setPlaygroundGameHidden(parsed.data.id, !parsed.data.enabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
