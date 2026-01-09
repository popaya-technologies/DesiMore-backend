import fs from "fs";
import path from "path";

// Resolve to project root so paths are stable in dev and prod
export const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads"
);

export const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};
