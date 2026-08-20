import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { currentMonthKey, GCASH_ENABLED } from "@/lib/constants";
import { historyWindowDays } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSession();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - historyWindowDays(user.tier));
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const ledger = await prisma.walletLedger.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const pool = await prisma.rewardPool.findUnique({
      where: { month: currentMonthKey() },
    });

    return NextResponse.json({
      balance: toNum(wallet?.balance),
      gcashEnabled: GCASH_ENABLED,
      rewardPool: {
        month: currentMonthKey(),
        balance: toNum(pool?.balance),
        totalCommission: toNum(pool?.totalCommission),
      },
      ledger: ledger.map((row) => ({
        id: row.id,
        type: row.type,
        amount: toNum(row.amount),
        balanceAfter: toNum(row.balanceAfter),
        note: row.note,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
