"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUploadDir = exports.UPLOAD_DIR = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Resolve to project root so paths are stable in dev and prod
exports.UPLOAD_DIR = path_1.default.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const ensureUploadDir = () => {
    if (!fs_1.default.existsSync(exports.UPLOAD_DIR)) {
        fs_1.default.mkdirSync(exports.UPLOAD_DIR, { recursive: true });
    }
};
exports.ensureUploadDir = ensureUploadDir;
