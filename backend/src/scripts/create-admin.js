const dotenv = require("dotenv");
const db = require("../db/db");
const { users } = require("../db/schema");
const { hashPassword } = require("../services/auth");

dotenv.config();

async function createAdmin() {
  const name = process.env.AUTH_ADMIN_NAME?.trim();
  const email = process.env.AUTH_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_ADMIN_PASSWORD;

  if (!name || !email || !password || password.length < 8) {
    throw new Error(
      "Set AUTH_ADMIN_NAME, AUTH_ADMIN_EMAIL, and an AUTH_ADMIN_PASSWORD of at least 8 characters"
    );
  }

  await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
    })
    .onDuplicateKeyUpdate({
      set: {
        name,
        passwordHash: await hashPassword(password),
        role: "admin",
      },
    });

  console.log(`Administrator account provisioned for ${email}`);
}

createAdmin()
  .catch((error) => {
    console.error("Unable to provision administrator:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
