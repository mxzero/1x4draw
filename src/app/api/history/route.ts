import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { historyWindowDays } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - historyWindowDays(user.tier));

    const [rows, entries] = await Promise.all([
      prisma.tablePlayer.findMany({
        where: {
          userId: user.id,
          joinedAt: { gte: since },
          ...(status === "PENDING" || status === "WON" || status === "LOST"
            ? { result: status }
            : {}),
        },
        include: {
          table: {
            include: { draw: true },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 200,
      }),
      prisma.raffleEntry.findMany({
        where: { userId: user.id, createdAt: { gte: since } },
        select: { tableId: true, tickets: true },
      }),
    ]);

    const ticketsByTable = new Map(entries.map((row) => [row.tableId, row.tickets]));

    const items = rows.map((row) => {
      const bet = row.table.betAmount;
      const payout = toNum(row.payout);
      const net = row.result === "PENDING" ? 0 : payout - bet;
      return {
        tableId: row.tableId,
        tableName: row.table.name,
        betAmount: bet,
        status: row.result,
        payout,
        net,
        tickets: ticketsByTable.get(row.tableId) ?? 0,
        joinedAt: row.joinedAt,
        completedAt: row.table.completedAt,
        canLeave: row.result === "PENDING" && row.table.status === "OPEN",
      };
    });

    return NextResponse.json({ items, since, days: historyWindowDays(user.tier) });
  } catch (error) {
    return jsonError(error);
  }
}
