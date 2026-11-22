const { promisify } = require("node:util");
const { createHmac, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require("node:crypto");

const scrypt = promisify(scryptCallback);
const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

function getAuthSecret(secret = process.env.AUTH_SECRET) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  return secret;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, encodedSalt, encodedKey, extra] = String(encodedHash).split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedKey || extra !== undefined) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");
  if (salt.length !== 16 || expectedKey.length !== 64) {
    return false;
  }

  const actualKey = await scrypt(password, salt, expectedKey.length);
  return timingSafeEqual(expectedKey, actualKey);
}

function issueAccessToken(user, secret = process.env.AUTH_SECRET, now = Date.now()) {
  const key = getAuthSecret(secret);
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url"
  );
  const issuedAt = Math.floor(now / 1000);
  const encodedPayload = Buffer.from(
    JSON.stringify({
      sub: String(user.id),
      role: user.role,
      iat: issuedAt,
      exp: issuedAt + TOKEN_LIFETIME_SECONDS,
    })
  ).toString("base64url");
  const content = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", key).update(content).digest("base64url");
  return `${content}.${signature}`;
}

function verifyAccessToken(token, secret = process.env.AUTH_SECRET, now = Date.now()) {
  const key = getAuthSecret(secret);
  if (typeof token !== "string" || token.length > 4096) {
    throw new Error("Invalid access token");
  }

  const [encodedHeader, encodedPayload, signature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature || extra !== undefined) {
    throw new Error("Invalid access token");
  }

  const content = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", key).update(content).digest();
  let actualSignature;
  let payload;

  try {
    actualSignature = Buffer.from(signature, "base64url");
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new Error("Invalid access token");
    }
  } catch {
    throw new Error("Invalid access token");
  }

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature) ||
    !/^\d+$/.test(payload.sub) ||
    !["visitor", "admin"].includes(payload.role) ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= Math.floor(now / 1000)
  ) {
    throw new Error("Invalid or expired access token");
  }

  return { id: Number(payload.sub), role: payload.role };
}

module.exports = {
  getAuthSecret,
  hashPassword,
  verifyPassword,
  issueAccessToken,
  verifyAccessToken,
};
