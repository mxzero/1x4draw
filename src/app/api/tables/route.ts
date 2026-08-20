import { NextResponse } from "next/server";
import { BET_VALUES, PLAYERS_PER_TABLE } from "@/lib/constants";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSession();

    const open = await prisma.gameTable.findMany({
      where: { status: "OPEN" },
      include: {
        _count: { select: { players: true } },
        players: {
          include: { user: { select: { username: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { openedAt: "asc" },
    });

    const tiers = BET_VALUES.map((betAmount) => {
      const tables = open.filter((t) => t.betAmount === betAmount);
      const waiting = tables.reduce((sum, t) => sum + t._count.players, 0);
      const first = tables[0];
      return {
        betAmount,
        openTables: tables.length,
        waitingPlayers: waiting,
        nextFill: first
          ? {
              tableId: first.id,
              name: first.name,
              seated: first._count.players,
              seats: PLAYERS_PER_TABLE,
              players: first.players.map((p) => p.user.username),
            }
          : null,
      };
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    return jsonError(error);
  }
}
