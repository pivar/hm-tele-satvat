import type { Express } from "express";
import type { Server } from "http";
import http from "http";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const FASTAPI_PORT = 5001;
let fastapiProcess: any = null;

function startFastAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Starting FastAPI backend on port", FASTAPI_PORT);
    
    fastapiProcess = spawn("python", ["-m", "uvicorn", "backend.main:app", "--reload", "--host", "0.0.0.0", "--port", String(FASTAPI_PORT)], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    fastapiProcess.stdout.on("data", (data: Buffer) => {
      const output = data.toString();
      console.log("[FastAPI]", output.trim());
      if (output.includes("Application startup complete")) {
        resolve();
      }
    });

    fastapiProcess.stderr.on("data", (data: Buffer) => {
      console.error("[FastAPI Error]", data.toString().trim());
    });

    fastapiProcess.on("error", (err: Error) => {
      console.error("Failed to start FastAPI:", err);
      reject(err);
    });

    fastapiProcess.on("exit", (code: number) => {
      console.log("FastAPI process exited with code", code);
    });

    setTimeout(resolve, 5000);
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await startFastAPI();

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.use("/api", (req, res) => {
    const proxyReq = http.request({
      hostname: "127.0.0.1",
      port: FASTAPI_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: req.headers as http.OutgoingHttpHeaders
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on("error", (err: Error) => {
      console.error("Proxy error:", err.message);
      res.status(503).json({ message: "FastAPI backend not available" });
    });
    
    if (req.rawBody) {
      proxyReq.write(req.rawBody);
      proxyReq.end();
    } else if (req.body && Object.keys(req.body).length > 0) {
      proxyReq.write(JSON.stringify(req.body));
      proxyReq.end();
    } else {
      proxyReq.end();
    }
  });

  app.use("/uploads", (req, res) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  return httpServer;
}

