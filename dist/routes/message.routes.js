"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const router = (0, express_1.Router)();
// Create/update a message for a given key (no auth restriction)
router.post("/", message_controller_1.MessageController.upsertMessage);
router.put("/", message_controller_1.MessageController.upsertMessage);
// Public fetch by key (for frontend banners, etc.)
router.get("/", message_controller_1.MessageController.getAllMessages);
// Products linked to a ticker/tipper message key
router.get("/:key/products", message_controller_1.MessageController.getMessageProducts);
router.post("/:key/products", message_controller_1.MessageController.addProductsToMessage);
router.put("/:key/products", message_controller_1.MessageController.setMessageProducts);
router.delete("/:key/products/:productId", message_controller_1.MessageController.removeProductFromMessage);
router.get("/:key", message_controller_1.MessageController.getMessageByKey);
exports.default = router;
