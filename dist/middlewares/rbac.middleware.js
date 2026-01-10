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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = void 0;
const rbac_service_1 = require("../services/rbac.service");
const checkPermission = (resource, action) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            // Super admin bypass
            if (req.user.userRole === "su") {
                next();
                return;
            }
            const hasPermission = yield rbac_service_1.RBACService.hasPermission(req.user.id, resource, action);
            if (!hasPermission) {
                res.status(403).json({ message: "Forbidden" });
                return;
            }
            next();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    });
};
exports.checkPermission = checkPermission;
