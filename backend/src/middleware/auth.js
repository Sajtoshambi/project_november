const { verifyAccessToken } = require("../services/auth");
const { HttpError } = require("../services/http-error");

function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    return next(new HttpError(401, "Authentication is required"));
  }

  try {
    req.auth = verifyAccessToken(match[1]);
    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired access token"));
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return next(new HttpError(403, "You do not have permission to perform this action"));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
