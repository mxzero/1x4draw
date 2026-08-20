"use client";

import { useCallback, useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { Badge, Button, Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { formatWhen, tokens } from "@/lib/utils";
import type { AppEvent } from "@/lib/events";

type Item = {
  tableId: string;
  tableName?: string;
  betAmount: number;
  status: "PENDING" | "WON" | "LOST";
  payout: number;
  net: number;
  joinedAt: string;
  completedAt: string | null;
  canLeave?: boolean;
  tickets?: number;
};

const FILTERS = ["ALL", "PENDING", "WON", "LOST"] as const;

export default function HistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [days, setDays] = useState(7);
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [leaving, setLeaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const qs = filter === "ALL" ? "" : `?status=${filter}`;
    const [hist, wallet] = await Promise.all([fetch(`/api/history${qs}`), fetch("/api/wallet")]);
    if (hist.ok) {
      const data = await hist.json();
      setItems(data.items);
      setDays(data.days);
    }
    if (wallet.ok) {
      const data = await wallet.json();
      setBalance(data.balance);
      setPool(data.rewardPool.balance);
    }
  }, [filter]);

  const hasPending = items.some((item) => item.status === "PENDING");

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), hasPending ? 1000 : 4000);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, hasPending]);

  useLive(
    useCallback(
      (event: AppEvent) => {
        void load();
        if (event.type === "DRAW_COMPLETE") void load();
      },
      [load],
    ),
  );

  async function leave(tableId: string) {
    setError("");
    setLeaving(tableId);
    const res = await fetch("/api/tables/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    const data = await res.json();
    setLeaving(null);
    if (!res.ok) {
      setError(data.error ?? "Could not leave");
      return;
    }
    await load();
  }

  return (
    <AppFrame balance={balance} pool={pool} onBalanceChange={() => void load()}>
      <h1 className="font-display text-4xl">Bet history</h1>
      <p className="text-sm text-white/45">Last {days} days for your tier. Pending rows update when the draw finishes.</p>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-[5px] px-3 py-1 text-xs uppercase tracking-wider ${
              filter === f ? "bg-sand text-black" : "bg-white/5 text-white/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-[#f0a8a3]">{error}</p>}

      <div className="mt-4 space-y-3">
        {items.length === 0 && <p className="text-sm text-white/40">No activity in this window.</p>}
        {items.map((item) => (
          <Card key={item.tableId + item.joinedAt}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl">{tokens(item.betAmount)}</p>
                <p className="text-xs text-white/40">
                  {item.tableName ?? item.tableId.slice(-6).toUpperCase()} · {formatWhen(item.joinedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  tone={item.status === "WON" ? "win" : item.status === "LOST" ? "lost" : "pending"}
                >
                  {item.status}
                </Badge>
                {item.canLeave && (
                  <Button
                    variant="danger"
                    className="h-[21px] px-3 py-0 text-[11px] leading-none"
                    disabled={leaving === item.tableId}
                    onClick={() => leave(item.tableId)}
                  >
                    {leaving === item.tableId ? "Leaving…" : "Leave"}
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-white/45">
                Payout {tokens(item.payout)}
                {item.status !== "PENDING" && (
                  <> · Tickets {item.tickets ?? 0}</>
                )}
              </span>
              <span className={item.net > 0 ? "text-[#d5e07a]" : item.net < 0 ? "text-[#f0a8a3]" : "text-white/50"}>
                Net {item.status === "PENDING" ? "—" : tokens(item.net)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </AppFrame>
  );
}
