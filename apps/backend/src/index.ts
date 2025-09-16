import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import missionsRouter from "./routes/missions.js";
import { initMqtt } from "./mqtt.js";
import { initSocket } from "./socket.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));

app.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/v1/missions", missionsRouter);

const port = Number(process.env.PORT) || 8080;
const server = http.createServer(app);

// Socket.IO
initSocket(server);

// MQTT
const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
initMqtt(brokerUrl);

server.listen(port, () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});