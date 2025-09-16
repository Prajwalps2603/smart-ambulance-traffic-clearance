import "dotenv/config";
import * as http from "http";
import express, { Request, Response } from "express";
import cors from "cors";

import missionsRouter from "./routes/missions";
import { initMqtt } from "./mqtt";
import { initSocket } from "./socket";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.use("/api/v1/missions", missionsRouter);


const PORT = Number(process.env.PORT || 8080);
const MQTT_BROKER = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

const server = http.createServer(app);
initSocket(server);
initMqtt(MQTT_BROKER);

server.listen(PORT, () => {
  console.log(`[HTTP] Listening on http://localhost:${PORT}`);
});