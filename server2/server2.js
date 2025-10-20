// Code assisted by ChatGPT (GPT-5) – COMP 4537 Lab 5

const http = require("http");
const url = require("url");
const mysql = require("mysql2");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { ca: fs.readFileSync(__dirname + "/ca.pem") }
});

db.connect(err => {
    if (err) return console.error("DB connection failed:", err);
    console.log("✅ Connected to Aiven MySQL");

    const createTable = `CREATE TABLE IF NOT EXISTS patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    age INT,
    gender VARCHAR(10),
    diagnosis VARCHAR(255)
  ) ENGINE=InnoDB;`;
    db.query(createTable);
});

const server = http.createServer((req, res) => {
    // ✅ Allow cross-origin requests from any client
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // ✅ Immediately answer preflight OPTIONS requests
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    const parsed = url.parse(req.url, true);
    const path = parsed.pathname;

    if (req.method === "GET" && parsed.pathname.startsWith("/api/v1/sql/")) {
        const sql = decodeURIComponent(parsed.pathname.replace("/api/v1/sql/", ""));
        if (!sql.toLowerCase().startsWith("select")) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Only SELECT allowed via GET" }));
        }
        db.query(sql, (err, rows) => {
            if (err) return res.end(JSON.stringify({ error: err.message }));
            res.end(JSON.stringify(rows));
        });

    } else if (req.method === "POST" && parsed.pathname === "/api/v1/sql") {
        let body = "";
        req.on("data", c => (body += c));
        req.on("end", () => {
            try {
                const { query } = JSON.parse(body);
                const lower = query.toLowerCase();
                if (!lower.startsWith("insert") || lower.includes("update") || lower.includes("drop")) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ error: "Only INSERT allowed via POST" }));
                }

                console.log("Executing query:", query);  // 👈 Add this to verify it's running

                db.query(query, (err, result) => {
                    if (err) return res.end(JSON.stringify({ error: err.message }));
                    res.end(JSON.stringify({ message: "✅ Insert OK", result }));
                });
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
        });

    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Endpoint not found" }));
    }
});

server.listen(4000, () => console.log("🌐 Server2 running on port 4000"));
