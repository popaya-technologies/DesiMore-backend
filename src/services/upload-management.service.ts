import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOAD_DIR } from "../utils/upload-config";
import { ApiError } from "../utils/api-error";

const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
const safeFilename = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,299}$/;

export function uploadQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some((key) => !["page", "limit", "name", "date"].includes(key)))
    throw new ApiError(400, "Unknown upload filter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) throw new ApiError(400, "Invalid pagination");
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new ApiError(400, "Invalid pagination");
    return number;
  };
  const page = integer(query.page, 1, 1000000);
  const limit = integer(query.limit, 10, 100);
  if (query.name !== undefined && (typeof query.name !== "string" || query.name.length > 255 || /[\x00-\x1f]/.test(query.name)))
    throw new ApiError(400, "Upload name must contain at most 255 characters");
  const name = typeof query.name === "string" ? query.name.trim().toLowerCase() : "";
  let date = "";
  if (query.date !== undefined) {
    if (typeof query.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(query.date)) throw new ApiError(400, "Invalid date");
    const parsed = new Date(query.date + "T00:00:00.000Z");
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== query.date) throw new ApiError(400, "Invalid date");
    date = query.date;
  }
  return { page, limit, name, date };
}

// Only files created by the existing image upload routes belong to this manager.
function managedFilename(value: unknown): value is string {
  return typeof value === "string" && safeFilename.test(value) && uuidPrefix.test(value);
}

export class UploadManagementService {
  private deletionQueue: Promise<unknown> = Promise.resolve();

  constructor(private directory = UPLOAD_DIR) {}

  async list(query: Record<string, unknown>) {
    const { page, limit, name, date } = uploadQuery(query);
    let entries: string[];
    try {
      entries = await fs.readdir(this.directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      entries = [];
    }
    const rows: { id: string; name: string; createdAt: string }[] = [];
    for (const filename of entries) {
      if (!managedFilename(filename)) continue;
      try {
        const stat = await fs.lstat(path.join(this.directory, filename));
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        const row = { id: filename, name: filename.replace(uuidPrefix, ""), createdAt: stat.birthtime.toISOString() };
        if (name && !row.name.toLowerCase().includes(name)) continue;
        if (date && row.createdAt.slice(0, 10) !== date) continue;
        rows.push(row);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    const offset = (page - 1) * limit;
    return {
      data: rows.slice(offset, offset + limit).map((row, index) => ({ ...row, no: offset + index + 1 })),
      meta: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) },
    };
  }

  async remove(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "ids"))
      throw new ApiError(400, "Provide upload IDs");
    const ids = (body as { ids?: unknown }).ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every(managedFilename) || new Set(ids).size !== ids.length)
      throw new ApiError(400, "Select 1 to 100 unique upload IDs");
    // Serialize batches so two delete requests cannot move the same files concurrently.
    const operation = this.deletionQueue.then(() => this.removeFiles(ids));
    this.deletionQueue = operation.catch(() => {});
    return operation;
  }

  private async removeFiles(ids: string[]) {
    // Validate the complete batch before changing anything. Never follow symlinks.
    for (const id of ids) {
      try {
        const stat = await fs.lstat(path.join(this.directory, id));
        if (!stat.isFile() || stat.isSymbolicLink()) throw new ApiError(400, "Invalid upload file");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ApiError(404, "An upload no longer exists. Refresh the list.");
        throw error;
      }
    }
    // Hidden quarantine is not publicly served by express.static. Keep files for recovery.
    const quarantine = path.join(this.directory, ".admin-deleted");
    try {
      await fs.mkdir(quarantine);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const quarantineStat = await fs.lstat(quarantine);
    if (!quarantineStat.isDirectory() || quarantineStat.isSymbolicLink()) throw new ApiError(500, "Invalid deletion directory");
    const moved: { source: string; destination: string }[] = [];
    try {
      for (const id of ids) {
        const source = path.join(this.directory, id);
        const destination = path.join(quarantine, randomUUID() + "-" + id);
        await fs.rename(source, destination);
        moved.push({ source, destination });
      }
    } catch (error) {
      for (const file of moved.reverse()) await fs.rename(file.destination, file.source);
      throw error;
    }
    return { deletedCount: ids.length };
  }
}

export const uploadManagementService = new UploadManagementService();
