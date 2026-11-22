import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dns from "node:dns";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

// Fix Node.js DNS resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);

console.log("DNS servers:", dns.getServers());

// Validate environment variables
if (!process.env.MONGO_URI && process.env.NODE_ENV !== "test") {
  console.error("MONGO_URI is missing in backend/.env");
  process.exit(1);
}

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== "test") {
  console.error("JWT_SECRET is missing in backend/.env");
  process.exit(1);
}

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// CORS configuration
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        /^https?:\/\/localhost:\d+$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Metahud Catalogue API is running",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("--------------------------------");
      console.log("Metahud Catalogue API started");
      console.log(`Server: http://localhost:${PORT}`);
      console.log("MongoDB: Connected");
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;