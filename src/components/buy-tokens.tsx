"use client";

import { FormEvent, useState } from "react";
import { Button, Card } from "@/components/ui";

export function BuyTokensButton({
  className,
  onDone,
}: {
  className?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const amount = Number(new FormData(e.currentTarget).get("amount"));
    const res = await fetch("/api/wallet/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "buy", amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not buy tokens");
      return;
    }
    setOpen(false);
    onDone?.();
  }

  return (
    <>
      <Button variant="olive" className={className} onClick={() => setOpen(true)}>
        Buy Tokens
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <p className="font-display text-3xl">Buy Tokens</p>
            <p className="mt-1 text-sm text-white/55">1 Token = 1 PHP. Prototype credit — GCash is off.</p>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <input
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={100}
                className="w-full rounded-[5px] border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
              />
              {error && <p className="text-sm text-[#f0a8a3]">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="olive" disabled={loading} className="flex-1">
                  {loading ? "Buying…" : "Buy"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
