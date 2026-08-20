"use client";

import { useCallback, useEffect, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { Button, Card } from "@/components/ui";
import { useLive } from "@/hooks/use-live";
import { formatWhen, tokens } from "@/lib/utils";

type Ledger = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [pool, setPool] = useState(0);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [modal, setModal] = useState<"gcash" | "buy" | "convert" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/wallet");
    if (!res.ok) return;
    const data = await res.json();
    setBalance(data.balance);
    setPool(data.rewardPool.balance);
    setLedger(data.ledger);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useLive(useCallback(() => void load(), [load]));

  return (
    <AppFrame balance={balance} pool={pool}>
      <h1 className="font-display text-4xl">Wallet</h1>
      <p className="text-sm text-white/45">1 Token = 1 PHP. Tokens are used for joins, wins, and raffle credits.</p>

      <Card className="mt-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40">Available</p>
        <p className="font-display text-5xl text-sand">{tokens(balance)}</p>
        <div className="mt-4 space-y-2">
          <Button variant="ghost" className="w-full" onClick={() => setModal("gcash")}>
            GCash
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="olive" onClick={() => setModal("buy")}>
              Buy Tokens
            </Button>
            <Button variant="danger" onClick={() => setModal("convert")}>
              Convert Tokens
            </Button>
          </div>
        </div>
      </Card>

      <h2 className="mt-8 font-display text-2xl">Ledger</h2>
      <div className="mt-3 space-y-2">
        {ledger.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-surface px-4 py-3"
          >
            <div>
              <p className="text-sm">{row.note || row.type}</p>
              <p className="text-[11px] text-white/40">{formatWhen(row.createdAt)}</p>
            </div>
            <p className={row.amount >= 0 ? "text-[#d5e07a]" : "text-[#f0a8a3]"}>
              {row.amount >= 0 ? "+" : ""}
              {tokens(row.amount)}
            </p>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <p className="font-display text-3xl">
              {modal === "gcash" ? "GCash" : modal === "buy" ? "Buy Tokens" : "Convert Tokens"}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {modal === "gcash"
                ? "GCash checkout is disabled in this prototype."
                : "GCash is not activated. Seeded wallets start at 5,000 Tokens for testing. 1 Token = 1 PHP."}
            </p>
            <Button className="mt-4 w-full" onClick={() => setModal(null)}>
              Close
            </Button>
          </Card>
        </div>
      )}
    </AppFrame>
  );
}
