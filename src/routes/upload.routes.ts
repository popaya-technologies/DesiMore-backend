import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";
import { UploadManagementController } from "../controllers/upload-management.controller";
import { ensureUploadDir, UPLOAD_DIR } from "../utils/upload-config";

type MemoryFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

ensureUploadDir();

class UploadError extends Error {}

// Identify the image from its content (magic bytes), never from the
// browser-supplied name or MIME type.
const detectImage = (
  buffer: Buffer,
): { ext: string; mimetype: string } | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return { ext: "jpg", mimetype: "image/jpeg" };
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return { ext: "png", mimetype: "image/png" };
  const head = buffer.subarray(0, 6).toString("ascii");
  if (head === "GIF87a" || head === "GIF89a")
    return { ext: "gif", mimetype: "image/gif" };
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return { ext: "webp", mimetype: "image/webp" };
  return null;
};

// Validate every file first, then write them with an extension that matches
// their real content, so nothing non-image is ever stored or served.
const saveImages = async (files: MemoryFile[]) => {
  const checked = files.map((file) => {
    const image = detectImage(file.buffer);
    if (!image) {
      throw new UploadError("Invalid file type. Only images are allowed.");
    }
    return { file, image };
  });

  const saved = [];
  for (const { file, image } of checked) {
    const base =
      path
        .parse(file.originalname || "file")
        .name.replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 100) || "file";
    const filename = `${randomUUID()}-${base}.${image.ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer, {
      flag: "wx",
    });
    saved.push({
      filename,
      url: `/uploads/${filename}`,
      size: file.size,
      mimetype: image.mimetype,
    });
  }
  return saved;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new UploadError("Invalid file type. Only images are allowed."));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per file
});

const router = Router();

router.get("/", authenticate, checkPermission("upload", "read"), UploadManagementController.list);
router.delete("/bulk", authenticate, checkPermission("upload", "delete"), UploadManagementController.remove);

// Single image: used by the admin and by customers for product "file" options.
router.post(
  "/image",
  authenticate,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: (err?: unknown) => void) => {
    try {
      const files = ((req as any).files || {}) as Record<string, MemoryFile[]>;
      const file = (files.file && files.file[0]) || (files.image && files.image[0]);

      if (!file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const [saved] = await saveImages([file]);
      res.status(201).json(saved);
    } catch (error) {
      next(error);
    }
  },
);

// Multiple images: admin only.
router.post(
  "/images",
  authenticate,
  requireStaff,
  upload.fields([
    { name: "files", maxCount: 10 },
    { name: "file", maxCount: 10 },
    { name: "image", maxCount: 10 },
    { name: "images", maxCount: 10 },
    { name: "upload", maxCount: 10 },
  ]),
  async (req: Request, res: Response, next: (err?: unknown) => void) => {
    try {
      const grouped = ((req as any).files || {}) as Record<string, MemoryFile[]>;
      const files = Object.values(grouped).flat().slice(0, 10); // max 10

      if (!files.length) {
        res.status(400).json({ message: "No files uploaded" });
        return;
      }

      res.status(201).json(await saveImages(files));
    } catch (error) {
      next(error);
    }
  },
);

router.use((error: any, _req: Request, res: Response, _next: any) => {
  // Bad uploads are the client's fault; anything else is a server error.
  if (error instanceof UploadError || error instanceof multer.MulterError) {
    res.status(400).json({ message: error.message || "Invalid upload" });
    return;
  }
  console.error("Upload error:", error);
  res.status(500).json({ message: "Upload failed" });
});

export default router;
