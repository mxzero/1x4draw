import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { GameError, seatNextPlayer } from "@/lib/game";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { tableId?: string };
    if (!body.tableId) throw new GameError("tableId is required", "INVALID");
    const result = await seatNextPlayer(admin.id, body.tableId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
