const path = require("path");
const dotenv = require("dotenv");
const express = require("express");

// Load shared .env from project root, with optional local fallback
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const authRouter = require("./routes/auth");
const { getAuthSecret } = require("./services/auth");
const { HttpError } = require("./services/http-error");

const app = express();
const PROJECT_NAME = process.env.PROJECT_NAME || "fullstack";
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5173;

// Configure allowed CORS origins dynamically based on FRONTEND_PORT
const allowedOrigins = [
  `http://localhost:${FRONTEND_PORT}`,
  `http://127.0.0.1:${FRONTEND_PORT}`,
  process.env.CORS_ORIGIN,
].filter(Boolean);

// CORS middleware setup (supports both npm cors package and native middleware)
let corsMiddleware;
try {
  const cors = require("cors");
  corsMiddleware = cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });
} catch {
  // Built-in fallback CORS middleware
  corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      } else {
        res.setHeader("Access-Control-Allow-Origin", "*");
      }
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  };
}

app.use(corsMiddleware);
app.use(express.json({ limit: "16kb" }));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    projectName: PROJECT_NAME,
    message: "Express API is healthy and operational",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    backendPort: PORT,
    frontendPort: FRONTEND_PORT,
    corsAllowedOrigins: allowedOrigins,
  });
});

app.use("/api/auth", authRouter);

app.use((req, res, next) => {
  next(new HttpError(404, "Route not found"));
});

app.use((err, req, res, next) => {
  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
      ? err.status
      : 500;
  if (status >= 500) {
    console.error("[SERVER ERROR]", err);
  }
  res.status(status).json({
    error: status >= 500 ? "Internal Server Error" : err.message,
  });
});

function startServer() {
  getAuthSecret();
  return app.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(`[${PROJECT_NAME}] Express API running on http://localhost:${PORT}`);
    console.log(`CORS enabled for Frontend Port: ${FRONTEND_PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`==============================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
