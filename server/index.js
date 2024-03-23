import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { url } from "node:inspector";
import path from "node:path";
import { throws } from "node:assert";
/**Port setting */
const port = process.env.port ?? 3000;

/**Express Server */
const app = express();
const server = createServer(app);

const io = new Server(server);

io.on("connection", (socket) => {
    console.log("a user has conected");

    socket.on("disconnect", () => {
        console.log("a user has disconnect");
    });
});

try {
    app.use(logger("dev"));
    app.get("/", (req, res) => {
        res.sendFile(process.cwd() + "/client/index.html");
    });

    app.use(express.static(path.join(process.cwd(), "/client/public")));

    server.listen(port, () => {
        console.log(`Server is running on Port ${port}`);
        console.log(`Try to go http://localhost:${port}`);
    });
} catch (error) {
    console.error(error);
}
