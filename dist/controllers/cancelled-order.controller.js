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
exports.CancelledOrderController = void 0;
const api_error_1 = require("../utils/api-error");
const cancelled_order_service_1 = require("../services/cancelled-order.service");
const handle = (action) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json(yield action(req));
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
exports.CancelledOrderController = {
    list: handle(req => (0, cancelled_order_service_1.listCancelledOrders)(req.query)),
    detail: handle(req => (0, cancelled_order_service_1.getCancelledOrder)(req.params.id)),
    history: handle(req => (0, cancelled_order_service_1.addCancelledHistory)(req.params.id, req.body, req.user.id)),
    bulk: handle(req => (0, cancelled_order_service_1.archiveCancelledOrders)(req.body, req.user.id)),
};
