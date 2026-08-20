"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminFrame } from "@/components/admin-frame";
import { Badge, Button, Card } from "@/components/ui";
import { tokens } from "@/lib/utils";

type UserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  tier: string;
  banned: boolean;
  balance: number;
  dailyJoins: number;
  dailySpend: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<UserRow | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (query = q) => {
    const [u, w] = await Promise.all([
      fetch(`/api/admin/users?q=${encodeURIComponent(query)}`),
      fetch("/api/wallet"),
    ]);
    if (u.ok) setUsers((await u.json()).users);
    if (w.ok) {
      const data = await w.json();
      setBalance(data.balance);
      setPool(data.rewardPool.balance);
    }
  }, [q]);

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(userId: string, action: string, extra: Record<string, unknown> = {}) {
    setBusy(userId + action);
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setAdjust(null);
    await load();
  }

  async function onAdjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adjust) return;
    const form = new FormData(e.currentTarget);
    await patch(adjust.id, "wallet", {
      amount: Number(form.get("amount")),
      note: String(form.get("note") ?? ""),
    });
  }

  return (
    <AdminFrame balance={balance} pool={pool}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username or email"
          className="flex-1 rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-sand"
        />
        <Button type="submit">Search</Button>
      </form>
      {message && <p className="mt-3 text-sm text-[#f0a8a3]">{message}</p>}

      <div className="mt-4 space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-white/40">{user.email}</p>
                <p className="mt-1 text-sm text-sand">{tokens(user.balance)}</p>
                <p className="text-[11px] text-white/40">
                  Today: {user.dailyJoins} joins · {tokens(user.dailySpend)} wagered
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={user.tier === "PREMIUM" ? "premium" : "neutral"}>{user.tier}</Badge>
                {user.banned && <Badge tone="lost">Banned</Badge>}
                {user.role === "ADMIN" && <Badge tone="pending">Admin</Badge>}
              </div>
            </div>
            {user.role !== "ADMIN" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="text-xs"
                  disabled={busy !== null}
                  onClick={() =>
                    patch(user.id, "tier", { tier: user.tier === "PREMIUM" ? "BASIC" : "PREMIUM" })
                  }
                >
                  {user.tier === "PREMIUM" ? "Make basic" : "Make premium"}
                </Button>
                <Button variant="ghost" className="text-xs" onClick={() => setAdjust(user)}>
                  Adjust wallet
                </Button>
                <Button
                  variant={user.banned ? "olive" : "danger"}
                  className="text-xs"
                  disabled={busy !== null}
                  onClick={() => patch(user.id, user.banned ? "unban" : "ban")}
                >
                  {user.banned ? "Unban" : "Ban"}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {adjust && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <Card className="w-full max-w-sm">
            <p className="font-display text-3xl">Adjust {adjust.username}</p>
            <form onSubmit={onAdjust} className="mt-4 space-y-3">
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="Amount (+ credit / − debit)"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
              />
              <input
                name="note"
                placeholder="Note"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Apply
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAdjust(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </AdminFrame>
  );
}
