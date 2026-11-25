import http from "node:http";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

dotenv.config();

const port = Number(process.env.PORT || 4000);
const host = "0.0.0.0";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const jwtSecret = process.env.JWT_SECRET || "platoya-udea-2026-secreto-largo-y-seguro";

async function start() {
  await connectDB(process.env.MONGODB_URI);

  const app = createApp(clientOrigin);
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Autenticación WebSocket requerida"));
    try {
      const payload = jwt.verify(token, jwtSecret);
      socket.user = payload;
      return next();
    } catch {
      return next(new Error("Token WebSocket inválido"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.sub;
    const role = socket.user?.role;
    if (userId) socket.join(`user:${userId}`);
    if (role === "logistica") socket.join("logistics");
  });

  app.set("io", io);

  server.listen(port, host, () => {
    console.log(`Servidor LibroYa escuchando en http://${host}:${port}`);
  });
}

start().catch((err) => {
  console.error("Fallo al iniciar el servidor:", err.message);
  process.exit(1);
});