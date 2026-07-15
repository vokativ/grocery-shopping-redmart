#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOOPBACK_HOST = "127.0.0.1";

function normalizePort(value = 0) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Port must be an integer between 0 and 65535");
  }

  return port;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, LOOPBACK_HOST);
  });
}

function closeServer(server) {
  if (!server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function startCatalogReviewServer({ filePath, port = 0 } = {}) {
  if (!filePath) {
    throw new Error("A catalog review HTML file is required");
  }

  const normalizedPort = normalizePort(port);
  const resolvedFilePath = path.resolve(filePath);
  const html = await readFile(resolvedFilePath, "utf8");

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${LOOPBACK_HOST}`);
    const method = request.method ?? "GET";

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");

    if (requestUrl.pathname !== "/") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found\n");
      return;
    }

    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405, {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end("Method not allowed\n");
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(method === "HEAD" ? undefined : html);
  });

  await listen(server, normalizedPort);

  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Catalog review server did not return a TCP address");
  }

  return {
    host: LOOPBACK_HOST,
    port: address.port,
    url: `http://${LOOPBACK_HOST}:${address.port}/`,
    filePath: resolvedFilePath,
    close: () => closeServer(server)
  };
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file" || arg === "--port") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      args[arg.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printUsage() {
  console.error(
    "Usage: node tools/serve-catalog-review.mjs --file <review.html> [--port <number>]"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const runningServer = await startCatalogReviewServer({
    filePath: args.file,
    port: args.port ?? 0
  });

  console.log(`Catalog review available at ${runningServer.url}`);
  console.log("Press Ctrl+C to stop the server.");

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    await runningServer.close();
  };

  process.once("SIGINT", () => {
    shutdown().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  });
  process.once("SIGTERM", () => {
    shutdown().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    printUsage();
    process.exitCode = 1;
  });
}
