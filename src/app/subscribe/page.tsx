"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppFrame } from "@/components/app-frame";
import { Button, Card } from "@/components/ui";
import { SUBSCRIBE_MONTHLY_USD, SUBSCRIBE_YEARLY_USD } from "@/lib/constants";

export default function SubscribePage() {
  const router = useRouter();
  const { data, update } = useSession();
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    void fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        cardNumber: String(form.get("cardNumber") ?? ""),
        expiry: String(form.get("expiry") ?? ""),
        cvc: String(form.get("cvc") ?? ""),
        cardName: String(form.get("cardName") ?? ""),
      }),
    });
    const payload = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(payload.error ?? "Could not subscribe");
      return;
    }
    await update();
    router.push("/play");
    router.refresh();
  }

  if (data?.user.tier === "PREMIUM") {
    return (
      <AppFrame balance={balance}>
        <h1 className="font-display text-4xl">Pro subscriber</h1>
        <p className="mt-2 text-sm text-white/60">Your account is already ad-free with uncapped daily joins (up to 10,000 Tokens wagered).</p>
        <Button className="mt-4" onClick={() => router.push("/play")}>
          Back to Play
        </Button>
      </AppFrame>
    );
  }

  return (
    <AppFrame balance={balance}>
      <h1 className="font-display text-4xl">Subscribe</h1>
      <p className="text-sm text-white/50">Credit card required. Basic accounts are limited to 10 table joins per day.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPlan("monthly")}
          className={`rounded-2xl border p-4 text-left ${plan === "monthly" ? "border-sand bg-sand/10" : "border-white/10 bg-surface"}`}
        >
          <p className="text-[11px] uppercase tracking-widest text-white/40">Monthly</p>
          <p className="font-display text-3xl text-sand">${SUBSCRIBE_MONTHLY_USD.toFixed(2)}</p>
          <p className="text-xs text-white/40">per month</p>
        </button>
        <button
          type="button"
          onClick={() => setPlan("yearly")}
          className={`rounded-2xl border p-4 text-left ${plan === "yearly" ? "border-sand bg-sand/10" : "border-white/10 bg-surface"}`}
        >
          <p className="text-[11px] uppercase tracking-widest text-white/40">Yearly</p>
          <p className="font-display text-3xl text-sand">${SUBSCRIBE_YEARLY_USD.toFixed(2)}</p>
          <p className="text-xs text-white/40">per year</p>
        </button>
      </div>

      <Card className="mt-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-xs uppercase tracking-widest text-white/40">
            Name on card
            <input
              name="cardName"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
            />
          </label>
          <label className="block text-xs uppercase tracking-widest text-white/40">
            Card number
            <input
              name="cardNumber"
              required
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs uppercase tracking-widest text-white/40">
              Expiry
              <input
                name="expiry"
                required
                placeholder="MM/YY"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
              />
            </label>
            <label className="block text-xs uppercase tracking-widest text-white/40">
              CVC
              <input
                name="cvc"
                required
                inputMode="numeric"
                placeholder="123"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-sand"
              />
            </label>
          </div>
          {error && <p className="text-sm text-[#f0a8a3]">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? "Processing…" : `Pay $${plan === "yearly" ? SUBSCRIBE_YEARLY_USD.toFixed(2) : SUBSCRIBE_MONTHLY_USD.toFixed(2)}`}
          </Button>
          <p className="text-[11px] text-white/35">Card is required and is not stored. Charging is prototype-only.</p>
        </form>
      </Card>
    </AppFrame>
  );
}
