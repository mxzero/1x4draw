import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { PLAYERS_PER_TABLE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "history" ? "history" : "live";

    if (scope === "live") {
      const tables = await prisma.gameTable.findMany({
        where: { status: { in: ["OPEN", "FULL", "DRAWING"] } },
        include: {
          players: {
            include: { user: { select: { username: true, role: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
        orderBy: { openedAt: "asc" },
      });

      return NextResponse.json({
        tables: tables.map((table) => ({
          id: table.id,
          name: table.name,
          betAmount: table.betAmount,
          status: table.status,
          seated: table.players.length,
          seats: PLAYERS_PER_TABLE,
          fillRate: table.players.length / PLAYERS_PER_TABLE,
          openedAt: table.openedAt,
          players: table.players.map((p) => p.user.username),
        })),
      });
    }

    const tables = await prisma.gameTable.findMany({
      where: { status: "COMPLETED" },
      include: {
        draw: true,
        players: {
          include: { user: { select: { username: true } } },
        },
        commission: true,
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      tables: tables.map((table) => {
        const winner = table.players.find((p) => p.result === "WON");
        return {
          id: table.id,
          name: table.name,
          betAmount: table.betAmount,
          status: table.status,
          winner: winner?.user.username ?? null,
          payout: toNum(table.draw?.winnerPayout),
          commission: toNum(table.commission?.amount),
          completedAt: table.completedAt,
        };
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
