import express from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { parseMessages } from "./jev.ts";
import { generateChatReply } from "./chat-reply.ts";
let raw = "";
try {
  raw = readFileSync(resolve(".env"), "utf8").trim();
} catch {
  /* environment variables also supported */
}
const env = parse(raw);
const key =
  process.env.TYPESAFE_API_KEY ||
  process.env.JEV_API_KEY ||
  env.TYPESAFE_API_KEY ||
  env.JEV_API_KEY ||
  (!raw.includes("\n") && !raw.includes("=") && !/\s/.test(raw) ? raw : "");
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.get("/api/health", (_req, res) =>
  res.json({ configured: Boolean(key), model: "jev-latest" }),
);
let active = 0;
app.post("/api/chat", async (req, res) => {
  const origin = req.get("origin");
  if (
    origin &&
    origin !== `http://${req.get("host")}` &&
    origin !== `https://${req.get("host")}`
  ) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }
  if (!key) {
    res.status(503).json({
      error: "Add TYPESAFE_API_KEY to .env, then restart the server.",
    });
    return;
  }
  let messages;
  try {
    messages = parseMessages(req.body?.messages);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }
  const mode = req.body?.mode ?? 'words';
  if (mode !== 'words') { res.status(400).json({error:'Unknown decoder mode.'}); return; }
  if (active >= 3) {
    res.status(429).json({ error: "Jev is busy. Try again in a moment." });
    return;
  }
  active++;
  res.set({
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), 180000);
  const emit = (event: object) => {
    if (!res.destroyed) res.write(JSON.stringify(event) + "\n");
  };
  const started = Date.now();
  try {
    for await (const event of generateChatReply(key, messages, controller.signal)) {
      emit({ ...event, elapsed: Date.now() - started });
    }
  } catch (error) {
    if (!res.destroyed)
      emit({
        type: "error",
        error: controller.signal.aborted
          ? "Time limit reached. You can send another message."
          : (error as Error).name === "TimeoutError"
            ? "TypeSafe timed out. Please try again."
            : (error as Error).message,
      });
  } finally {
    clearTimeout(timeout);
    active--;
    res.end();
  }
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || env.PORT || 3000);
app.listen(port, "127.0.0.1", () =>
  console.log(`Jot → http://localhost:${port}`),
);
