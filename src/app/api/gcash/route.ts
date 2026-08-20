import { NextResponse } from "next/server";
import { GCASH_ENABLED } from "@/lib/constants";
import { jsonError, requireSession } from "@/lib/api";

export async function POST() {
  try {
    await requireSession();
    if (!GCASH_ENABLED) {
      return NextResponse.json(
        {
          error: "GCash deposits and withdrawals are not activated in this prototype.",
          code: "GCASH_DISABLED",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Not implemented" }, { status: 501 });
  } catch (error) {
    return jsonError(error);
  }
}
