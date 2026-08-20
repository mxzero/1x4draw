import { Prisma, Role, Tier, type User, type Wallet } from "@prisma/client";
import { randomInt } from "crypto";
import {
  BASIC_DAILY_JOIN_LIMIT,
  BASIC_HISTORY_DAYS,
  COMMISSION_RATE,
  currentMonthKey,
  isBetValue,
  MAX_ACTIVE_TABLES_PER_BET,
  MONTHLY_RAFFLE_WINNERS,
  PLAYERS_PER_TABLE,
  PREMIUM_DAILY_SPEND_CAP,
  PREMIUM_HISTORY_DAYS,
  REWARD_POOL_SHARE_OF_COMMISSION,
  utcToday,
  WINNER_MULTIPLIER,
} from "@/lib/constants";
import { emitGlobal, emitToUsers } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tokens, toNum } from "@/lib/utils";

type Tx = Prisma.TransactionClient;
type UserWithWallet = User & { wallet: Wallet | null };

export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
  ) {
    super(message);
    this.name = "GameError";
  }
}

function isRetryable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isRetryable(error) || i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }
  throw last;
}

async function assertCanJoin(tx: Tx, user: UserWithWallet, betAmount: number) {
  if (user.banned) throw new GameError("Account is banned", "BANNED", 403);
  if (!user.wallet) throw new GameError("Wallet is missing", "NO_WALLET", 500);
  if (toNum(user.wallet.balance) < betAmount) {
    throw new GameError("Insufficient balance", "INSUFFICIENT_BALANCE");
  }

  const already = await tx.tablePlayer.findFirst({
    where: {
      userId: user.id,
      result: "PENDING",
      table: { betAmount, status: "OPEN" },
    },
  });
  if (already) {
    throw new GameError("You already have an open table for this bet value", "ALREADY_JOINED");
  }

  const day = utcToday();
  const stats = await tx.dailyJoinStat.findUnique({
    where: { userId_date: { userId: user.id, date: day } },
  });

  if (user.tier === "BASIC" && !user.bot) {
    if ((stats?.count ?? 0) >= BASIC_DAILY_JOIN_LIMIT) {
      throw new GameError("Daily join limit reached (10). Subscribe to increase.", "DAILY_JOIN_LIMIT");
    }
  } else if (!user.bot) {
    const spend = toNum(stats?.spend);
    if (spend + betAmount > PREMIUM_DAILY_SPEND_CAP) {
      throw new GameError("Daily wager cap reached (10,000 Tokens)", "DAILY_SPEND_CAP");
    }
  }
}

async function seatPlayer(tx: Tx, tableId: string, user: UserWithWallet, betAmount: number, tableName: string) {
  const deducted = await tx.wallet.updateMany({
    where: { userId: user.id, balance: { gte: betAmount } },
    data: { balance: { decrement: betAmount } },
  });
  if (deducted.count !== 1) {
    throw new GameError("Insufficient balance", "INSUFFICIENT_BALANCE");
  }

  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: user.id } });
  user.wallet = wallet;

  await tx.tablePlayer.create({
    data: { tableId, userId: user.id },
  });

  await tx.walletLedger.create({
    data: {
      userId: user.id,
      type: "BET",
      amount: new Prisma.Decimal(-betAmount),
      balanceAfter: wallet.balance,
      note: `Joined ${tableName} · ${tokens(betAmount)}`,
    },
  });

  await tx.dailyJoinStat.upsert({
    where: { userId_date: { userId: user.id, date: utcToday() } },
    create: { userId: user.id, date: utcToday(), count: 1, spend: betAmount },
    update: { count: { increment: 1 }, spend: { increment: betAmount } },
  });
}

async function lockBet(tx: Tx, betAmount: number) {
  await tx.betLock.upsert({
    where: { betAmount },
    create: { betAmount },
    update: { updatedAt: new Date() },
  });
}

async function findOrCreateOpenTable(tx: Tx, betAmount: number) {
  const existing = await tx.gameTable.findFirst({
    where: { betAmount, status: "OPEN" },
    orderBy: { openedAt: "asc" },
  });

  if (existing) {
    const count = await tx.tablePlayer.count({ where: { tableId: existing.id } });
    if (count < PLAYERS_PER_TABLE) return existing;
    await tx.gameTable.update({
      where: { id: existing.id },
      data: { status: "FULL" },
    });
  }

  const active = await tx.gameTable.count({
    where: { betAmount, status: { in: ["OPEN", "FULL", "DRAWING"] } },
  });
  if (active >= MAX_ACTIVE_TABLES_PER_BET) {
    throw new GameError("Maximum active tables reached for this bet value", "TABLE_CAP");
  }

  return tx.gameTable.create({
    data: { betAmount, name: makeTableName(betAmount) },
  });
}

const TABLE_WORDS = [
  "Orion",
  "Vega",
  "Lyra",
  "Atlas",
  "Nova",
  "Ember",
  "Onyx",
  "Jade",
  "Flux",
  "Helix",
  "Quark",
  "Nimbus",
];

function makeTableName(betAmount: number) {
  const word = TABLE_WORDS[randomInt(0, TABLE_WORDS.length)];
  const tag = randomInt(10, 99);
  return `${word} ${betAmount}-${tag}`;
}

function pickIndex(length: number) {
  return randomInt(0, length);
}

function shufflePick<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function seatOneCandidate(tx: Tx, tableId: string, betAmount: number, tableName: string, excludeIds: string[]) {
  const candidates = await tx.user.findMany({
    where: {
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      bot: true,
      role: Role.USER,
      banned: false,
    },
    include: { wallet: true },
  });
  const shuffled = shufflePick(candidates, candidates.length);

  for (const candidate of shuffled) {
    try {
      await assertCanJoin(tx, candidate, betAmount);
      await seatPlayer(tx, tableId, candidate, betAmount, tableName);
      return candidate.username;
    } catch {
      continue;
    }
  }
  return null;
}

type Seated = { id: string; userId: string; user: { id: string; username: string } };

async function completeDraw(tx: Tx, tableId: string, tableName: string, betAmount: number, players: Seated[]) {
  if (players.length !== PLAYERS_PER_TABLE) {
    throw new GameError("Table is not full", "NOT_FULL");
  }

  await tx.gameTable.update({
    where: { id: tableId },
    data: { status: "DRAWING", filledAt: new Date() },
  });

  const winner = players[pickIndex(players.length)];
  const pot = betAmount * PLAYERS_PER_TABLE;
  const winnerPayout = betAmount * WINNER_MULTIPLIER;
  const commission = pot * COMMISSION_RATE;
  const rewardShare = commission * REWARD_POOL_SHARE_OF_COMMISSION;
  const month = currentMonthKey();

  for (const player of players) {
    const won = player.userId === winner.userId;
    await tx.tablePlayer.update({
      where: { id: player.id },
      data: {
        result: won ? "WON" : "LOST",
        payout: won ? winnerPayout : 0,
      },
    });
  }

  const credited = await tx.wallet.update({
    where: { userId: winner.userId },
    data: { balance: { increment: winnerPayout } },
  });

  await tx.walletLedger.create({
    data: {
      userId: winner.userId,
      type: "WIN",
      amount: winnerPayout,
      balanceAfter: credited.balance,
      note: `Won ${tableName} · 4× ${tokens(betAmount)}`,
    },
  });

  await tx.draw.create({
    data: {
      tableId,
      winnerId: winner.userId,
      betAmount,
      winnerPayout,
      commission,
      rewardShare,
    },
  });

  await tx.commissionLog.create({
    data: { tableId, amount: commission, rewardShare },
  });

  await tx.rewardPool.upsert({
    where: { month },
    create: {
      month,
      totalCommission: commission,
      raffleIn: rewardShare,
      balance: rewardShare,
    },
    update: {
      totalCommission: { increment: commission },
      raffleIn: { increment: rewardShare },
      balance: { increment: rewardShare },
    },
  });

  await tx.gameTable.update({
    where: { id: tableId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await tx.notification.createMany({
    data: players.map((player) => {
      const won = player.userId === winner.userId;
      return {
        userId: player.userId,
        title: won ? "You won the draw" : "Draw complete",
        body: won
          ? `${tableName}: you won ${tokens(winnerPayout)} (4× ${tokens(betAmount)}).`
          : `${tableName}: ${winner.user.username} won. Your ${tokens(betAmount)} bet was lost.`,
      };
    }),
  });

  return {
    tableId,
    tableName,
    betAmount,
    winnerId: winner.userId,
    winnerName: winner.user.username,
    winnerPayout,
    commission,
    rewardShare,
    playerIds: players.map((p) => p.userId),
  };
}

async function isBetaMode(tx?: Tx) {
  const db = tx ?? prisma;
  const row = await db.appStatus.findUnique({ where: { id: "global" } });
  return (row?.mode ?? "beta") === "beta";
}

export async function joinBet(userId: string, betAmount: number) {
  if (!isBetValue(betAmount)) {
    throw new GameError("Bet must be 5, 10, 20, 50, or 100 Tokens", "INVALID_BET");
  }

  const result = await withRetry(() =>
    prisma.$transaction(
      async (tx) => {
        await lockBet(tx, betAmount);

        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });
        if (!user) throw new GameError("User not found", "NOT_FOUND", 404);

        await assertCanJoin(tx, user, betAmount);
        const table = await findOrCreateOpenTable(tx, betAmount);
        await seatPlayer(tx, table.id, user, betAmount, table.name);

        const players = await tx.tablePlayer.findMany({
          where: { tableId: table.id },
          include: { user: { select: { id: true, username: true } } },
          orderBy: { joinedAt: "asc" },
        });

        if (players.length > PLAYERS_PER_TABLE) {
          throw new GameError("Table overflow", "OVERFLOW", 409);
        }

        const draw =
          players.length === PLAYERS_PER_TABLE
            ? await completeDraw(tx, table.id, table.name, betAmount, players)
            : null;

        const beta = await isBetaMode(tx);
        return {
          tableId: table.id,
          tableName: table.name,
          betAmount,
          playerCount: players.length,
          seats: PLAYERS_PER_TABLE,
          players: players.map((p) => p.user.username),
          autoFill: beta && !user.bot && players.length < PLAYERS_PER_TABLE,
          draw,
        };
      },
      { timeout: 20000 },
    ),
  );

  emitDraw(result);
  return result;
}

function emitDraw(result: {
  tableId: string;
  tableName?: string;
  betAmount: number;
  draw: {
    tableId: string;
    tableName?: string;
    winnerId: string;
    winnerName: string;
    winnerPayout: number;
    betAmount: number;
    playerIds: string[];
  } | null;
}) {
  emitGlobal({ type: "TABLE_UPDATE", tableId: result.tableId, betAmount: result.betAmount });
  if (result.draw) {
    emitToUsers(result.draw.playerIds, {
      type: "DRAW_COMPLETE",
      tableId: result.draw.tableId,
      tableName: result.draw.tableName ?? result.tableName,
      winnerId: result.draw.winnerId,
      winnerName: result.draw.winnerName,
      winnerPayout: result.draw.winnerPayout,
      betAmount: result.draw.betAmount,
    });
    emitGlobal({
      type: "TABLE_UPDATE",
      tableId: result.tableId,
      betAmount: result.betAmount,
      completed: true,
    });
  }
}

export async function leaveTable(userId: string, tableId: string) {
  const result = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const table = await tx.gameTable.findUnique({ where: { id: tableId } });
      if (!table) throw new GameError("Table not found", "NOT_FOUND", 404);
      if (table.status !== "OPEN") {
        throw new GameError("You can only leave before the draw starts", "TABLE_CLOSED");
      }
      await lockBet(tx, table.betAmount);

      const seat = await tx.tablePlayer.findFirst({
        where: { tableId, userId, result: "PENDING" },
      });
      if (!seat) throw new GameError("You are not seated at this table", "NOT_SEATED");

      await tx.tablePlayer.delete({ where: { id: seat.id } });

      const wallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: table.betAmount } },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: "ADJUSTMENT",
          amount: table.betAmount,
          balanceAfter: wallet.balance,
          note: `Left ${table.name} · refund ${tokens(table.betAmount)}`,
        },
      });

      const stats = await tx.dailyJoinStat.findUnique({
        where: { userId_date: { userId, date: utcToday() } },
      });
      if (stats && stats.count > 0) {
        await tx.dailyJoinStat.update({
          where: { id: stats.id },
          data: {
            count: { decrement: 1 },
            spend: { decrement: table.betAmount },
          },
        });
      }

      return {
        tableId: table.id,
        tableName: table.name,
        betAmount: table.betAmount,
        refunded: table.betAmount,
        balance: toNum(wallet.balance),
      };
    }),
  );

  emitGlobal({ type: "TABLE_UPDATE", tableId: result.tableId, betAmount: result.betAmount });
  return result;
}

export async function seatNextPlayer(requesterId: string, tableId: string) {
  const requester = await prisma.user.findUnique({ where: { id: requesterId } });
  if (!requester) throw new GameError("Sign in required", "UNAUTHENTICATED", 401);

  const beta = await isBetaMode();
  if (!beta && requester.role !== Role.ADMIN) {
    throw new GameError("Auto-fill is only available in beta", "NOT_BETA", 403);
  }

  const seatedCheck = await prisma.tablePlayer.findFirst({
    where: { tableId, userId: requesterId },
  });
  if (!seatedCheck && requester.role !== Role.ADMIN) {
    throw new GameError("You are not seated at this table", "FORBIDDEN", 403);
  }

  const result = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const table = await tx.gameTable.findUnique({ where: { id: tableId } });
      if (!table || table.status !== "OPEN") {
        throw new GameError("Table is not open", "TABLE_CLOSED");
      }
      await lockBet(tx, table.betAmount);

      const seated = await tx.tablePlayer.findMany({
        where: { tableId },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      });
      if (seated.length >= PLAYERS_PER_TABLE) {
        throw new GameError("Table is full", "FULL");
      }

      const joined = await seatOneCandidate(
        tx,
        tableId,
        table.betAmount,
        table.name,
        seated.map((p) => p.userId),
      );
      if (!joined) {
        throw new GameError("No eligible players left to auto-join", "NO_FILL");
      }

      const players = await tx.tablePlayer.findMany({
        where: { tableId },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      });

      const draw =
        players.length === PLAYERS_PER_TABLE
          ? await completeDraw(tx, table.id, table.name, table.betAmount, players)
          : null;

      return {
        tableId: table.id,
        tableName: table.name,
        betAmount: table.betAmount,
        playerCount: players.length,
        seats: PLAYERS_PER_TABLE,
        players: players.map((p) => p.user.username),
        autoFill: players.length < PLAYERS_PER_TABLE,
        draw,
      };
    }),
  );

  emitDraw(result);
  return result;
}

export async function runMonthlyRaffle() {
  const result = await prisma.$transaction(async (tx) => {
    const month = currentMonthKey();
    await tx.systemLock.upsert({
      where: { id: "reward-raffle" },
      create: { id: "reward-raffle" },
      update: { updatedAt: new Date() },
    });

    const pool = await tx.rewardPool.findUnique({ where: { month } });
    if (!pool || toNum(pool.balance) <= 0) {
      throw new GameError("Monthly reward pool is empty", "EMPTY_POOL");
    }

    const eligible = await tx.user.findMany({
      where: { tier: Tier.PREMIUM, banned: false, role: Role.USER, bot: false },
    });
    if (eligible.length === 0) {
      throw new GameError("No eligible premium subscribers", "NO_ELIGIBLE");
    }

    const picked = shufflePick(eligible, Math.min(MONTHLY_RAFFLE_WINNERS, eligible.length));
    const total = toNum(pool.balance);
    const baseShare = Math.floor((total / picked.length) * 100) / 100;
    let remainder = Number((total - baseShare * picked.length).toFixed(2));

    const draw = await tx.rewardDraw.create({
      data: {
        poolId: pool.id,
        totalAmount: total,
        winnerCount: picked.length,
      },
    });

    const winners: { userId: string; username: string; amount: number }[] = [];

    for (const user of picked) {
      const extra = remainder > 0 ? Math.min(remainder, 0.01) : 0;
      remainder = Number((remainder - extra).toFixed(2));
      const amount = Number((baseShare + extra).toFixed(2));

      const wallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: amount } },
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          type: "REWARD",
          amount,
          balanceAfter: wallet.balance,
          note: `Monthly subscriber raffle ${month}`,
        },
      });

      await tx.rewardDrawWinner.create({
        data: { drawId: draw.id, userId: user.id, amount },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Monthly raffle win",
          body: `You were selected in the ${month} subscriber raffle and received ${tokens(amount)}.`,
        },
      });

      winners.push({ userId: user.id, username: user.username, amount });
    }

    await tx.rewardPool.update({
      where: { id: pool.id },
      data: {
        raffleOut: { increment: total },
        balance: 0,
      },
    });

    return { month, total, winners, drawId: draw.id };
  });

  emitToUsers(
    result.winners.map((w) => w.userId),
    { type: "REWARD_DRAW", month: result.month, total: result.total },
  );
  emitGlobal({ type: "REWARD_DRAW", month: result.month });
  return result;
}

export function historyWindowDays(tier: Tier) {
  return tier === "PREMIUM" ? PREMIUM_HISTORY_DAYS : BASIC_HISTORY_DAYS;
}
