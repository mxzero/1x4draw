import { PrismaClient, Tier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ANIME_EMAILS = [
  "naruto@1x4.com",
  "luffy@1x4.com",
  "goku@1x4.com",
  "ichigo@1x4.com",
  "light@1x4.com",
  "levi@1x4.com",
  "eren@1x4.com",
  "saitama@1x4.com",
  "tanjiro@1x4.com",
  "spike@1x4.com",
];

const ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";
const BOT_COUNT = 20;

function randomUsername(taken: Set<string>) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const len = 6 + Math.floor(Math.random() * 5);
    let name = "";
    for (let i = 0; i < len; i++) {
      name += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
    }
    if (taken.has(name) || /^\d+$/.test(name)) continue;
    taken.add(name);
    return name;
  }
  throw new Error("Could not generate a unique bot username");
}

async function upsertPlayer(opts: {
  username: string;
  email: string;
  passwordHash: string;
  role: "USER" | "ADMIN";
  tier: Tier;
  bot?: boolean;
}) {
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      username: opts.username,
      password: opts.passwordHash,
      role: opts.role,
      tier: opts.tier,
      banned: false,
      bot: opts.bot ?? false,
    },
    create: {
      username: opts.username,
      email: opts.email,
      password: opts.passwordHash,
      role: opts.role,
      tier: opts.tier,
      bot: opts.bot ?? false,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: { balance: 5000 },
    create: { userId: user.id, balance: 5000 },
  });

  return user;
}

async function main() {
  const passwordHash = await bcrypt.hash("Pass123!", 10);
  const month = new Date().toISOString().slice(0, 7);

  await prisma.draw.deleteMany();
  await prisma.commissionLog.deleteMany();
  await prisma.tablePlayer.deleteMany();
  await prisma.gameTable.deleteMany();

  await prisma.user.deleteMany({
    where: {
      OR: [{ bot: true }, { email: { in: ANIME_EMAILS } }],
    },
  });

  await upsertPlayer({
    username: "admin",
    email: "admin@1x4.com",
    passwordHash,
    role: "ADMIN",
    tier: "PREMIUM",
    bot: false,
  });

  const taken = new Set(["admin"]);
  const botNames: string[] = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    const username = randomUsername(taken);
    botNames.push(username);
    await upsertPlayer({
      username,
      email: `${username}@1x4.bot`,
      passwordHash,
      role: "USER",
      tier: i < 5 ? "PREMIUM" : "BASIC",
      bot: true,
    });
  }

  await prisma.appStatus.upsert({
    where: { id: "global" },
    update: { mode: "beta" },
    create: { id: "global", mode: "beta" },
  });

  await prisma.rewardPool.upsert({
    where: { month },
    update: {},
    create: { month },
  });

  console.log(
    `Seeded admin + ${BOT_COUNT} bot users (password: Pass123!), 5000 Tokens each. App status: beta.`,
  );
  console.log(`Bots: ${botNames.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
