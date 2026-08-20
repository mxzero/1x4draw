"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminFrame } from "@/components/admin-frame";
import { Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { tokens } from "@/lib/utils";

type Stats = {
  totalVolume: number;
  totalEarnings: number;
  totalDistributed: number;
  rewardRouted: number;
  rewardPoolBalance: number;
  rewardPoolCommission: number;
  month: string;
  openTables: number;
  completedToday: number;
  userCount: number;
  tablesPlayed: number;
};

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [balance, setBalance] = useState(0);

  const load = useCallback(async () => {
    const [s, w] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/wallet")]);
    if (s.ok) setStats(await s.json());
    if (w.ok) {
      const data = await w.json();
      setBalance(data.balance);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useLive(useCallback(() => void load(), [load]));

  const cards = stats
    ? [
        { label: "Volume processed", value: tokens(stats.totalVolume), hint: `${stats.tablesPlayed} completed tables` },
        { label: "Platform earnings (20%)", value: tokens(stats.totalEarnings), hint: "One stake per filled table" },
        { label: "Paid to winners (80%)", value: tokens(stats.totalDistributed), hint: "4× stake" },
        { label: "Reward pool (20% of fees)", value: tokens(stats.rewardPoolBalance), hint: `${stats.month} jackpot` },
      ]
    : [];

  return (
    <AdminFrame balance={balance} pool={stats?.rewardPoolBalance}>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-[11px] uppercase tracking-widest text-white/40">{c.label}</p>
            <p className="font-display text-3xl text-sand">{c.value}</p>
            <p className="text-xs text-white/40">{c.hint}</p>
          </Card>
        ))}
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Card>
            <p className="font-display text-2xl">{stats.openTables}</p>
            <p className="text-[11px] text-white/40">Open tables</p>
          </Card>
          <Card>
            <p className="font-display text-2xl">{stats.completedToday}</p>
            <p className="text-[11px] text-white/40">Draws today</p>
          </Card>
          <Card>
            <p className="font-display text-2xl">{stats.userCount}</p>
            <p className="text-[11px] text-white/40">Players</p>
          </Card>
        </div>
      )}
      <p className="mt-4 text-xs text-white/35">
        Commission logged per table is 20% of the pot (equal to one player&apos;s stake). 20% of that
        commission is routed into the monthly subscriber reward pool.
      </p>
    </AdminFrame>
  );
}
