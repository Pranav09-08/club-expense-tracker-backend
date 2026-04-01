import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Club Expense Backend is running 🚀",
    status: "OK",
  });
});


// 🔗 Check DB connection on startup
async function startServer() {
  try {
    await db.execute("SELECT 1");
    console.log("✅ Database connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);
    process.exit(1); // Stop app if DB is not reachable
  }
}

startServer();
