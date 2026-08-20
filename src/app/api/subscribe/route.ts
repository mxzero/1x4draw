import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { GameError } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { SUBSCRIBE_MONTHLY_USD, SUBSCRIBE_YEARLY_USD } from "@/lib/constants";

function looksLikeCard(number: string, expiry: string, cvc: string, name: string) {
  const digits = number.replace(/\s+/g, "");
  if (digits.length < 13 || digits.length > 19 || !/^\d+$/.test(digits)) return false;
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  if (!/^\d{3,4}$/.test(cvc)) return false;
  if (name.trim().length < 2) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as {
      plan?: "monthly" | "yearly";
      cardNumber?: string;
      expiry?: string;
      cvc?: string;
      cardName?: string;
    };

    if (body.plan !== "monthly" && body.plan !== "yearly") {
      throw new GameError("Choose monthly or yearly", "INVALID");
    }
    if (!looksLikeCard(body.cardNumber ?? "", body.expiry ?? "", body.cvc ?? "", body.cardName ?? "")) {
      throw new GameError("A valid credit card is required", "CARD_REQUIRED");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: "PREMIUM",
        subscriptionPlan: body.plan,
        subscribedAt: new Date(),
      },
      select: { id: true, username: true, tier: true, subscriptionPlan: true, subscribedAt: true },
    });

    return NextResponse.json({
      ok: true,
      user: updated,
      billed: body.plan === "yearly" ? SUBSCRIBE_YEARLY_USD : SUBSCRIBE_MONTHLY_USD,
      note: "Card details are not stored. Billing is prototype-only.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
