import dotenv from "dotenv";
dotenv.config();  // Load .env FIRST

import express, { Request, Response } from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import { authRouter } from "./routes/auth";


const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Backend is running 🚀" });
});

app.use("/api/auth", authRouter);


const startServer = async () => {
  console.log("Loaded PORT:", process.env.PORT);
  console.log("Loaded URI:", process.env.MONGODB_URI);

  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
