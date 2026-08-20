import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { GameError, leaveTable } from "@/lib/game";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as { tableId?: string };
    if (!body.tableId) throw new GameError("tableId is required", "INVALID");
    const result = await leaveTable(user.id, body.tableId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
