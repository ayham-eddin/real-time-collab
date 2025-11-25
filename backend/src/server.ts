// -----------------------------------------------------------
// Load environment variables BEFORE anything else
// -----------------------------------------------------------
import dotenv from "dotenv";
dotenv.config();  // MUST be first (important for env loading)

// -----------------------------------------------------------
// Core dependencies
// -----------------------------------------------------------
import express, { Request, Response } from "express";
import cors from "cors";
import http from "http";  // Needed to bind WebSockets + Express together

// -----------------------------------------------------------
// Internal modules
// -----------------------------------------------------------
import { connectDB } from "./config/db";          // MongoDB connection
import { createSocketServer } from "./socket";    // Socket.io / WebSocket server
import { authRouter } from "./routes/auth";       // Auth routes (register, login)
import { authMiddleware } from "./middleware/auth";  // JWT middleware
import { documentRouter } from "./routes/document";  // Document CRUD routes

// -----------------------------------------------------------
// Express app initialization
// -----------------------------------------------------------
const app = express();

// Enable CORS (allow frontend to communicate with backend)
app.use(cors());

// Express JSON parser for incoming JSON bodies
app.use(express.json());

// -----------------------------------------------------------
// Server configuration
// -----------------------------------------------------------
const PORT = process.env.PORT || 4000;  // Default: 4000

// Create HTTP server to host BOTH Express API + Socket.io
const server = http.createServer(app);

// Initialize WebSocket server
const io = createSocketServer(server);

// -----------------------------------------------------------
// Basic API route for health check
// -----------------------------------------------------------
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Backend is running 🚀" });
});

// -----------------------------------------------------------
// Authentication routes
// /api/auth/register
// /api/auth/login
// -----------------------------------------------------------
app.use("/api/auth", authRouter);

// -----------------------------------------------------------
// Protected test route (requires valid JWT token)
// -----------------------------------------------------------
app.get("/api/protected", authMiddleware, (req: any, res: any) => {
  res.json({
    message: "Access granted",
    userId: req.userId,   // Added by authMiddleware after decoding JWT
  });
});

// -----------------------------------------------------------
// Document routes (Protected)
// /api/documents/
// /api/documents/:id
// -----------------------------------------------------------
app.use("/api/documents", documentRouter);

// -----------------------------------------------------------
// Start server function
// Connect to MongoDB, then start listening for requests
// -----------------------------------------------------------
const startServer = async () => {
  await connectDB();  // Connect to MongoDB BEFORE starting server

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
