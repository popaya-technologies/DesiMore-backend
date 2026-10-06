import fs from "fs/promises";
import path from "path";
import { inspect } from "util";

export const MAX_LOG_BYTES = 5 * 1024 * 1024;
export const VIEW_LOG_BYTES = 1024 * 1024;
const MAX_ENTRY_BYTES = 16 * 1024;
const sensitiveKey = /password|secret|token|authorization|cookie|api.?key|card.?number|cvv/i;

function sanitize(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ""}`;
  if (!value || typeof value !== "object") return value;
  if (depth > 6) return "[Object]";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, seen, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : sanitize(item, seen, depth + 1)]));
}

export function formatLogEntry(level: "ERROR" | "WARN", args: unknown[]) {
  const message = args.map((arg) => {
    const clean = sanitize(arg);
    return typeof clean === "string" ? clean : inspect(clean, { depth: 6, breakLength: Infinity, maxArrayLength: 100 });
  }).join(" ")
    .replace(/\bBearer\s+[^\s,;"']+/gi, "Bearer [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/((?:password|secret|accessToken|refreshToken|authorization|cookie|api[_-]?key|cvv)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;}]+)/gi, "$1[REDACTED]");
  const text = `${new Date().toISOString()} - ${level}: ${message}\n`;
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length <= MAX_ENTRY_BYTES) return text;
  return bytes.subarray(0, MAX_ENTRY_BYTES - 40).toString("utf8") + "\n[Entry truncated]\n";
}

export class ErrorLogService {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private filename = path.resolve(__dirname, "../..", process.env.ERROR_LOG_FILE || "logs/error.log")) {}

  private serialize<T>(action: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(action);
    this.queue = operation.catch(() => {});
    return operation;
  }

  private async readTail(maxBytes: number) {
    let handle: Awaited<ReturnType<typeof fs.open>>;
    try {
      handle = await fs.open(this.filename, "r");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: "", size: 0, updatedAt: null as string | null, truncated: false };
      throw error;
    }
    try {
      const stat = await handle.stat();
      if (!stat.isFile()) throw new Error("Log storage is not a regular file");
      const start = Math.max(stat.size - maxBytes, 0);
      const buffer = Buffer.alloc(Math.min(stat.size, maxBytes));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      let tail = buffer.subarray(0, bytesRead);
      if (start > 0) {
        const firstNewline = tail.indexOf(10);
        tail = firstNewline >= 0 ? tail.subarray(firstNewline + 1) : Buffer.alloc(0);
      }
      return { content: tail.toString("utf8"), size: stat.size, updatedAt: stat.size ? stat.mtime.toISOString() : null, truncated: start > 0 };
    } finally {
      await handle.close();
    }
  }

  append(level: "ERROR" | "WARN", args: unknown[]) {
    // Format immediately so changes to a caller's object cannot alter queued entries.
    const entry = formatLogEntry(level, args);
    return this.serialize(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const stat = await fs.stat(this.filename).catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      });
      if (stat && stat.size + Buffer.byteLength(entry) > MAX_LOG_BYTES) {
        const retained = await this.readTail(MAX_LOG_BYTES - MAX_ENTRY_BYTES);
        await fs.writeFile(this.filename, retained.content + entry, { mode: 0o600 });
      } else {
        await fs.appendFile(this.filename, entry, { mode: 0o600 });
      }
    });
  }

  read() { return this.serialize(() => this.readTail(VIEW_LOG_BYTES)); }
  download() { return this.serialize(async () => (await this.readTail(MAX_LOG_BYTES)).content); }
  clear() {
    return this.serialize(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      await fs.writeFile(this.filename, "", { mode: 0o600 });
      return { content: "", size: 0, updatedAt: null, truncated: false };
    });
  }
}

export const errorLogService = new ErrorLogService();
