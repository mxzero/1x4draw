import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { currentMonthKey } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const month = currentMonthKey();

    const [volumeAgg, commissionAgg, payoutAgg, pool, openTables, completedToday, userCount] =
      await Promise.all([
        prisma.draw.aggregate({ _sum: { betAmount: true }, _count: true }),
        prisma.commissionLog.aggregate({ _sum: { amount: true, rewardShare: true } }),
        prisma.draw.aggregate({ _sum: { winnerPayout: true } }),
        prisma.rewardPool.findUnique({ where: { month } }),
        prisma.gameTable.count({ where: { status: "OPEN" } }),
        prisma.gameTable.count({
          where: {
            status: "COMPLETED",
            completedAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
          },
        }),
        prisma.user.count({ where: { role: "USER" } }),
      ]);

    const tablesPlayed = volumeAgg._count;
    const totalVolume = (volumeAgg._sum.betAmount ?? 0) * 5;

    return NextResponse.json({
      totalVolume,
      totalEarnings: toNum(commissionAgg._sum.amount),
      totalDistributed: toNum(payoutAgg._sum.winnerPayout),
      rewardRouted: toNum(commissionAgg._sum.rewardShare),
      rewardPoolBalance: toNum(pool?.balance),
      rewardPoolCommission: toNum(pool?.totalCommission),
      month,
      openTables,
      completedToday,
      userCount,
      tablesPlayed,
    });
  } catch (error) {
    return jsonError(error);
  }
}
