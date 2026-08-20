-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscribedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "subscriptionPlan" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "betAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" DATETIME,
    "completedAt" DATETIME
);
INSERT INTO "new_GameTable" ("betAmount", "completedAt", "filledAt", "id", "openedAt", "status") SELECT "betAmount", "completedAt", "filledAt", "id", "openedAt", "status" FROM "GameTable";
DROP TABLE "GameTable";
ALTER TABLE "new_GameTable" RENAME TO "GameTable";
CREATE INDEX "GameTable_betAmount_status_openedAt_idx" ON "GameTable"("betAmount", "status", "openedAt");
CREATE INDEX "GameTable_status_idx" ON "GameTable"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
