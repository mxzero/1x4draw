export const BET_VALUES = [5, 10, 20, 50, 100] as const;
export type BetValue = (typeof BET_VALUES)[number];

export const PLAYERS_PER_TABLE = 5;
export const MAX_ACTIVE_TABLES_PER_BET = 100;
export const WINNER_MULTIPLIER = 4;
export const COMMISSION_RATE = 0.2;
export const REWARD_POOL_SHARE_OF_COMMISSION = 0.2;
export const BASIC_DAILY_JOIN_LIMIT = 10;
export const PREMIUM_DAILY_SPEND_CAP = 10_000;
export const BASIC_HISTORY_DAYS = 7;
export const PREMIUM_HISTORY_DAYS = 30;
export const STARTING_BALANCE = 5000;
export const MONTHLY_RAFFLE_WINNERS = 10;
export const GCASH_ENABLED = process.env.GCASH_ENABLED === "true";
export const SUBSCRIBE_MONTHLY_USD = 1.99;
export const SUBSCRIBE_YEARLY_USD = 10.99;
export const AUTO_JOIN_DELAY_MS = 1000;
export const BETA_AUTO_JOIN_DELAY_MS = 1000;
export const TICKET_TOKEN_UNIT = 10;

export function ticketsForLoss(betAmount: number) {
  return Math.floor(betAmount / TICKET_TOKEN_UNIT);
}

export function isBetValue(value: number): value is BetValue {
  return (BET_VALUES as readonly number[]).includes(value);
}

export function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
