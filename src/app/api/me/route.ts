import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PLAYERS_PER_TABLE, utcToday } from "@/lib/constants";
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
              include: { user: { select: { username: true } } },
              orderBy: { joinedAt: "asc" },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const tables = rows.map((row) => ({
      tableId: row.tableId,
      tableName: row.table.name,
      betAmount: row.table.betAmount,
      status: row.table.status,
      seated: row.table.players.length,
      seats: PLAYERS_PER_TABLE,
      joinedAt: row.joinedAt,
      players: row.table.players.map((p) => p.user.username),
    }));

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
