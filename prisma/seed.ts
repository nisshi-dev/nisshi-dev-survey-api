import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const email = process.env.ADMIN_EMAIL;
const databaseUrl = process.env.DATABASE_URL;

if (!(email && databaseUrl)) {
  console.error("ADMIN_EMAIL, DATABASE_URL environment variables are required");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});
const prisma = new PrismaClient({ adapter });

const allowed = await prisma.allowedEmail.upsert({
  where: { email },
  update: {},
  create: { email },
});

console.log(`Allowed email registered: ${allowed.email} (${allowed.id})`);

await prisma.$disconnect();
