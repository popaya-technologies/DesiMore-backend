"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogService = exports.ErrorLogService = exports.VIEW_LOG_BYTES = exports.MAX_LOG_BYTES = void 0;
exports.formatLogEntry = formatLogEntry;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
exports.MAX_LOG_BYTES = 5 * 1024 * 1024;
exports.VIEW_LOG_BYTES = 1024 * 1024;
const MAX_ENTRY_BYTES = 16 * 1024;
const sensitiveKey = /password|secret|token|authorization|cookie|api.?key|card.?number|cvv/i;
function sanitize(value, seen = new WeakSet(), depth = 0) {
    var _a;
    if (value instanceof Error)
        return `${value.name}: ${value.message}\n${(_a = value.stack) !== null && _a !== void 0 ? _a : ""}`;
    if (!value || typeof value !== "object")
        return value;
    if (depth > 6)
        return "[Object]";
    if (seen.has(value))
        return "[Circular]";
    seen.add(value);
    if (Array.isArray(value))
        return value.slice(0, 100).map((item) => sanitize(item, seen, depth + 1));
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : sanitize(item, seen, depth + 1)]));
}
function formatLogEntry(level, args) {
    const message = args.map((arg) => {
        const clean = sanitize(arg);
        return typeof clean === "string" ? clean : (0, util_1.inspect)(clean, { depth: 6, breakLength: Infinity, maxArrayLength: 100 });
    }).join(" ")
        .replace(/\bBearer\s+[^\s,;"']+/gi, "Bearer [REDACTED]")
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]")
        .replace(/((?:password|secret|accessToken|refreshToken|authorization|cookie|api[_-]?key|cvv)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;}]+)/gi, "$1[REDACTED]");
    const text = `${new Date().toISOString()} - ${level}: ${message}\n`;
    const bytes = Buffer.from(text, "utf8");
    if (bytes.length <= MAX_ENTRY_BYTES)
        return text;
    return bytes.subarray(0, MAX_ENTRY_BYTES - 40).toString("utf8") + "\n[Entry truncated]\n";
}
class ErrorLogService {
    constructor(filename = path_1.default.resolve(__dirname, "../..", process.env.ERROR_LOG_FILE || "logs/error.log")) {
        this.filename = filename;
        this.queue = Promise.resolve();
    }
    serialize(action) {
        const operation = this.queue.then(action);
        this.queue = operation.catch(() => { });
        return operation;
    }
    readTail(maxBytes) {
        return __awaiter(this, void 0, void 0, function* () {
            let handle;
            try {
                handle = yield promises_1.default.open(this.filename, "r");
            }
            catch (error) {
                if (error.code === "ENOENT")
                    return { content: "", size: 0, updatedAt: null, truncated: false };
                throw error;
            }
            try {
                const stat = yield handle.stat();
                if (!stat.isFile())
                    throw new Error("Log storage is not a regular file");
                const start = Math.max(stat.size - maxBytes, 0);
                const buffer = Buffer.alloc(Math.min(stat.size, maxBytes));
                const { bytesRead } = yield handle.read(buffer, 0, buffer.length, start);
                let tail = buffer.subarray(0, bytesRead);
                if (start > 0) {
                    const firstNewline = tail.indexOf(10);
                    tail = firstNewline >= 0 ? tail.subarray(firstNewline + 1) : Buffer.alloc(0);
                }
                return { content: tail.toString("utf8"), size: stat.size, updatedAt: stat.size ? stat.mtime.toISOString() : null, truncated: start > 0 };
            }
            finally {
                yield handle.close();
            }
        });
    }
    append(level, args) {
        // Format immediately so changes to a caller's object cannot alter queued entries.
        const entry = formatLogEntry(level, args);
        return this.serialize(() => __awaiter(this, void 0, void 0, function* () {
            yield promises_1.default.mkdir(path_1.default.dirname(this.filename), { recursive: true });
            const stat = yield promises_1.default.stat(this.filename).catch((error) => {
                if (error.code !== "ENOENT")
                    throw error;
                return null;
            });
            if (stat && stat.size + Buffer.byteLength(entry) > exports.MAX_LOG_BYTES) {
                const retained = yield this.readTail(exports.MAX_LOG_BYTES - MAX_ENTRY_BYTES);
                yield promises_1.default.writeFile(this.filename, retained.content + entry, { mode: 0o600 });
            }
            else {
                yield promises_1.default.appendFile(this.filename, entry, { mode: 0o600 });
            }
        }));
    }
    read() { return this.serialize(() => this.readTail(exports.VIEW_LOG_BYTES)); }
    download() { return this.serialize(() => __awaiter(this, void 0, void 0, function* () { return (yield this.readTail(exports.MAX_LOG_BYTES)).content; })); }
    clear() {
        return this.serialize(() => __awaiter(this, void 0, void 0, function* () {
            yield promises_1.default.mkdir(path_1.default.dirname(this.filename), { recursive: true });
            yield promises_1.default.writeFile(this.filename, "", { mode: 0o600 });
            return { content: "", size: 0, updatedAt: null, truncated: false };
        }));
    }
}
exports.ErrorLogService = ErrorLogService;
exports.errorLogService = new ErrorLogService();
