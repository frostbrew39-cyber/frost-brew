import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { parseFrontendOrigins } from "../config/env";

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  const allowedOrigins = parseFrontendOrigins();
  io = new Server(server, {
    cors: {
      origin: allowedOrigins?.length ? allowedOrigins : "*",
      methods: ["GET", "POST", "HEAD", "OPTIONS"]
    }
  });
  io.on("connection", (socket) => {
    socket.on("join", (room: string) => socket.join(room));
  });
  return io;
}

export function getIo() {
  if (!io) throw new Error("Socket server not initialized");
  return io;
}

