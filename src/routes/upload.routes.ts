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
    const ext = path.extname(file.originalname) || "";
    const base =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    cb(null, `${base}${ext}`);
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
  upload.single("file"),
  (req: UploadedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const file = req.file;
    const publicUrl = `/uploads/${file.filename}`;

    res.status(201).json({
      filename: file.filename,
      url: publicUrl,
      size: file.size,
      mimetype: file.mimetype,
    });
  }
);

export default router;
