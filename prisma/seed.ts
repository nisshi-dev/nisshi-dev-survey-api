import pg from "pg";

const email = process.env.ADMIN_EMAIL;
const databaseUrl = process.env.DATABASE_URL;

if (!(email && databaseUrl)) {
  console.error("ADMIN_EMAIL, DATABASE_URL environment variables are required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

const { rows } = await client.query<{ id: string; email: string }>(
  `INSERT INTO "AllowedEmail" (id, email, "createdAt")
   VALUES (gen_random_uuid(), $1, NOW())
   ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
   RETURNING id, email`,
  [email]
);

const result = rows[0];
if (!result) {
  console.error("Failed to upsert allowed email");
  process.exit(1);
}
console.log(`Allowed email registered: ${result.email} (${result.id})`);

await client.end();
