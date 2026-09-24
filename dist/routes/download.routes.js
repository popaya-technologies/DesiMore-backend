"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const download_controller_1 = require("../controllers/download.controller");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            fs_1.default.mkdirSync(download_controller_1.DOWNLOAD_DIR, { recursive: true });
            cb(null, download_controller_1.DOWNLOAD_DIR);
        },
        filename: (_req, file, cb) => cb(null, (0, crypto_1.randomUUID)() + path_1.default.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        var _a;
        const allowed = {
            ".pdf": ["application/pdf"],
            ".zip": ["application/zip", "application/x-zip-compressed"],
        };
        if ((_a = allowed[path_1.default.extname(file.originalname).toLowerCase()]) === null || _a === void 0 ? void 0 : _a.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error("Only PDF and ZIP downloads are accepted"));
    },
});
router.post("/upload", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "create"), upload.single("file"), download_controller_1.DownloadController.upload);
router.get("/:id/content", auth_middleware_1.authenticate, download_controller_1.DownloadController.content);
router.get("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkAnyPermission)("product", ["create", "update"]), download_controller_1.DownloadController.list);
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "create"), download_controller_1.DownloadController.create);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "delete"), download_controller_1.DownloadController.remove);
router.use((error, _req, res, _next) => res.status(400).json({ message: error.message || "Invalid upload" }));
exports.default = router;
