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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WholesaleOrderController = void 0;
const wholesale_order_service_1 = require("../services/wholesale-order.service");
const api_error_1 = require("../utils/api-error");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const wholesale_order_request_entity_1 = require("../entities/wholesale-order-request.entity");
const wholesale_order_dto_1 = require("../dto/wholesale-order.dto");
const typeorm_1 = require("typeorm");
const wholesaleOrderRequestRepository = data_source_1.AppDataSource.getRepository(wholesale_order_request_entity_1.WholesaleOrderRequest);
const buildDateRange = (from, to) => {
    if (!from && !to)
        return undefined;
    const fromStr = Array.isArray(from) ? from[0] : from;
    const toStr = Array.isArray(to) ? to[0] : to;
    let fromDate = fromStr ? new Date(fromStr) : undefined;
    let toDate = toStr ? new Date(toStr) : undefined;
    if (fromDate && isNaN(fromDate.getTime()))
        fromDate = undefined;
    if (toDate && isNaN(toDate.getTime()))
        toDate = undefined;
    if (!fromDate && !toDate)
        return undefined;
    if (fromDate)
        fromDate.setHours(0, 0, 0, 0);
    if (toDate)
        toDate.setHours(23, 59, 59, 999);
    return (0, typeorm_1.Between)(fromDate !== null && fromDate !== void 0 ? fromDate : new Date(0), toDate !== null && toDate !== void 0 ? toDate : new Date());
};
const toNumber = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "number") {
        return value;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
};
const getPermission = (req, action) => {
    var _a, _b;
    return (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.permissions) === null || _b === void 0 ? void 0 : _b.some((permission) => permission.resource === "wholesale-order-request" &&
        permission.action === action);
};
const formatWholesaleRequestResponse = (request) => {
    if (!request) {
        return null;
    }
    const { items = [] } = request, rest = __rest(request, ["items"]);
    const normalizedItems = items.map((item) => (Object.assign(Object.assign({}, item), { wholesalePrice: toNumber(item.wholesalePrice), 
        // effectivePricePerCarton is no longer exposed
        total: toNumber(item.total) })));
    return Object.assign(Object.assign({}, rest), { subtotal: toNumber(rest.subtotal), tax: toNumber(rest.tax), shipping: toNumber(rest.shipping), discount: toNumber(rest.discount), total: toNumber(rest.total), items: normalizedItems });
};
exports.WholesaleOrderController = {
    createWholesaleOrderRequest: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res
                .status(201)
                .json(formatWholesaleRequestResponse(yield (0, wholesale_order_service_1.createWholesaleRequest)(req.user.id, req.body)));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    getMyRequests: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { status, from, to, page = "1", limit = "10" } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
            const where = { userId: req.user.id };
            if (status) {
                where.status = status;
            }
            const dateRange = buildDateRange(from, to);
            if (dateRange) {
                where.createdAt = dateRange;
            }
            const [requests, total] = yield wholesaleOrderRequestRepository.findAndCount({
                where,
                relations: ["items"],
                order: { createdAt: "DESC" },
                skip,
                take,
            });
            res.status(200).json({
                data: requests.map((request) => formatWholesaleRequestResponse(request)),
                meta: {
                    total,
                    page: Math.max(parseInt(page, 10) || 1, 1),
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get wholesale requests error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getAllRequests: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { status, from, to, page = "1", limit = "10" } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
            const where = {};
            if (status) {
                where.status = status;
            }
            const dateRange = buildDateRange(from, to);
            if (dateRange) {
                where.createdAt = dateRange;
            }
            const [requests, total] = yield wholesaleOrderRequestRepository.findAndCount({
                where,
                relations: ["items", "user"],
                order: { createdAt: "DESC" },
                skip,
                take,
            });
            res.status(200).json({
                data: requests.map((request) => formatWholesaleRequestResponse(request)),
                meta: {
                    total,
                    page: Math.max(parseInt(page, 10) || 1, 1),
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get all wholesale requests error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getRequestById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const request = yield wholesaleOrderRequestRepository.findOne({
                where: { id },
                relations: ["items", "user"],
            });
            if (!request) {
                res.status(404).json({ message: "Wholesale order request not found" });
                return;
            }
            const canReadAll = req.user.userRole === "su" || !!getPermission(req, "read-all");
            const canReadOwn = !!getPermission(req, "read") && request.userId === req.user.id;
            if (!canReadAll && !canReadOwn) {
                res.status(403).json({ message: "Forbidden" });
                return;
            }
            res.status(200).json(formatWholesaleRequestResponse(request));
        }
        catch (error) {
            console.error("Get wholesale request error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    updateRequestStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const updateDto = (0, class_transformer_1.plainToInstance)(wholesale_order_dto_1.UpdateWholesaleOrderRequestStatusDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const request = yield (0, wholesale_order_service_1.changeWholesaleStatus)(id, updateDto.status, updateDto.adminNotes);
            res.json(formatWholesaleRequestResponse(request));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
