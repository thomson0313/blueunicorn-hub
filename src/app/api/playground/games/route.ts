import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getHiddenPlaygroundGames } from "@/lib/repo";
import { GAME_REGISTRY } from "@/lib/games/registry";
import { requireUser, handleError } from "@/lib/api-guard";

/** GET /api/playground/games — enabled game ids for the current member. */
export async function GET() {
  try {
    await requireUser();
    await connectDB();
    const hidden = new Set(await getHiddenPlaygroundGames());
    const enabled = GAME_REGISTRY.filter((g) => !hidden.has(g.id)).map((g) => g.id);
    return NextResponse.json({ games: enabled });
  } catch (err) {
    return handleError(err);
  }
}
