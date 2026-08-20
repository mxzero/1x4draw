"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminFrame } from "@/components/admin-frame";
import { Badge, Button, Card } from "@/components/ui";
import { formatWhen, tokens } from "@/lib/utils";

type Eligible = {
  id: string;
  username: string;
  email: string;
  tier: string;
  bot?: boolean;
  createdAt: string;
  subscribedAt: string | null;
  subscriptionPlan: string | null;
};
type History = {
  month: string;
  totalCommission: number;
  raffleIn: number;
  raffleOut: number;
  balance: number;
  draws: {
    id: string;
    drawnAt: string;
    totalAmount: number;
    winners: { username: string; amount: number }[];
  }[];
};

export default function AdminRewardsPage() {
  const [balance, setBalance] = useState(0);
  const [poolBal, setPoolBal] = useState(0);
  const [commission, setCommission] = useState(0);
  const [eligible, setEligible] = useState<Eligible[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [r, w] = await Promise.all([fetch("/api/admin/rewards"), fetch("/api/wallet")]);
    if (r.ok) {
      const data = await r.json();
      setPoolBal(data.pool.balance);
      setCommission(data.pool.totalCommission);
      setEligible(data.eligible);
      setHistory(data.history);
    }
    if (w.ok) {
      const data = await w.json();
      setBalance(data.balance);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function draw() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/rewards", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Draw failed");
      return;
    }
    setMessage(`Distributed ${tokens(data.total)} to ${data.winners.length} subscribers.`);
    await load();
  }

  const proCount = eligible.filter((u) => u.tier === "PREMIUM").length;

  return (
    <AdminFrame balance={balance} pool={poolBal}>
      <Card>
        <p className="text-[11px] uppercase tracking-widest text-white/40">Current jackpot</p>
        <p className="font-display text-5xl text-sand">{tokens(poolBal)}</p>
        <p className="mt-1 text-xs text-white/40">
          20% table fees this month: {tokens(commission)} · 20% of fees sit in this pool
        </p>
        <Button className="mt-4" disabled={busy || poolBal <= 0} onClick={draw}>
          {busy ? "Drawing…" : "Draw 10 subscribers"}
        </Button>
        {message && <p className="mt-3 text-sm text-sand">{message}</p>}
      </Card>

      <h2 className="mt-8 font-display text-2xl">Eligible subscribers</h2>
      <p className="text-xs text-white/40">
        {eligible.length} users · {proCount} pro (raffle uses pro only)
      </p>
      <div className="mt-3 space-y-2">
        {eligible.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-surface px-4 py-3"
          >
            <div>
              <p className="text-sm">{u.username}</p>
              <p className="text-[11px] text-white/40">
                Joined {formatWhen(u.createdAt)}
                {u.subscriptionPlan ? ` · ${u.subscriptionPlan}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {u.bot && <Badge tone="pending">Bot</Badge>}
              <Badge tone={u.tier === "PREMIUM" ? "premium" : "neutral"}>
                {u.tier === "PREMIUM" ? "Pro" : "Basic"}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-2xl">Past draws</h2>
      <div className="mt-3 space-y-3">
        {history.flatMap((month) =>
          month.draws.map((d) => (
            <Card key={d.id}>
              <p className="text-sm text-white/50">
                {month.month} · {formatWhen(d.drawnAt)} · {tokens(d.totalAmount)}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {d.winners.map((w) => (
                  <li key={w.username} className="flex justify-between">
                    <span>{w.username}</span>
                    <span className="text-[#d5e07a]">{tokens(w.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )),
        )}
        {history.every((h) => h.draws.length === 0) && (
          <p className="text-sm text-white/40">No raffle draws yet.</p>
        )}
      </div>
    </AdminFrame>
  );
}
