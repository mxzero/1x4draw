import { jsonError, requireSession } from "@/lib/api";
import { subscribeGlobal, subscribeUser, type AppEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const encoder = new TextEncoder();
    let ping: ReturnType<typeof setInterval> | undefined;
    let unsubUser = () => undefined as void;
    let unsubGlobal = () => undefined as void;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: AppEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            /* stream closed */
          }
        };

        send({ type: "PING" });
        unsubUser = subscribeUser(user.id, send);
        unsubGlobal = subscribeGlobal(send);
        ping = setInterval(() => send({ type: "PING" }), 15000);

        request.signal.addEventListener("abort", () => {
          if (ping) clearInterval(ping);
          unsubUser();
          unsubGlobal();
        });
      },
      cancel() {
        if (ping) clearInterval(ping);
        unsubUser();
        unsubGlobal();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
