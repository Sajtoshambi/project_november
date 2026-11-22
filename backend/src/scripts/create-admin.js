const dotenv = require("dotenv");
const db = require("../db/db");
const { users } = require("../db/schema");
const { hashPassword } = require("../services/auth");

dotenv.config();

async function createAdmin() {
  const name = process.env.AUTH_ADMIN_NAME?.trim();
  const email = process.env.AUTH_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_ADMIN_PASSWORD;

  if (
    !name ||
    !email ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw new Error(
      "Set valid AUTH_ADMIN_NAME, AUTH_ADMIN_EMAIL, and an AUTH_ADMIN_PASSWORD between 8 and 128 characters"
    );
  }

  const passwordHash = await hashPassword(password);
  await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: "admin",
    })
    .onDuplicateKeyUpdate({
      set: {
        name,
        passwordHash,
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
