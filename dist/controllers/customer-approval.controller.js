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
exports.CustomerApprovalController = void 0;
const customer_approval_service_1 = require("../services/customer-approval.service");
const api_error_1 = require("../utils/api-error");
const handle = (action) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield action(req, res);
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
exports.CustomerApprovalController = {
    list: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { qb, page, limit } = (0, customer_approval_service_1.customerApprovalQuery)(req.query);
        const [rows, total] = yield qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        res.json({
            data: rows.map(customer_approval_service_1.approvalResponse),
            meta: {
                total,
                page,
                limit,
                totalPages: total > 0 ? Math.ceil(total / limit) : 0,
            },
        });
    })),
    get: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const approval = yield (0, customer_approval_service_1.getCustomerApproval)(String(req.params.id));
        res.json(approval);
    })),
    create: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const approval = yield (0, customer_approval_service_1.createCustomerApproval)(req.body);
        res.status(201).json(approval);
    })),
    approve: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const actor = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!actor) {
            throw new api_error_1.ApiError(401, "Authenticated user not found");
        }
        const approval = yield (0, customer_approval_service_1.reviewCustomerApproval)(String(req.params.id), "approved", req.body, actor);
        res.json(approval);
    })),
    reject: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const actor = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!actor) {
            throw new api_error_1.ApiError(401, "Authenticated user not found");
        }
        const approval = yield (0, customer_approval_service_1.reviewCustomerApproval)(String(req.params.id), "rejected", req.body, actor);
        res.json(approval);
    })),
};
