"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid credentials or banned account.");
      return;
    }
    router.push("/play");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Logo className="mb-8 text-5xl" />
      <h1 className="font-display text-3xl">Sign in</h1>
      <p className="mt-1 text-sm text-white/50">Email or username · prototype accounts share Pass123!</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-xs uppercase tracking-widest text-white/40">
          Email / username
          <input
            name="email"
            required
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-base text-white outline-none focus:border-sand"
            placeholder="admin@1x4.com"
          />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/40">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-base text-white outline-none focus:border-sand"
            placeholder="Pass123!"
          />
        </label>
        {error && <p className="text-sm text-[#f0a8a3]">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? "Entering…" : "Enter 1X4"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-white/45">
        New here?{" "}
        <Link href="/register" className="text-sand">
          Create an account
        </Link>
      </p>
    </main>
  );
}
