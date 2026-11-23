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
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const upload_management_controller_1 = require("../controllers/upload-management.controller");
const upload_config_1 = require("../utils/upload-config");
(0, upload_config_1.ensureUploadDir)();
class UploadError extends Error {
}
// Identify the image from its content (magic bytes), never from the
// browser-supplied name or MIME type.
const detectImage = (buffer) => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return { ext: "jpg", mimetype: "image/jpeg" };
    if (buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return { ext: "png", mimetype: "image/png" };
    const head = buffer.subarray(0, 6).toString("ascii");
    if (head === "GIF87a" || head === "GIF89a")
        return { ext: "gif", mimetype: "image/gif" };
    if (buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP")
        return { ext: "webp", mimetype: "image/webp" };
    return null;
};
// Validate every file first, then write them with an extension that matches
// their real content, so nothing non-image is ever stored or served.
const saveImages = (files) => __awaiter(void 0, void 0, void 0, function* () {
    const checked = files.map((file) => {
        const image = detectImage(file.buffer);
        if (!image) {
            throw new UploadError("Invalid file type. Only images are allowed.");
        }
        return { file, image };
    });
    const saved = [];
    for (const { file, image } of checked) {
        const base = path_1.default
            .parse(file.originalname || "file")
            .name.replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(0, 100) || "file";
        const filename = `${(0, crypto_1.randomUUID)()}-${base}.${image.ext}`;
        yield fs_1.promises.writeFile(path_1.default.join(upload_config_1.UPLOAD_DIR, filename), file.buffer, {
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
});
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const fileFilter = (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new UploadError("Invalid file type. Only images are allowed."));
};
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per file
});
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("upload", "read"), upload_management_controller_1.UploadManagementController.list);
router.delete("/bulk", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("upload", "delete"), upload_management_controller_1.UploadManagementController.remove);
// Single image: used by the admin and by customers for product "file" options.
router.post("/image", auth_middleware_1.authenticate, upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
]), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = (req.files || {});
        const file = (files.file && files.file[0]) || (files.image && files.image[0]);
        if (!file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }
        const [saved] = yield saveImages([file]);
        res.status(201).json(saved);
    }
    catch (error) {
        next(error);
    }
}));
// Multiple images: admin only.
router.post("/images", auth_middleware_1.authenticate, rbac_middleware_1.requireStaff, upload.fields([
    { name: "files", maxCount: 10 },
    { name: "file", maxCount: 10 },
    { name: "image", maxCount: 10 },
    { name: "images", maxCount: 10 },
    { name: "upload", maxCount: 10 },
]), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const grouped = (req.files || {});
        const files = Object.values(grouped).flat().slice(0, 10); // max 10
        if (!files.length) {
            res.status(400).json({ message: "No files uploaded" });
            return;
        }
        res.status(201).json(yield saveImages(files));
    }
    catch (error) {
        next(error);
    }
}));
router.use((error, _req, res, _next) => {
    // Bad uploads are the client's fault; anything else is a server error.
    if (error instanceof UploadError || error instanceof multer_1.default.MulterError) {
        res.status(400).json({ message: error.message || "Invalid upload" });
        return;
    }
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed" });
});
exports.default = router;
