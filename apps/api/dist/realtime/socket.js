import { Server } from "socket.io";
let io = null;
export function initSocket(server) {
    io = new Server(server, { cors: { origin: "*" } });
    io.on("connection", (socket) => {
        socket.on("join", (room) => socket.join(room));
    });
    return io;
}
export function getIo() {
    if (!io)
        throw new Error("Socket server not initialized");
    return io;
}
