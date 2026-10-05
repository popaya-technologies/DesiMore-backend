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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const class_validator_1 = require("class-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const backup_service_1 = require("../services/backup.service");
const api_error_1 = require("../utils/api-error");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: backup_service_1.MAX_BACKUP_BYTES, files: 1, fields: 1, fieldSize: 100 } });
const handle = (action) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield action(req, res);
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
router.use(auth_middleware_1.authenticate);
router.get("/tables", (0, rbac_middleware_1.checkPermission)("backup", "read"), handle((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(yield backup_service_1.backupService.list());
})));
router.post("/export", (0, rbac_middleware_1.checkPermission)("backup", "export"), handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const file = yield backup_service_1.backupService.export(req.body);
    res.setHeader("Cache-Control", "no-store");
    res.attachment(`desimore-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    res.type("application/json").send(file);
})));
router.post("/restore", (0, rbac_middleware_1.checkPermission)("backup", "restore"), upload.single("file"), handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.confirm) !== "RESTORE")
        throw new api_error_1.ApiError(400, "Send confirm=RESTORE to replace the backed-up tables' existing data");
    if (!req.file)
        throw new api_error_1.ApiError(400, "Upload the backup in multipart field file");
    const file = (0, backup_service_1.parseBackup)(req.file.buffer);
    res.status(202).json(backup_service_1.backupService.start(file, req.user.id));
})));
router.get("/restore/:id", (0, rbac_middleware_1.checkPermission)("backup", "restore"), handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, class_validator_1.isUUID)(String(req.params.id)))
        throw new api_error_1.ApiError(400, "Invalid restore job ID");
    res.setHeader("Cache-Control", "no-store");
    res.json(backup_service_1.backupService.progress(String(req.params.id), req.user.id, req.user.userRole === "su"));
})));
router.use((error, _req, res, _next) => {
    if (error instanceof multer_1.default.MulterError) {
        res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Backup exceeds 50 MB" : "Invalid backup upload" });
        return;
    }
    (0, api_error_1.respondError)(res, error);
});
exports.default = router;
