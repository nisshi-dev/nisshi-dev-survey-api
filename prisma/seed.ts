import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "../src/lib/password.ts";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!(email && password)) {
  console.error(
    "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required"
  );
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const passwordHash = await hashPassword(password);

const user = await prisma.adminUser.upsert({
  where: { email },
  update: { passwordHash },
  create: { email, passwordHash },
});

console.log(`Admin user created/updated: ${user.email} (${user.id})`);

await prisma.$disconnect();
