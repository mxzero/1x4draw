import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { GCASH_ENABLED } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const items = await prisma.gCashTransaction.findMany({
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      enabled: GCASH_ENABLED,
      items: items.map((row) => ({
        id: row.id,
        username: row.user.username,
        email: row.user.email,
        type: row.type,
        amount: toNum(row.amount),
        status: row.status,
        reference: row.reference,
        notes: row.notes,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH() {
  return NextResponse.json(
    { error: "GCash review is disabled in this prototype" },
    { status: 503 },
  );
}
