import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { GameError } from "@/lib/game";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new GameError("Sign in required", "UNAUTHENTICATED", 401);
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    throw new GameError("Admin only", "FORBIDDEN", 403);
  }
  return user;
}

export function jsonError(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
