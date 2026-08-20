"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { BuyTokensButton } from "@/components/buy-tokens";
import { Badge, Button, Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { formatWhen, tokens } from "@/lib/utils";

type Row = { id: string; info: string; amount: number; tickets?: number; note: string | null; createdAt: string };

function infoTone(info: string): "win" | "lost" | "pending" | "neutral" {
  if (info === "Won" || info === "Bought") return "win";
  if (info === "Lost" || info === "Convert") return "lost";
  return "neutral";
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [days, setDays] = useState(7);
  const [tickets, setTickets] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [modal, setModal] = useState<"gcash" | "withdraw" | null>(null);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    const [wallet, tokenHist] = await Promise.all([fetch("/api/wallet"), fetch("/api/wallet/tokens")]);
    if (wallet.ok) {
      const data = await wallet.json();
      setBalance(data.balance);
      setPool(data.rewardPool.balance);
    }
    if (tokenHist.ok) {
      const data = await tokenHist.json();
      setDays(data.days);
      setTickets(data.tickets ?? 0);
      setRows(data.rows ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useLive(useCallback(() => void load(), [load]));

  async function onWithdraw(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawing(true);
    const amount = Number(new FormData(e.currentTarget).get("amount"));
    const res = await fetch("/api/wallet/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", amount }),
    });
    const data = await res.json();
    setWithdrawing(false);
    if (!res.ok) {
      setWithdrawError(data.error ?? "Could not withdraw");
      return;
    }
    setModal(null);
    await load();
  }

  return (
    <AppFrame balance={balance} pool={pool} onBalanceChange={() => void load()}>
      <h1 className="font-display text-4xl">Wallet</h1>
      <p className="text-sm text-white/45">1 Token = 1 PHP. History window: last {days} days.</p>

      <Card className="mt-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40">Available</p>
        <p className="font-display text-5xl text-sand">{tokens(balance)}</p>
        <p className="mt-3 text-[11px] uppercase tracking-widest text-white/40">Raffle tickets</p>
        <p className="font-display text-3xl text-sand">{tickets}</p>
        <div className="mt-4 space-y-2">
          <Button variant="ghost" className="w-full" onClick={() => setModal("gcash")}>
            GCash
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <BuyTokensButton className="w-full" onDone={() => void load()} />
            <Button variant="danger" onClick={() => setModal("withdraw")}>
              Withdraw Tokens
            </Button>
          </div>
        </div>
      </Card>

      <h2 className="mt-8 font-display text-2xl">History</h2>
      <p className="text-xs text-white/40">Last {days} days</p>
      <div className="mt-3 overflow-x-auto rounded-[5px] border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Info</th>
              <th className="px-3 py-2 font-medium text-right">Tickets</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-white/40">
                  No wallet activity in this window.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="px-3 py-2.5 text-white/55">{formatWhen(row.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={infoTone(row.info)}>{row.info}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right text-white/70">{row.tickets ?? 0}</td>
                <td
                  className={`px-3 py-2.5 text-right ${
                    row.amount >= 0 ? "text-[#d5e07a]" : "text-[#f0a8a3]"
                  }`}
                >
                  {row.amount >= 0 ? "+" : ""}
                  {tokens(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === "gcash" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <p className="font-display text-3xl">GCash</p>
            <p className="mt-2 text-sm text-white/65">GCash checkout is disabled in this prototype.</p>
            <Button className="mt-4 w-full" onClick={() => setModal(null)}>
              Close
            </Button>
          </Card>
        </div>
      )}

      {modal === "withdraw" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <p className="font-display text-3xl">Withdraw Tokens</p>
            <p className="mt-1 text-sm text-white/55">Deducts from your balance immediately. GCash payout is off.</p>
            <form onSubmit={onWithdraw} className="mt-4 space-y-3">
              <input
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                className="w-full rounded-[5px] border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
              />
              {withdrawError && <p className="text-sm text-[#f0a8a3]">{withdrawError}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" disabled={withdrawing} className="flex-1">
                  {withdrawing ? "Withdrawing…" : "Withdraw"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setModal(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </AppFrame>
  );
}
