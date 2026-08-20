import Link from "next/link";
import { Logo } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Fixed-odds multiplayer</p>
        <Logo className="mt-4 text-7xl" />
        <p className="mt-4 max-w-xs text-white/70">
          Five seats. One draw. Winner takes 4× the stake. 20% table fee funds the house — 10% of that feeds the monthly subscriber pool.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/login"
          className="block rounded-[5px] bg-teal py-3.5 text-center text-sm font-medium"
        >
          Enter
        </Link>
        <Link
          href="/register"
          className="block rounded-[5px] border border-white/15 py-3.5 text-center text-sm text-white/80"
        >
          Create account
        </Link>
        <p className="pt-4 text-center text-[11px] leading-relaxed text-white/35">
          Prototype · GCash is off. New accounts start at 5,000 Tokens (1 Token = 1 PHP).
          <br />
          Admin: admin@1x4.com · password: Pass123!
        </p>
      </div>
    </main>
  );
}
