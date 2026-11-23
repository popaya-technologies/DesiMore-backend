"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
// Writes change what every visitor sees: staff with Ticker Messages edit access only.
const staffWrite = [
    auth_middleware_1.authenticate,
    rbac_middleware_1.requireStaff,
    (0, rbac_middleware_1.checkPermission)("message", "update"),
];
// Create/update a message for a given key
router.post("/", ...staffWrite, message_controller_1.MessageController.upsertMessage);
router.put("/", ...staffWrite, message_controller_1.MessageController.upsertMessage);
// Public fetch by key (for frontend banners, etc.)
router.get("/", message_controller_1.MessageController.getAllMessages);
// Products linked to a ticker/tipper message key
router.get("/:key/products", message_controller_1.MessageController.getMessageProducts);
router.post("/:key/products", ...staffWrite, message_controller_1.MessageController.addProductsToMessage);
router.put("/:key/products", ...staffWrite, message_controller_1.MessageController.setMessageProducts);
router.delete("/:key/products/:productId", ...staffWrite, message_controller_1.MessageController.removeProductFromMessage);
router.get("/:key", message_controller_1.MessageController.getMessageByKey);
exports.default = router;
