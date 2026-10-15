"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipping_controller_1 = require("../controllers/shipping.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/quote", auth_middleware_1.authenticate, shipping_controller_1.ShippingController.quote);
router.post("/select", auth_middleware_1.authenticate, shipping_controller_1.ShippingController.select);
exports.default = router;
