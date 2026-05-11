import "dotenv/config";
import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./realtime/socket";
const app = createApp();
const server = http.createServer(app);
initSocket(server);
server.listen(env.port, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`API running at http://0.0.0.0:${env.port}`);
});
