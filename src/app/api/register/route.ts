import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { STARTING_BALANCE } from "@/lib/constants";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  const username = body.username?.trim().toLowerCase();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!username || username.length < 3 || username.length > 10 || !/^[a-z0-9]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–10 letters or numbers" },
      { status: 400 },
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const taken = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (taken) {
    return NextResponse.json({ error: "Username or email already in use" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hash,
      wallet: { create: { balance: STARTING_BALANCE } },
    },
    select: { id: true, username: true, email: true },
  });

  return NextResponse.json({ user });
}
