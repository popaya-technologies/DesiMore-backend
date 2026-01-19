"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_config_1 = require("../utils/upload-config");
(0, upload_config_1.ensureUploadDir)();
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, upload_config_1.UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const originalName = file.originalname || "file";
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, safeName);
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
router.post("/image", auth_middleware_1.authenticate, upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
]), (req, res) => {
    const files = req.files || {};
    const file = (files.file && files.file[0]) ||
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
});
router.post("/images", auth_middleware_1.authenticate, upload.any(), // accept any field names, we'll filter below
(req, res) => {
    const files = req.files || [];
    const filtered = files
        .filter((f) => ["files", "file", "image", "images", "upload"].includes(f.fieldname || ""))
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
});
exports.default = router;
