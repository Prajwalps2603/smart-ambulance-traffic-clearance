import type { Server } from "socket.io";
import { Mission } from "./types.js";

let io: Server | null = null;

export function initSocket(server: any) {
  const { Server: IOServer } = await import("socket.io");
  io = new IOServer(server, {
    cors: { origin: process.env.FRONTEND_ORIGIN || "*" }
  });
  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected", socket.id);
    socket.on("disconnect", () => console.log("[Socket.IO] Client disconnected", socket.id));
  });
  return io;
}

export function emitMissionUpdate(event: string, mission: Mission) {
  io?.emit(event, mission);
}