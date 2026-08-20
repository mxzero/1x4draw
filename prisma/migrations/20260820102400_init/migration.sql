-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BASIC', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('OPEN', 'FULL', 'DRAWING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlayerResult" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('BET', 'WIN', 'DEPOSIT', 'WITHDRAW', 'REWARD', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "GCashType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "GCashStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "tier" "Tier" NOT NULL DEFAULT 'BASIC',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "bot" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPlan" TEXT,
    "subscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyJoinStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyJoinStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "betAmount" INTEGER NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TablePlayer" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "PlayerResult" NOT NULL DEFAULT 'PENDING',
    "payout" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "TablePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "winnerId" TEXT NOT NULL,
    "betAmount" INTEGER NOT NULL,
    "winnerPayout" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "rewardShare" DECIMAL(65,30) NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLog" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "rewardShare" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardPool" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "raffleIn" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "raffleOut" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardDraw" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "winnerCount" INTEGER NOT NULL,

    CONSTRAINT "RewardDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardDrawWinner" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "RewardDrawWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GCashTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GCashType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "GCashStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "GCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetLock" (
    "betAmount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetLock_pkey" PRIMARY KEY ("betAmount")
);

-- CreateTable
CREATE TABLE "SystemLock" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppStatus" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "mode" TEXT NOT NULL DEFAULT 'beta',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyJoinStat_userId_date_key" ON "DailyJoinStat"("userId", "date");

-- CreateIndex
CREATE INDEX "GameTable_betAmount_status_openedAt_idx" ON "GameTable"("betAmount", "status", "openedAt");

-- CreateIndex
CREATE INDEX "GameTable_status_idx" ON "GameTable"("status");

-- CreateIndex
CREATE INDEX "TablePlayer_userId_result_idx" ON "TablePlayer"("userId", "result");

-- CreateIndex
CREATE UNIQUE INDEX "TablePlayer_tableId_userId_key" ON "TablePlayer"("tableId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Draw_tableId_key" ON "Draw"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLog_tableId_key" ON "CommissionLog"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardPool_month_key" ON "RewardPool"("month");

-- CreateIndex
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyJoinStat" ADD CONSTRAINT "DailyJoinStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablePlayer" ADD CONSTRAINT "TablePlayer_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "GameTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablePlayer" ADD CONSTRAINT "TablePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "GameTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLog" ADD CONSTRAINT "CommissionLog_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "GameTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDraw" ADD CONSTRAINT "RewardDraw_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "RewardPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDrawWinner" ADD CONSTRAINT "RewardDrawWinner_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "RewardDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDrawWinner" ADD CONSTRAINT "RewardDrawWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GCashTransaction" ADD CONSTRAINT "GCashTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GCashTransaction" ADD CONSTRAINT "GCashTransaction_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
