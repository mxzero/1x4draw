import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.rewardDrawWinner.deleteMany();
  await prisma.rewardDraw.deleteMany();
  await prisma.commissionLog.deleteMany();
  await prisma.draw.deleteMany();
  await prisma.tablePlayer.deleteMany();
  await prisma.gameTable.deleteMany();
  await prisma.dailyJoinStat.deleteMany();
  await prisma.wallet.updateMany({ data: { balance: 5000 } });
  await prisma.rewardPool.deleteMany();
  await prisma.rewardPool.create({
    data: { month: new Date().toISOString().slice(0, 7) },
  });
  console.log("Prototype wallets restored to 5000 PHP.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
