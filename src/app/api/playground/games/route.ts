import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getHiddenPlaygroundGames } from "@/lib/repo";
import { GAME_REGISTRY } from "@/lib/games/registry";
import { requireUser, handleError } from "@/lib/api-guard";

/** GET /api/playground/games — playable game ids. Admins always see every game. */
export async function GET() {
  try {
    const session = await requireUser();
    await connectDB();
    if (session.role === "admin") {
      return NextResponse.json({ games: GAME_REGISTRY.map((g) => g.id) });
    }
    const hidden = new Set(await getHiddenPlaygroundGames());
    const enabled = GAME_REGISTRY.filter((g) => !hidden.has(g.id)).map((g) => g.id);
    return NextResponse.json({ games: enabled });
  } catch (err) {
    return handleError(err);
  }
}
