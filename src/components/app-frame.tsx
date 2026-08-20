"use client";

import { AdBanner, AppHeader, BottomNav } from "@/components/chrome";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppFrame({
  children,
  balance,
  pool,
  onBalanceChange,
}: {
  children: ReactNode;
  balance: number;
  pool?: number;
  onBalanceChange?: () => void;
}) {
  const { data } = useSession();
  const pathname = usePathname();
  const premium = data?.user.tier === "PREMIUM";
  const isAdmin = data?.user.role === "ADMIN";
  const showAd = !premium && !pathname.startsWith("/admin");
  const showBuy = pathname === "/play" || pathname === "/history";

  return (
    <div className="min-h-dvh bg-ink">
      <AppHeader
        balance={balance}
        pool={pool}
        premium={!!premium}
        showBuy={showBuy}
        onBalanceChange={onBalanceChange}
      />
      <main className={`mx-auto max-w-3xl px-4 py-5 ${showAd ? "safe-bottom mb-16" : "safe-bottom"}`}>
        {children}
      </main>
      {showAd && <AdBanner />}
      <BottomNav isAdmin={!!isAdmin} />
    </div>
  );
}
