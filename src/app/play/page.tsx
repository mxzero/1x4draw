"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppFrame } from "@/components/app-frame";
import { Badge, Button, Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import {
  AUTO_JOIN_DELAY_100_MS,
  AUTO_JOIN_DELAY_MS,
  BASIC_DAILY_JOIN_LIMIT,
} from "@/lib/constants";
import { tokens } from "@/lib/utils";
import type { AppEvent } from "@/lib/events";

type TierInfo = {
  betAmount: number;
  openTables: number;
  waitingPlayers: number;
  nextFill: {
    tableId: string;
    name: string;
    seated: number;
    seats: number;
    players: string[];
  } | null;
};

type DrawToast = {
  tableId: string;
  tableName: string;
  winnerName: string;
  winnerPayout: number;
  betAmount: number;
  youWon: boolean;
};

function SeatSquares({ players, seats = 5 }: { players: string[]; seats?: number }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: seats }).map((_, i) => {
        const name = players[i];
        return (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-md border px-1 text-center text-[10px] leading-tight ${
              name ? "border-teal bg-teal/30 text-white" : "border-white/15 bg-black/40 text-white/25"
            }`}
          >
            {name ?? "—"}
          </div>
        );
      })}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PlayPage() {
  const { data: session } = useSession();
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [dailyJoins, setDailyJoins] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<DrawToast | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const filling = useRef(false);

  const isAdmin = session?.user.role === "ADMIN";
  const isBasic = session?.user.tier === "BASIC";

  const refresh = useCallback(async () => {
    const [tablesRes, meRes, walletRes] = await Promise.all([
      fetch("/api/tables"),
      fetch("/api/me"),
      fetch("/api/wallet"),
    ]);
    if (tablesRes.ok) {
      const data = await tablesRes.json();
      setTiers(data.tiers);
    }
    if (meRes.ok) {
      const data = await meRes.json();
      setBalance(data.balance);
      setDailyJoins(data.dailyJoins ?? 0);
    }
    if (walletRes.ok) {
      const data = await walletRes.json();
      setPool(data.rewardPool.balance);
      setBalance(data.balance);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!filling.current) void refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const showDraw = useCallback(
    (event: {
      tableId: string;
      tableName?: string;
      winnerName: string;
      winnerPayout: number;
      betAmount: number;
      winnerId?: string;
    }) => {
      setToast({
        tableId: event.tableId,
        tableName: event.tableName ?? "Table",
        winnerName: event.winnerName,
        winnerPayout: event.winnerPayout,
        betAmount: event.betAmount,
        youWon: event.winnerId === session?.user.id,
      });
    },
    [session?.user.id],
  );

  useLive(
    useCallback(
      (event: AppEvent) => {
        if (!filling.current) void refresh();
        if (event.type === "DRAW_COMPLETE") {
          showDraw({
            tableId: String(event.tableId),
            tableName: String(event.tableName ?? ""),
            winnerName: String(event.winnerName ?? ""),
            winnerPayout: Number(event.winnerPayout ?? 0),
            betAmount: Number(event.betAmount ?? 0),
            winnerId: event.winnerId ? String(event.winnerId) : undefined,
          });
        }
      },
      [refresh, showDraw],
    ),
  );

  async function runAutoFill(tableId: string, betAmount: number, tableName: string) {
    filling.current = true;
    const delay = betAmount === 100 ? AUTO_JOIN_DELAY_100_MS : AUTO_JOIN_DELAY_MS;
    try {
      for (let i = 0; i < 4; i++) {
        await sleep(delay);
        const res = await fetch("/api/tables/seat-next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Auto-join stopped");
          break;
        }
        setTiers((current) =>
          current.map((tier) =>
            tier.betAmount === betAmount
              ? {
                  ...tier,
                  nextFill: {
                    tableId: data.tableId,
                    name: data.tableName,
                    seated: data.playerCount,
                    seats: data.seats,
                    players: data.players,
                  },
                }
              : tier,
          ),
        );
        if (data.draw) {
          showDraw({ ...data.draw, tableName: data.tableName ?? tableName });
          break;
        }
      }
    } finally {
      filling.current = false;
      await refresh();
    }
  }

  async function join(betAmount: number) {
    setError("");
    setBusy(betAmount);
    const res = await fetch("/api/tables/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betAmount }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not join");
      return;
    }
    setJoinedName(data.tableName);
    await refresh();
    if (data.draw) {
      showDraw({ ...data.draw, tableName: data.tableName });
      return;
    }
    if (data.autoFill) {
      await runAutoFill(data.tableId, betAmount, data.tableName);
    }
  }

  return (
    <AppFrame balance={balance} pool={pool}>
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Select stake</p>
      <h1 className="font-display text-4xl">Open a seat</h1>
      <p className="mt-1 text-sm text-white/50">
        One table per row. Fifth player triggers the draw. Winner is paid 4× in Tokens (1 Token = 1 PHP).
      </p>
      {isBasic && (
        <p className="mt-3 rounded-xl border border-sand/30 bg-sand/10 px-3 py-2 text-xs text-sand">
          Basic: {dailyJoins}/{BASIC_DAILY_JOIN_LIMIT} tables today.{" "}
          <Link href="/subscribe" className="underline">
            Subscribe
          </Link>{" "}
          to increase.
        </p>
      )}
      {isAdmin && (
        <p className="mt-3 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-xs text-white/70">
          Admin join auto-fills remaining seats one by one so you can watch the table fill.
        </p>
      )}
      {joinedName && (
        <p className="mt-3 rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm">
          Joined <span className="text-sand">{joinedName}</span>
        </p>
      )}

      {error && <p className="mt-3 text-sm text-[#f0a8a3]">{error}</p>}

      <div className="mt-5 space-y-3">
        {tiers.map((tier) => {
          const players = tier.nextFill?.players ?? [];
          return (
            <Card key={tier.betAmount} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-3xl text-sand">{tokens(tier.betAmount)}</p>
                  <p className="text-[11px] text-white/40">
                    {tier.nextFill?.name ? tier.nextFill.name : "No open table"} · {tier.openTables} open
                  </p>
                </div>
                <Button
                  onClick={() => join(tier.betAmount)}
                  disabled={busy === tier.betAmount}
                  className="min-w-24"
                >
                  {busy === tier.betAmount ? "Joining…" : "Join"}
                </Button>
              </div>
              <SeatSquares players={players} />
            </Card>
          );
        })}
      </div>

      {isBasic && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#1a100e] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Ad</p>
          <p className="text-sm text-sand">Go ad-free and raise your daily join cap.</p>
          <Link href="/subscribe" className="mt-2 inline-block text-xs uppercase tracking-wider text-white/70 underline">
            Subscribe
          </Link>
        </div>
      )}

      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <Card className="w-full max-w-sm text-center shadow-glow">
            <p className="text-[11px] uppercase tracking-widest text-white/40">{toast.tableName}</p>
            <p className="font-display text-5xl">{toast.youWon ? "You won" : "You lost"}</p>
            <p className="mt-2 text-sm text-white/70">
              {toast.winnerName} took {tokens(toast.winnerPayout)} on {toast.tableName}.
            </p>
            <Button className="mt-4 w-full" onClick={() => setToast(null)}>
              Continue
            </Button>
          </Card>
        </div>
      )}
    </AppFrame>
  );
}
