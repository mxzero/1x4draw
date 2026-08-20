"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppFrame } from "@/components/app-frame";
import { Button, Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { BASIC_DAILY_JOIN_LIMIT } from "@/lib/constants";
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
    joined: boolean;
  } | null;
};

type JoinedTable = {
  tableId: string;
  tableName: string;
  betAmount: number;
  status: string;
  seated: number;
  seats: number;
  players: string[];
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
            className={`flex items-center justify-center overflow-hidden rounded-[5px] border px-0.5 text-center text-[9px] leading-tight ${
              name ? "border-teal bg-teal/30 text-white" : "border-white/15 bg-black/40 text-white/25"
            }`}
            style={{ aspectRatio: "1 / 0.6" }}
          >
            {name ?? "—"}
          </div>
        );
      })}
    </div>
  );
}

export default function PlayPage() {
  const { data: session } = useSession();
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [joinedTables, setJoinedTables] = useState<JoinedTable[]>([]);
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [dailyJoins, setDailyJoins] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<DrawToast | null>(null);
  const [focusStake, setFocusStake] = useState<number | null>(null);

  const isBasic = session?.user.tier === "BASIC";
  const hasPending = joinedTables.some(
    (t) => t.status === "OPEN" || t.status === "FULL" || t.status === "DRAWING",
  );

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
      setJoinedTables(data.tables ?? []);
    }
    if (walletRes.ok) {
      const data = await walletRes.json();
      setPool(data.rewardPool.balance);
      setBalance(data.balance);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), hasPending ? 1000 : 4000);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh, hasPending]);

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
        void refresh();
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

  async function leave(tableId: string) {
    setError("");
    const res = await fetch("/api/tables/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not leave");
      return;
    }
    await refresh();
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
    await refresh();
    if (data.draw) {
      showDraw({ ...data.draw, tableName: data.tableName });
    }
  }

  function goToTable(betAmount: number) {
    setFocusStake(betAmount);
    document.getElementById(`stake-${betAmount}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const activeJoined = joinedTables.filter(
    (t) => t.status === "OPEN" || t.status === "FULL" || t.status === "DRAWING",
  );

  return (
    <AppFrame balance={balance} pool={pool} onBalanceChange={() => void refresh()}>
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Play</p>
      <h1 className="font-display text-4xl">Select table</h1>
      <p className="mt-1 text-sm text-white/50">
        One table per row. You sit in the next empty seat on the latest open table. Fifth player triggers the draw.
      </p>
      {isBasic && (
        <p className="mt-3 rounded-[5px] border border-sand/30 bg-sand/10 px-3 py-2 text-xs text-sand">
          Basic: {dailyJoins}/{BASIC_DAILY_JOIN_LIMIT} tables today.{" "}
          <Link href="/subscribe" className="underline">
            Subscribe
          </Link>{" "}
          to increase.
        </p>
      )}
      {activeJoined.length > 0 && (
        <p className="mt-3 rounded-[5px] border border-white/10 bg-surface px-3 py-2 text-sm">
          Joined{" "}
          {activeJoined.map((table, i) => (
            <span key={table.tableId}>
              {i > 0 && ", "}
              <button
                type="button"
                className="text-sand underline decoration-sand/40 underline-offset-2"
                onClick={() => goToTable(table.betAmount)}
              >
                {table.tableName}
              </button>
            </span>
          ))}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-[#f0a8a3]">{error}</p>}

      <div className="mt-5 space-y-3">
        {tiers.map((tier) => {
          const players = tier.nextFill?.players ?? [];
          const seatedHere = Boolean(tier.nextFill?.joined);
          return (
            <Card
              key={tier.betAmount}
              className={`space-y-3 ${focusStake === tier.betAmount ? "ring-1 ring-sand" : ""}`}
            >
              <div id={`stake-${tier.betAmount}`} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[25px] leading-none text-sand">{tokens(tier.betAmount)}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {tier.nextFill?.name ? tier.nextFill.name : "No open table"} · {tier.openTables} open
                  </p>
                </div>
                <div className="flex min-w-24 flex-col gap-1">
                  <Button
                    onClick={() => join(tier.betAmount)}
                    disabled={busy === tier.betAmount || seatedHere}
                    className="w-full py-2.5"
                  >
                    {busy === tier.betAmount ? "Joining…" : "Join"}
                  </Button>
                  {seatedHere && tier.nextFill && (
                    <Button
                      variant="danger"
                      onClick={() => leave(tier.nextFill!.tableId)}
                      className="h-[21px] w-full py-0 text-[11px] leading-none"
                    >
                      Leave
                    </Button>
                  )}
                </div>
              </div>
              <SeatSquares players={players} />
            </Card>
          );
        })}
      </div>

      {isBasic && (
        <div className="mt-8 rounded-[5px] border border-white/10 bg-[#1a100e] p-4">
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
