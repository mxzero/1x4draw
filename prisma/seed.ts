import { PrismaClient, Tier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ANIME_USERS: { username: string; email: string; display: string; tier: Tier }[] = [
  { username: "naruto", email: "naruto@1x4.com", display: "Naruto Uzumaki", tier: "PREMIUM" },
  { username: "luffy", email: "luffy@1x4.com", display: "Monkey D. Luffy", tier: "PREMIUM" },
  { username: "goku", email: "goku@1x4.com", display: "Son Goku", tier: "PREMIUM" },
  { username: "ichigo", email: "ichigo@1x4.com", display: "Ichigo Kurosaki", tier: "PREMIUM" },
  { username: "light", email: "light@1x4.com", display: "Light Yagami", tier: "PREMIUM" },
  { username: "levi", email: "levi@1x4.com", display: "Levi Ackerman", tier: "PREMIUM" },
  { username: "eren", email: "eren@1x4.com", display: "Eren Yeager", tier: "PREMIUM" },
  { username: "saitama", email: "saitama@1x4.com", display: "Saitama", tier: "PREMIUM" },
  { username: "tanjiro", email: "tanjiro@1x4.com", display: "Tanjiro Kamado", tier: "BASIC" },
  { username: "spike", email: "spike@1x4.com", display: "Spike Spiegel", tier: "BASIC" },
];

async function upsertPlayer(opts: {
  username: string;
  email: string;
  passwordHash: string;
  role: "USER" | "ADMIN";
  tier: Tier;
}) {
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      username: opts.username,
      password: opts.passwordHash,
      role: opts.role,
      tier: opts.tier,
      banned: false,
    },
    create: {
      username: opts.username,
      email: opts.email,
      password: opts.passwordHash,
      role: opts.role,
      tier: opts.tier,
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

  await upsertPlayer({
    username: "admin",
    email: "admin@1x4.com",
    passwordHash,
    role: "ADMIN",
    tier: "PREMIUM",
  });

  for (const u of ANIME_USERS) {
    await upsertPlayer({
      username: u.username,
      email: u.email,
      passwordHash,
      role: "USER",
      tier: u.tier,
    });
  }

  await prisma.rewardPool.upsert({
    where: { month },
    update: {},
    create: { month },
  });

  console.log("Seeded admin@1x4.com + 10 anime users (password: Pass123!), ₱5000 each.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
