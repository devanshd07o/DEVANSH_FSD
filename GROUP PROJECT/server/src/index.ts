import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { authRouter } from "./routes/auth";
import { studentRouter } from "./routes/student";
import { staffRouter } from "./routes/staff";

const app = express();
app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/v1", authRouter);
app.use("/api/v1", studentRouter);
app.use("/api/v1", staffRouter);

const clientDist = path.resolve(process.cwd(), "..", "client", "dist");
if (fs.existsSync(clientDist) && process.env.API_ONLY !== "1") {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

function startListening(port: number) {
  const srv = app.listen(port, () => {
    const addr = srv.address();
    const actual = typeof addr === "object" && addr ? addr.port : port;
    console.log(`Server running on http://localhost:${actual}`);
  });
  srv.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && !process.env.PORT) {
      const next = port === 3000 ? 3500 : port === 3500 ? 5050 : 0;
      startListening(next);
      return;
    }
    throw err;
  });
}

const basePort = Number(process.env.PORT) || (fs.existsSync(clientDist) && process.env.API_ONLY !== "1" ? 3000 : 5000);
startListening(basePort);
