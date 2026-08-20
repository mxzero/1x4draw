import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { currentMonthKey } from "@/lib/constants";
import { GameError, runMonthlyRaffle } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const month = currentMonthKey();
    const pool = await prisma.rewardPool.findUnique({ where: { month } });
    const history = await prisma.rewardPool.findMany({
      include: {
        draws: {
          include: {
            winners: { include: { user: { select: { username: true } } } },
          },
          orderBy: { drawnAt: "desc" },
        },
      },
      orderBy: { month: "desc" },
      take: 12,
    });

    const eligible = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        username: true,
        email: true,
        tier: true,
        bot: true,
        createdAt: true,
        subscribedAt: true,
        subscriptionPlan: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      month,
      pool: pool
        ? {
            balance: toNum(pool.balance),
            totalCommission: toNum(pool.totalCommission),
            raffleIn: toNum(pool.raffleIn),
            raffleOut: toNum(pool.raffleOut),
          }
        : { balance: 0, totalCommission: 0, raffleIn: 0, raffleOut: 0 },
      eligible,
      history: history.map((p) => ({
        month: p.month,
        balance: toNum(p.balance),
        totalCommission: toNum(p.totalCommission),
        raffleIn: toNum(p.raffleIn),
        raffleOut: toNum(p.raffleOut),
        draws: p.draws.map((d) => ({
          id: d.id,
          drawnAt: d.drawnAt,
          totalAmount: toNum(d.totalAmount),
          winners: d.winners.map((w) => ({
            username: w.user.username,
            amount: toNum(w.amount),
          })),
        })),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const result = await runMonthlyRaffle();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GameError) return jsonError(error);
    return jsonError(error);
  }
}
