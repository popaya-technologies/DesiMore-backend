import { Router, Request, Response } from "express";
import multer from "multer";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { backupService, MAX_BACKUP_BYTES, parseBackup } from "../services/backup.service";
import { ApiError, respondError } from "../utils/api-error";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BACKUP_BYTES, files: 1, fields: 1, fieldSize: 100 } });
const handle = (action: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await action(req, res); } catch (error) { respondError(res, error); }
};
router.use(authenticate);
router.get("/tables", checkPermission("backup", "read"), handle(async (_req, res) => {
  res.json(await backupService.list());
}));
router.post("/export", checkPermission("backup", "export"), handle(async (req, res) => {
  const file = await backupService.export(req.body);
  res.setHeader("Cache-Control", "no-store");
  res.attachment(`desimore-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  res.type("application/json").send(file);
}));
router.post("/restore", checkPermission("backup", "restore"), upload.single("file"), handle(async (req: any, res) => {
  if (req.body?.confirm !== "RESTORE") throw new ApiError(400, "Send confirm=RESTORE to replace the backed-up tables' existing data");
  if (!req.file) throw new ApiError(400, "Upload the backup in multipart field file");
  const file = parseBackup(req.file.buffer);
  res.status(202).json(backupService.start(file, req.user.id));
}));
router.get("/restore/:id", checkPermission("backup", "restore"), handle(async (req, res) => {
  if (!isUUID(String(req.params.id))) throw new ApiError(400, "Invalid restore job ID");
  res.setHeader("Cache-Control", "no-store");
  res.json(backupService.progress(String(req.params.id), req.user!.id, req.user!.userRole === "su"));
}));
router.use((error: any, _req: Request, res: Response, _next: any) => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Backup exceeds 50 MB" : "Invalid backup upload" });
    return;
  }
  respondError(res, error);
});
export default router;
