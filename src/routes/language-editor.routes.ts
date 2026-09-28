import { Router } from "express";
import { isUUID } from "class-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { LanguageEditorController as controller } from "../controllers/language-editor.controller";
const router = Router();
router.use(authenticate);
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) { res.status(400).json({ message: "Invalid translation ID" }); return; }
  next();
});
router.get("/form-options", checkPermission("language-editor", "read"), controller.options);
router.get("/export", checkPermission("language-editor", "read"), controller.export);
router.delete("/bulk", checkPermission("language-editor", "delete"), controller.bulkDelete);
router.get("/", checkPermission("language-editor", "read"), controller.list);
router.post("/", checkPermission("language-editor", "create"), controller.create);
router.get("/:id", checkPermission("language-editor", "read"), controller.get);
router.patch("/:id", checkPermission("language-editor", "update"), controller.update);
router.put("/:id", checkPermission("language-editor", "update"), controller.update);
router.delete("/:id", checkPermission("language-editor", "delete"), controller.remove);
export default router;
