import { after } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { continueTableFill, GameError, joinBet } from "@/lib/game";

export const maxDuration = 10;

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as { betAmount?: number };
    const betAmount = Number(body.betAmount);
    if (!Number.isFinite(betAmount)) {
      throw new GameError("betAmount is required", "INVALID_BET");
    }
    const result = await joinBet(user.id, betAmount);
    if (!result.draw) {
      after(() => continueTableFill(result.tableId));
    }
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
