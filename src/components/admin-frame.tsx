"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tables", label: "Tables" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/rewards", label: "Rewards" },
];

export function AdminFrame({
  children,
  balance,
  pool,
}: {
  children: ReactNode;
  balance: number;
  pool?: number;
}) {
  const pathname = usePathname();
  return (
    <AppFrame balance={balance} pool={pool}>
      <p className="text-[11px] uppercase tracking-[0.3em] text-sand">Operator</p>
      <h1 className="font-display text-4xl">Admin</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap rounded-[5px] px-3 py-1.5 text-xs uppercase tracking-wider",
                active ? "bg-teal text-white" : "bg-white/5 text-white/50",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-5">{children}</div>
    </AppFrame>
  );
}
