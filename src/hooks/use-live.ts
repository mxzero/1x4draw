"use client";

import { useEffect, useRef } from "react";
import type { AppEvent } from "@/lib/events";

export function useLive(onEvent: (event: AppEvent) => void) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AppEvent;
        if (event.type !== "PING") cb.current(event);
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => source.close();
  }, []);
}
