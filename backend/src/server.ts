// Load environment variables first
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import http from "http";

import { connectDB } from "./config/db";
import { createSocketServer } from "./socket";
import { authRouter } from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import { documentRouter } from "./routes/document";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize WebSocket server (Socket.io)
createSocketServer(server);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Backend is running 🚀" });
});

app.use("/api/auth", authRouter);

app.get("/api/protected", authMiddleware, (req: any, res: any) => {
  res.json({
    message: "Access granted",
    userId: req.userId,
  });
});

app.use("/api/documents", documentRouter);

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
