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
exports.uploadManagementService = exports.UploadManagementService = void 0;
exports.uploadQuery = uploadQuery;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const upload_config_1 = require("../utils/upload-config");
const api_error_1 = require("../utils/api-error");
const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
const safeFilename = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,299}$/;
function uploadQuery(query) {
    if (Object.keys(query).some((key) => !["page", "limit", "name", "date"].includes(key)))
        throw new api_error_1.ApiError(400, "Unknown upload filter");
    const integer = (value, fallback, max) => {
        if (value === undefined)
            return fallback;
        if (typeof value !== "string" || !/^\d+$/.test(value))
            throw new api_error_1.ApiError(400, "Invalid pagination");
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 1 || number > max)
            throw new api_error_1.ApiError(400, "Invalid pagination");
        return number;
    };
    const page = integer(query.page, 1, 1000000);
    const limit = integer(query.limit, 10, 100);
    if (query.name !== undefined && (typeof query.name !== "string" || query.name.length > 255 || /[\x00-\x1f]/.test(query.name)))
        throw new api_error_1.ApiError(400, "Upload name must contain at most 255 characters");
    const name = typeof query.name === "string" ? query.name.trim().toLowerCase() : "";
    let date = "";
    if (query.date !== undefined) {
        if (typeof query.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(query.date))
            throw new api_error_1.ApiError(400, "Invalid date");
        const parsed = new Date(query.date + "T00:00:00.000Z");
        if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== query.date)
            throw new api_error_1.ApiError(400, "Invalid date");
        date = query.date;
    }
    return { page, limit, name, date };
}
// Only files created by the existing image upload routes belong to this manager.
function managedFilename(value) {
    return typeof value === "string" && safeFilename.test(value) && uuidPrefix.test(value);
}
class UploadManagementService {
    constructor(directory = upload_config_1.UPLOAD_DIR) {
        this.directory = directory;
        this.deletionQueue = Promise.resolve();
    }
    list(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page, limit, name, date } = uploadQuery(query);
            let entries;
            try {
                entries = yield promises_1.default.readdir(this.directory);
            }
            catch (error) {
                if (error.code !== "ENOENT")
                    throw error;
                entries = [];
            }
            const rows = [];
            for (const filename of entries) {
                if (!managedFilename(filename))
                    continue;
                try {
                    const stat = yield promises_1.default.lstat(path_1.default.join(this.directory, filename));
                    if (!stat.isFile() || stat.isSymbolicLink())
                        continue;
                    const row = { id: filename, name: filename.replace(uuidPrefix, ""), createdAt: stat.birthtime.toISOString() };
                    if (name && !row.name.toLowerCase().includes(name))
                        continue;
                    if (date && row.createdAt.slice(0, 10) !== date)
                        continue;
                    rows.push(row);
                }
                catch (error) {
                    if (error.code !== "ENOENT")
                        throw error;
                }
            }
            rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
            const offset = (page - 1) * limit;
            return {
                data: rows.slice(offset, offset + limit).map((row, index) => (Object.assign(Object.assign({}, row), { no: offset + index + 1 }))),
                meta: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) },
            };
        });
    }
    remove(body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "ids"))
                throw new api_error_1.ApiError(400, "Provide upload IDs");
            const ids = body.ids;
            if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every(managedFilename) || new Set(ids).size !== ids.length)
                throw new api_error_1.ApiError(400, "Select 1 to 100 unique upload IDs");
            // Serialize batches so two delete requests cannot move the same files concurrently.
            const operation = this.deletionQueue.then(() => this.removeFiles(ids));
            this.deletionQueue = operation.catch(() => { });
            return operation;
        });
    }
    removeFiles(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate the complete batch before changing anything. Never follow symlinks.
            for (const id of ids) {
                try {
                    const stat = yield promises_1.default.lstat(path_1.default.join(this.directory, id));
                    if (!stat.isFile() || stat.isSymbolicLink())
                        throw new api_error_1.ApiError(400, "Invalid upload file");
                }
                catch (error) {
                    if (error.code === "ENOENT")
                        throw new api_error_1.ApiError(404, "An upload no longer exists. Refresh the list.");
                    throw error;
                }
            }
            // Hidden quarantine is not publicly served by express.static. Keep files for recovery.
            const quarantine = path_1.default.join(this.directory, ".admin-deleted");
            try {
                yield promises_1.default.mkdir(quarantine);
            }
            catch (error) {
                if (error.code !== "EEXIST")
                    throw error;
            }
            const quarantineStat = yield promises_1.default.lstat(quarantine);
            if (!quarantineStat.isDirectory() || quarantineStat.isSymbolicLink())
                throw new api_error_1.ApiError(500, "Invalid deletion directory");
            const moved = [];
            try {
                for (const id of ids) {
                    const source = path_1.default.join(this.directory, id);
                    const destination = path_1.default.join(quarantine, (0, crypto_1.randomUUID)() + "-" + id);
                    yield promises_1.default.rename(source, destination);
                    moved.push({ source, destination });
                }
            }
            catch (error) {
                for (const file of moved.reverse())
                    yield promises_1.default.rename(file.destination, file.source);
                throw error;
            }
            return { deletedCount: ids.length };
        });
    }
}
exports.UploadManagementService = UploadManagementService;
exports.uploadManagementService = new UploadManagementService();
