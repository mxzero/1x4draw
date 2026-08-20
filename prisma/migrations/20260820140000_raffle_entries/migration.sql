-- CreateTable
CREATE TABLE "RaffleEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "tickets" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaffleEntry_userId_idx" ON "RaffleEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleEntry_userId_tableId_key" ON "RaffleEntry"("userId", "tableId");

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "GameTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
