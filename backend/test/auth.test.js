const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hashPassword,
  issueAccessToken,
  verifyAccessToken,
  verifyPassword,
} = require("../src/services/auth");

const secret = "test-secret-with-more-than-thirty-two-characters";

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("open-day-password");

  assert.notEqual(hash, "open-day-password");
  assert.equal(await verifyPassword("open-day-password", hash), true);
  assert.equal(await verifyPassword("incorrect-password", hash), false);
  assert.equal(await verifyPassword("anything", "invalid-hash"), false);
});

test("access tokens carry the account identity and role", () => {
  const now = Date.UTC(2026, 10, 22);
  const token = issueAccessToken({ id: 42, role: "admin" }, secret, now);

  assert.deepEqual(verifyAccessToken(token, secret, now), {
    id: 42,
    role: "admin",
  });
});

test("expired and modified access tokens are rejected", () => {
  const issuedAt = Date.UTC(2026, 10, 22);
  const expiredToken = issueAccessToken(
    { id: 7, role: "visitor" },
    secret,
    issuedAt - 8 * 24 * 60 * 60 * 1000
  );
  const validToken = issueAccessToken({ id: 7, role: "visitor" }, secret, issuedAt);
  const [header, payload, signature] = validToken.split(".");
  const changedSignature = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;

  assert.throws(() => verifyAccessToken(expiredToken, secret, issuedAt));
  assert.throws(() =>
    verifyAccessToken(`${header}.${payload}.${changedSignature}`, secret, issuedAt)
  );
});
