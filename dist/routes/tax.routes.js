"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tax_controller_1 = require("../controllers/tax.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/quote", auth_middleware_1.authenticate, tax_controller_1.TaxController.quote);
exports.default = router;
