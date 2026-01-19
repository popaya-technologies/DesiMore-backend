import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../middlewares/auth.middleware";
import { ensureUploadDir, UPLOAD_DIR } from "../utils/upload-config";

type UploadedRequest = Request & {
  file?: {
    filename: string;
    size: number;
    mimetype: string;
  };
};

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const originalName = file.originalname || "file";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safeName);
  },
});

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("Invalid file type. Only images are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = Router();

router.post(
  "/image",
  authenticate,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  (req: any, res: Response) => {
    const files = req.files || {};
    const file =
      (files.file && files.file[0]) ||
      (files.image && files.image[0]) ||
      req.file;

    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const publicUrl = `/uploads/${file.filename}`;

    res.status(201).json({
      filename: file.filename,
      url: publicUrl,
      size: file.size,
      mimetype: file.mimetype,
    });
  }
);

router.post(
  "/images",
  authenticate,
  upload.any(), // accept any field names, we'll filter below
  (req: any, res: Response) => {
    const files = (req.files as any[]) || [];
    const filtered = files
      .filter((f) =>
        ["files", "file", "image", "images", "upload"].includes(
          f.fieldname || ""
        )
      )
      .slice(0, 10); // max 10

    if (!filtered.length) {
      res.status(400).json({ message: "No files uploaded" });
      return;
    }

    const result = filtered.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(201).json(result);
  }
);

export default router;
