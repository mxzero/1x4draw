"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminFrame } from "@/components/admin-frame";
import { Badge, Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { formatWhen, tokens } from "@/lib/utils";

type LiveTable = {
  id: string;
  name?: string;
  betAmount: number;
  status: string;
  seated: number;
  seats: number;
  fillRate: number;
  openedAt: string;
  players: string[];
};

type HistTable = {
  id: string;
  name?: string;
  betAmount: number;
  winner: string | null;
  payout: number;
  commission: number;
  completedAt: string;
};

export default function AdminTablesPage() {
  const [live, setLive] = useState<LiveTable[]>([]);
  const [history, setHistory] = useState<HistTable[]>([]);
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);

  const load = useCallback(async () => {
    const [l, h, w] = await Promise.all([
      fetch("/api/admin/tables"),
      fetch("/api/admin/tables?scope=history"),
      fetch("/api/wallet"),
    ]);
    if (l.ok) setLive((await l.json()).tables);
    if (h.ok) setHistory((await h.json()).tables);
    if (w.ok) {
      const data = await w.json();
      setBalance(data.balance);
      setPool(data.rewardPool.balance);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useLive(useCallback(() => void load(), [load]));

  return (
    <AdminFrame balance={balance} pool={pool}>
      <h2 className="font-display text-2xl">Live tables</h2>
      <div className="mt-3 space-y-3">
        {live.length === 0 && <p className="text-sm text-white/40">No open tables.</p>}
        {live.map((table) => (
          <Card key={table.id}>
            <div className="flex justify-between">
              <div>
                <p className="font-display text-2xl">{tokens(table.betAmount)}</p>
                <p className="text-xs text-white/40">
                  {table.name ?? table.id.slice(-6).toUpperCase()} · {table.seated}/{table.seats} ·{" "}
                  {Math.round(table.fillRate * 100)}%
                </p>
              </div>
              <Badge tone="pending">{table.status}</Badge>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-teal" style={{ width: `${table.fillRate * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/45">{table.players.join(" · ") || "Empty"}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 font-display text-2xl">Completed</h2>
      <div className="mt-3 space-y-2">
        {history.map((table) => (
          <div
            key={table.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-surface px-4 py-3"
          >
            <div>
              <p className="text-sm">
                {table.name ?? tokens(table.betAmount)} · {table.winner ?? "—"}
              </p>
              <p className="text-[11px] text-white/40">
                #{table.id.slice(-6).toUpperCase()} · {table.completedAt ? formatWhen(table.completedAt) : ""}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="text-[#d5e07a]">{tokens(table.payout)} paid</p>
              <p className="text-white/40">{tokens(table.commission)} fee</p>
            </div>
          </div>
        ))}
      </div>
    </AdminFrame>
  );
}
