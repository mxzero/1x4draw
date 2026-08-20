import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { jsonError, requireSession } from "@/lib/api";
import { GameError, historyWindowDays } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as { action?: "buy" | "convert" | "withdraw"; amount?: number };
    const amount = Number(body.amount);
    if (body.action !== "buy" && body.action !== "convert" && body.action !== "withdraw") {
      throw new GameError("action must be buy or withdraw", "INVALID");
    }
    const withdrawing = body.action === "convert" || body.action === "withdraw";
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new GameError("Enter a token amount greater than 0", "INVALID");
    }

    const result = await prisma.$transaction(async (tx) => {
      if (withdrawing) {
        const deducted = await tx.wallet.updateMany({
          where: { userId: user.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (deducted.count !== 1) {
          throw new GameError("Insufficient tokens", "INSUFFICIENT_BALANCE");
        }
      } else {
        await tx.wallet.update({
          where: { userId: user.id },
          data: { balance: { increment: amount } },
        });
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: user.id } });
      await tx.walletLedger.create({
        data: {
          userId: user.id,
          type: withdrawing ? "WITHDRAW" : "DEPOSIT",
          amount: new Prisma.Decimal(withdrawing ? -amount : amount),
          balanceAfter: wallet.balance,
          note: withdrawing ? `Withdrew ${amount} Tokens` : `Bought ${amount} Tokens`,
        },
      });
      return { balance: toNum(wallet.balance) };
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    const user = await requireSession();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - historyWindowDays(user.tier));

    const ledger = await prisma.walletLedger.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      days: historyWindowDays(user.tier),
      buy: ledger
        .filter((row) => row.type === "DEPOSIT")
        .map((row) => ({
          id: row.id,
          amount: toNum(row.amount),
          note: row.note,
          createdAt: row.createdAt,
        })),
      convert: ledger
        .filter((row) => row.type === "WITHDRAW")
        .map((row) => ({
          id: row.id,
          amount: toNum(row.amount),
          note: row.note,
          createdAt: row.createdAt,
        })),
      withdraw: ledger
        .filter((row) => row.type === "WITHDRAW")
        .map((row) => ({
          id: row.id,
          amount: toNum(row.amount),
          note: row.note,
          createdAt: row.createdAt,
        })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
