const express = require("express");
const { eq } = require("drizzle-orm");

const db = require("../db/db");
const { users } = require("../db/schema");
const { authenticate } = require("../middleware/auth");
const { hashPassword, issueAccessToken, verifyPassword } = require("../services/auth");
const { HttpError } = require("../services/http-error");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (!name || name.length > 255) {
      throw new HttpError(400, "name is required and must be at most 255 characters");
    }
    if (!emailPattern.test(email) || email.length > 255) {
      throw new HttpError(400, "A valid email address is required");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      throw new HttpError(400, "password must be between 8 and 128 characters");
    }

    const passwordHash = await hashPassword(password);
    const [result] = await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: "visitor",
    });
    const user = { id: result.insertId, name, email, role: "visitor" };

    return res.status(201).json({
      user,
      token: issueAccessToken(user),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return next(new HttpError(409, "An account with this email already exists"));
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = req.body || {};
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || typeof password !== "string" || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    return res.status(200).json({
      user: publicUser(user),
      token: issueAccessToken(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.auth.id))
      .limit(1);
    if (!user) {
      throw new HttpError(401, "Account no longer exists");
    }
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
