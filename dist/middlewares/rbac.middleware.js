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
exports.checkPermission = exports.checkPermissionOnAny = exports.checkAnyPermission = exports.requireStaff = void 0;
const rbac_service_1 = require("../services/rbac.service");
// Shopper roles carry some of the same permissions as staff (e.g. order:read for
// their own orders), so staff-only routes must also reject them explicitly.
const SHOPPER_ROLES = new Set(["user", "customer", "wholesaler"]);
const requireStaff = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    if (req.user.accountType !== "system-user" &&
        SHOPPER_ROLES.has(String(req.user.userRole))) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};
exports.requireStaff = requireStaff;
// Product read permission also belongs to shoppers; editor metadata needs a write permission.
const checkAnyPermission = (resource, actions) => (req, res, next) => {
    var _a;
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    if (req.user.userRole === "su" ||
        ((_a = req.user.permissions) === null || _a === void 0 ? void 0 : _a.some((p) => p.resource === resource && actions.includes(p.action)))) {
        next();
        return;
    }
    res.status(403).json({ message: "Forbidden" });
};
exports.checkAnyPermission = checkAnyPermission;
// Passes when the user holds `action` on at least one of `resources`.
const checkPermissionOnAny = (resources, action) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            if (req.user.userRole === "su") {
                next();
                return;
            }
            if (req.user.accountType === "system-user") {
                const isReadAction = action === "read" || action === "read-all";
                const granted = isReadAction
                    ? req.user.accessPermissions
                    : req.user.modifyPermissions;
                if (resources.some((r) => granted === null || granted === void 0 ? void 0 : granted.includes(r))) {
                    next();
                    return;
                }
                res.status(403).json({ message: "Forbidden" });
                return;
            }
            for (const resource of resources) {
                if (yield rbac_service_1.RBACService.hasPermission(req.user.id, resource, action)) {
                    next();
                    return;
                }
            }
            res.status(403).json({ message: "Forbidden" });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    });
};
exports.checkPermissionOnAny = checkPermissionOnAny;
const checkPermission = (resource, action) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
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
            if (req.user.accountType === "system-user") {
                const isReadAction = action === "read" || action === "read-all";
                const allowed = isReadAction
                    ? (_a = req.user.accessPermissions) === null || _a === void 0 ? void 0 : _a.includes(resource)
                    : (_b = req.user.modifyPermissions) === null || _b === void 0 ? void 0 : _b.includes(resource);
                if (!allowed) {
                    res.status(403).json({ message: "Forbidden" });
                    return;
                }
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
