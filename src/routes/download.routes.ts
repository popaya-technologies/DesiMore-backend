import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  checkPermission,
  checkAnyPermission,
} from "../middlewares/rbac.middleware";
import {
  DownloadController,
  DOWNLOAD_DIR,
} from "../controllers/download.controller";
import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
const router = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      cb(null, DOWNLOAD_DIR);
    },
    filename: (_req, file, cb) =>
      cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = {
      ".pdf": ["application/pdf"],
      ".zip": ["application/zip", "application/x-zip-compressed"],
    };
    if (
      allowed[path.extname(file.originalname).toLowerCase()]?.includes(
        file.mimetype,
      )
    )
      cb(null, true);
    else cb(new Error("Only PDF and ZIP downloads are accepted"));
  },
});
router.post(
  "/upload",
  authenticate,
  checkPermission("product", "create"),
  upload.single("file"),
  DownloadController.upload,
);
router.get("/:id/content", authenticate, DownloadController.content);
router.get(
  "/",
  authenticate,
  checkAnyPermission("product", ["create", "update"]),
  DownloadController.list,
);
router.post(
  "/",
  authenticate,
  checkPermission("product", "create"),
  DownloadController.create,
);
router.delete(
  "/:id",
  authenticate,
  checkPermission("product", "delete"),
  DownloadController.remove,
);
router.use((error: any, _req: any, res: any, _next: any) =>
  res.status(400).json({ message: error.message || "Invalid upload" }),
);
export default router;
