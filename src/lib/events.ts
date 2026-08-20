export type AppEvent = {
  type: "DRAW_COMPLETE" | "TABLE_UPDATE" | "WALLET" | "REWARD_DRAW" | "PING";
  [key: string]: unknown;
};

type Handler = (event: AppEvent) => void;

const userHandlers = new Map<string, Set<Handler>>();
const globalHandlers = new Set<Handler>();

export function subscribeUser(userId: string, handler: Handler) {
  let set = userHandlers.get(userId);
  if (!set) {
    set = new Set();
    userHandlers.set(userId, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
    if (set && set.size === 0) userHandlers.delete(userId);
  };
}

export function subscribeGlobal(handler: Handler) {
  globalHandlers.add(handler);
  return () => {
    globalHandlers.delete(handler);
  };
}

export function emitToUser(userId: string, event: AppEvent) {
  const set = userHandlers.get(userId);
  if (set) {
    for (const handler of set) handler(event);
  }
}

export function emitToUsers(userIds: string[], event: AppEvent) {
  for (const id of userIds) emitToUser(id, event);
}

export function emitGlobal(event: AppEvent) {
  for (const handler of globalHandlers) handler(event);
}
