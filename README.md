# 1X4 DRAW

Fixed-odds multiplayer draw. Five players, one winner, 4× payout in Tokens (1 Token = 1 PHP). GCash checkout is disabled in this prototype.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · NextAuth credentials

This prototype uses **SQLite** locally. `docker-compose.yml` is included if you switch Prisma to PostgreSQL.

## Run locally

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prototype accounts

Password for all seeded users: `Pass123!`

| Role | Login | Notes |
| --- | --- | --- |
| Admin | `admin@1x4.com` | Auto-fills remaining seats (1s delay, 2s on 100) |
| Pro | `naruto@1x4.com` … `saitama@1x4.com` | Ad-free, raffle-eligible |
| Basic | `tanjiro@1x4.com`, `spike@1x4.com` | Ads + 10 joins/day |

Each wallet starts at 5,000 Tokens.

## Rules

- Stakes: 5 / 10 / 20 / 50 / 100 Tokens
- Basic: 10 table joins per day (subscribe to increase)
- Subscribe: $1.99 / month or $10.99 / year (credit card required)
- Winner 4×, 20% table fee, 10% of that fee → monthly subscriber pool
