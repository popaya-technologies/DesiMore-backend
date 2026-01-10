"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_config_1 = require("../utils/upload-config");
(0, upload_config_1.ensureUploadDir)();
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, upload_config_1.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || "";
        const base = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
        cb(null, `${base}${ext}`);
    },
});
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const fileFilter = (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new Error("Invalid file type. Only images are allowed."));
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
const router = (0, express_1.Router)();
router.post("/image", auth_middleware_1.authenticate, upload.single("file"), (req, res) => {
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
});
exports.default = router;
