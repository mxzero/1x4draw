import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { jsonError, requireAdmin } from "@/lib/api";
import { GameError } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { utcToday } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : undefined,
      include: {
        wallet: true,
        dailyJoins: { where: { date: utcToday() } },
      },
      orderBy: { createdAt: "asc" },
      take: 80,
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        tier: u.tier,
        banned: u.banned,
        balance: toNum(u.wallet?.balance),
        dailyJoins: u.dailyJoins[0]?.count ?? 0,
        dailySpend: toNum(u.dailyJoins[0]?.spend),
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      userId?: string;
      action?: "ban" | "unban" | "tier" | "wallet";
      tier?: "BASIC" | "PREMIUM";
      amount?: number;
      note?: string;
    };

    if (!body.userId || !body.action) {
      throw new GameError("userId and action required", "INVALID");
    }

    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      include: { wallet: true },
    });
    if (!target) throw new GameError("User not found", "NOT_FOUND", 404);
    if (target.id === admin.id && body.action === "ban") {
      throw new GameError("You cannot ban yourself", "FORBIDDEN", 403);
    }

    if (body.action === "ban" || body.action === "unban") {
      const user = await prisma.user.update({
        where: { id: target.id },
        data: { banned: body.action === "ban" },
      });
      return NextResponse.json({ ok: true, banned: user.banned });
    }

    if (body.action === "tier") {
      if (body.tier !== "BASIC" && body.tier !== "PREMIUM") {
        throw new GameError("tier must be BASIC or PREMIUM", "INVALID");
      }
      const user = await prisma.user.update({
        where: { id: target.id },
        data: { tier: body.tier },
      });
      return NextResponse.json({ ok: true, tier: user.tier });
    }

    if (body.action === "wallet") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        throw new GameError("amount must be a non-zero number", "INVALID");
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (amount < 0) {
          const result = await tx.wallet.updateMany({
            where: { userId: target.id, balance: { gte: Math.abs(amount) } },
            data: { balance: { decrement: Math.abs(amount) } },
          });
          if (result.count !== 1) {
            throw new GameError("Insufficient wallet for debit", "INSUFFICIENT_BALANCE");
          }
        } else {
          await tx.wallet.update({
            where: { userId: target.id },
            data: { balance: { increment: amount } },
          });
        }

        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: target.id } });
        await tx.walletLedger.create({
          data: {
            userId: target.id,
            type: "ADJUSTMENT",
            amount: new Prisma.Decimal(amount),
            balanceAfter: wallet.balance,
            note: body.note?.trim() || `Manual adjustment by ${admin.username}`,
          },
        });
        return wallet;
      });

      return NextResponse.json({ ok: true, balance: toNum(updated.balance) });
    }

    throw new GameError("Unknown action", "INVALID");
  } catch (error) {
    return jsonError(error);
  }
}
