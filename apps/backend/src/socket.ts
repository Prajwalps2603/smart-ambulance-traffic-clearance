import { Server } from "socket.io";
import { Mission } from "./types";

let io: Server | null = null;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_ORIGIN || "*" },
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