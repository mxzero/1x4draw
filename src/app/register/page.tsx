"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Logo } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      username: String(form.get("username") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Could not register");
      return;
    }
    const signed = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (signed?.error) {
      router.push("/login");
      return;
    }
    router.push("/play");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Logo className="mb-8 text-5xl" />
      <h1 className="font-display text-3xl">Create account</h1>
      <p className="mt-1 text-sm text-white/50">
        Starts as Basic with 5,000 Tokens (1 Token = 1 PHP). Username: 3–10 letters or numbers.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-xs uppercase tracking-widest text-white/40">
          Username
          <input
            name="username"
            required
            minLength={3}
            maxLength={10}
            pattern="[A-Za-z0-9]+"
            title="3–10 letters or numbers"
            className="mt-2 w-full rounded-[5px] border border-white/10 bg-surface px-4 py-3 text-base outline-none focus:border-sand"
          />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/40">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-[5px] border border-white/10 bg-surface px-4 py-3 text-base outline-none focus:border-sand"
          />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/40">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-2 w-full rounded-[5px] border border-white/10 bg-surface px-4 py-3 text-base outline-none focus:border-sand"
          />
        </label>
        {error && <p className="text-sm text-[#f0a8a3]">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? "Creating…" : "Join 1X4"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-white/45">
        Already have a seat?{" "}
        <Link href="/login" className="text-sand">
          Sign in
        </Link>
      </p>
    </main>
  );
}
