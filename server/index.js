import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import "dotenv/config";
import { createClient } from "@libsql/client";

import { createServer } from "node:http";
import { url } from "node:inspector";
import path from "node:path";
import { throws } from "node:assert";

/**Port setting */
const port = process.env.port ?? 3000;

/**Express Server */
const app = express();
const server = createServer(app);

const db = createClient({
    url: "libsql://enabling-becatron-vamesti.turso.io",
    authToken: process.env.DB_TOKEN,
});

/**Creacion de la base de datos */
await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT
    )
`);

const io = new Server(server, {
    /**Recuperar sesiones por desconeccion */
    connectionStateRecovery: {},
});

/** Donde se recibe la comunicacion del socket */

io.on("connection", async (socket) => {
    console.log("a user has conected");

    socket.on("disconnect", () => {
        console.log("a user has disconnect");
    });

    socket.on("chat messages", async (msg) => {
        /**Insercion de los datos en la tabla */
        let result;
        try {
            result = await db.execute({
                sql: "INSERT INTO messages (content) VALUES (:msg)",
                args: { msg },
            });
        } catch (e) {
            console.error(e);
            return;
        }
        io.emit("chat messages", msg, result.lastInsertRowid.toString());
    });

    /*Recuperar mensajes sin conexion */
    if (!socket.recovered) {
        try {
            const result = await db.execute({
                sql: "SELECT id, content FROM messages WHERE id > ?",
                /**Se indicia que el argumento ha untilizar sera el ultimo id que se guardo en la base de datos para recuperar los mensajes */
                args: [socket.handshake.auth.serverOffSet ?? 0],
            });

            /**Iteramos sobre las filas conseguidas por la consulta */
            result.rows.forEach((row) => {
                socket.emit("chat messages", row.content, row.id.toString());
            });
        } catch (error) {
            console.error(error);
        }
    }
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
