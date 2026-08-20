import { NextResponse } from "next/server";
import { BET_VALUES, PLAYERS_PER_TABLE } from "@/lib/constants";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSession();

    const open = await prisma.gameTable.findMany({
      where: { status: "OPEN" },
      include: {
        _count: { select: { players: true } },
        players: {
          include: { user: { select: { username: true, bot: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { openedAt: "desc" },
    });

    const tiers = BET_VALUES.map((betAmount) => {
      const tables = open.filter((t) => t.betAmount === betAmount);
      const waiting = tables.reduce((sum, t) => sum + t._count.players, 0);
      const mine = tables.find((t) => t.players.some((p) => p.userId === user.id));
      const shown = mine ?? tables.find((t) => t.players.some((p) => !p.user.bot)) ?? tables[0];
      return {
        betAmount,
        openTables: tables.length,
        waitingPlayers: waiting,
        nextFill: shown
          ? {
              tableId: shown.id,
              name: shown.name,
              seated: shown._count.players,
              seats: PLAYERS_PER_TABLE,
              players: shown.players.map((p) => p.user.username),
              joined: shown.players.some((p) => p.userId === user.id),
            }
          : null,
      };
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    return jsonError(error);
  }
}
