import { after } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PLAYERS_PER_TABLE, utcToday } from "@/lib/constants";
import { continueTableFill } from "@/lib/game";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSession();

    const rows = await prisma.tablePlayer.findMany({
      where: {
        userId: user.id,
        result: "PENDING",
      },
      include: {
        table: {
          include: {
            players: {
              include: { user: { select: { id: true, username: true, bot: true } } },
              orderBy: { joinedAt: "asc" },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    for (const row of rows) {
      if (row.table.status === "OPEN" && row.table.players.length < PLAYERS_PER_TABLE) {
        after(() => continueTableFill(row.tableId));
      }
    }

    const tables = rows.map((row) => {
      const firstHuman = row.table.players.find((p) => !p.user.bot);
      return {
        tableId: row.tableId,
        tableName: row.table.name,
        betAmount: row.table.betAmount,
        status: row.table.status,
        seated: row.table.players.length,
        seats: PLAYERS_PER_TABLE,
        joinedAt: row.joinedAt,
        players: row.table.players.map((p) => p.user.username),
        isFillLead: firstHuman?.userId === user.id,
      };
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, email: true, role: true, tier: true, banned: true },
    });
    const stats = await prisma.dailyJoinStat.findUnique({
      where: { userId_date: { userId: user.id, date: utcToday() } },
    });

    return NextResponse.json({
      tables,
      balance: toNum(wallet?.balance),
      profile,
      dailyJoins: stats?.count ?? 0,
    });
  } catch (error) {
    return jsonError(error);
  }
}
