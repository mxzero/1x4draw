# 1X4 DRAW

Fixed-odds multiplayer draw. Five players, one winner, 4× payout in Tokens (1 Token = 1 PHP). GCash checkout is disabled in this prototype.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · NextAuth credentials

This prototype uses **PostgreSQL**. Set `DATABASE_URL` in `.env` (Prisma Postgres, Neon, or Docker).

## Run locally

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prototype accounts

Create a new account from the home page, or sign in as admin:

| Role | Login | Notes |
| --- | --- | --- |
| Admin | `admin@1x4.com` / `Pass123!` | Admin console |
| New user | Register | Basic, 5,000 Tokens, not a bot |
| Table bots | Seeded automatically | Random 6–10 character alphanumeric names, `bot: true` |

Beta mode seats bots into empty chairs 1s after a real player joins. The fill continues on the server if you leave the tab.

## Rules

- Stakes: 5 / 10 / 20 / 50 / 100 Tokens
- Basic: 10 table joins per day (subscribe to increase)
- Subscribe: $1.99 / month or $10.99 / year (credit card required)
- Winner 4×, 20% table fee, 20% of that fee → monthly subscriber pool
