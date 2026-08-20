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

    const rows = await prisma.tablePlayer.findMany({
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
    });

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
        joinedAt: row.joinedAt,
        completedAt: row.table.completedAt,
      };
    });

    return NextResponse.json({ items, since, days: historyWindowDays(user.tier) });
  } catch (error) {
    return jsonError(error);
  }
}
