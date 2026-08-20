import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { PLAYERS_PER_TABLE, currentMonthKey, utcToday } from "@/lib/constants";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSession();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [rows, wallet, profile, stats, pool, ticketAgg, recent] = await Promise.all([
      prisma.tablePlayer.findMany({
        where: { userId: user.id, result: "PENDING" },
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
      }),
      prisma.wallet.findUnique({ where: { userId: user.id } }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { username: true, email: true, role: true, tier: true, banned: true },
      }),
      prisma.dailyJoinStat.findUnique({
        where: { userId_date: { userId: user.id, date: utcToday() } },
      }),
      prisma.rewardPool.findUnique({ where: { month: currentMonthKey() } }),
      prisma.raffleEntry.aggregate({
        where: { userId: user.id },
        _sum: { tickets: true },
      }),
      prisma.tablePlayer.findMany({
        where: {
          userId: user.id,
          result: { in: ["WON", "LOST"] },
          table: { completedAt: { gte: fiveMinAgo } },
        },
        include: {
          table: {
            include: {
              draw: true,
              players: {
                where: { result: "WON" },
                include: { user: { select: { id: true, username: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 10,
      }),
    ]);

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

    const recentDraws = recent.map((row) => {
      const winner = row.table.players[0];
      return {
        tableId: row.tableId,
        tableName: row.table.name,
        betAmount: row.table.betAmount,
        winnerId: winner?.userId ?? row.table.draw?.winnerId,
        winnerName: winner?.user.username ?? "Winner",
        winnerPayout: toNum(row.table.draw?.winnerPayout),
        youWon: row.result === "WON",
      };
    });

    return NextResponse.json({
      tables,
      recentDraws,
      balance: toNum(wallet?.balance),
      tickets: ticketAgg._sum.tickets ?? 0,
      pool: toNum(pool?.balance),
      profile,
      dailyJoins: stats?.count ?? 0,
    });
  } catch (error) {
    return jsonError(error);
  }
}
