import { PrismaClient } from "@prisma/client";
import { joinBet } from "../src/lib/game";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@1x4.com" } });
  const before = await prisma.wallet.findMany({ include: { user: { select: { username: true } } } });
  console.log(
    "balances before",
    before.map((w) => `${w.user.username}:${w.balance}`).join(" | "),
  );

  const result = await joinBet(admin.id, 5);
  console.log(JSON.stringify(result, null, 2));

  const after = await prisma.wallet.findMany({ include: { user: { select: { username: true } } } });
  console.log(
    "balances after",
    after.map((w) => `${w.user.username}:${w.balance}`).join(" | "),
  );

  const pool = await prisma.rewardPool.findMany();
  console.log("reward pools", pool);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
