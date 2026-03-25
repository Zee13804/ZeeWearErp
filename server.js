const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch (_) {}

const Module = require("module");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  if (request === "@prisma/client" && parent && parent.filename && parent.filename.includes(path.join("backend", "src"))) {
    const backendPrisma = path.join(__dirname, "backend", "node_modules", "@prisma", "client");
    return originalResolveFilename.call(this, backendPrisma, parent, ...args);
  }
  return originalResolveFilename.call(this, request, parent, ...args);
};

const express = require("express");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "5000", 10);

const REQUEST_TIMEOUT_MS = 30000;

const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server = express();

  server.use((req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`[TIMEOUT] ${req.method} ${req.url} timed out after ${REQUEST_TIMEOUT_MS}ms`);
        res.status(503).json({ error: "Request timed out. Please try again." });
      }
    }, REQUEST_TIMEOUT_MS);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  });

  const backendApp = require("./backend/src/server");
  server.use("/api", backendApp);

  server.all("/{*path}", (req, res) => {
    return handle(req, res);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Server ready on http://0.0.0.0:${port}`);
  });
});
