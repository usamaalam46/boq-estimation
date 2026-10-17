
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "BOQ Estimation API is running",
  });
});

app.use("/api", apiRoutes);

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
