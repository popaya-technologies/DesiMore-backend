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
exports.approvalBaseQuery = approvalBaseQuery;
exports.approvalResponse = approvalResponse;
exports.customerApprovalQuery = customerApprovalQuery;
exports.getCustomerApproval = getCustomerApproval;
exports.createCustomerApproval = createCustomerApproval;
exports.reviewCustomerApproval = reviewCustomerApproval;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const customer_approval_entity_1 = require("../entities/customer-approval.entity");
const customer_group_entity_1 = require("../entities/customer-group.entity");
const user_entity_1 = require("../entities/user.entity");
const customer_approval_dto_1 = require("../dto/customer-approval.dto");
const api_error_1 = require("../utils/api-error");
function inputDto(type, input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
            throw new api_error_1.ApiError(400, "Invalid request body");
        }
        const dto = (0, class_transformer_1.plainToInstance)(type, input);
        const errors = yield (0, class_validator_1.validate)(dto, {
            whitelist: true,
            forbidNonWhitelisted: true,
            validationError: {
                target: false,
                value: false,
            },
        });
        if (errors.length ||
            Object.values(dto).some((value) => typeof value === "string" && value.includes("\u0000"))) {
            throw new api_error_1.ApiError(400, "Invalid customer approval data", errors);
        }
        return dto;
    });
}
function approvalBaseQuery() {
    return data_source_1.AppDataSource.getRepository(customer_approval_entity_1.CustomerApproval)
        .createQueryBuilder("approval")
        .leftJoin("approval.user", "customer")
        .addSelect([
        "customer.id",
        "customer.firstname",
        "customer.lastname",
        "customer.fullname",
        "customer.email",
    ])
        .leftJoin("approval.customerGroup", "customerGroup")
        .addSelect(["customerGroup.id", "customerGroup.name"]);
}
function approvalResponse(row) {
    var _a, _b, _c, _d, _e, _f, _g;
    const customerName = ((_a = row.user) === null || _a === void 0 ? void 0 : _a.fullname) ||
        [(_b = row.user) === null || _b === void 0 ? void 0 : _b.firstname, (_c = row.user) === null || _c === void 0 ? void 0 : _c.lastname].filter(Boolean).join(" ");
    return {
        id: row.id,
        userId: row.userId,
        customerName,
        email: (_e = (_d = row.user) === null || _d === void 0 ? void 0 : _d.email) !== null && _e !== void 0 ? _e : null,
        customerGroupId: row.customerGroupId,
        customerGroup: (_g = (_f = row.customerGroup) === null || _f === void 0 ? void 0 : _f.name) !== null && _g !== void 0 ? _g : null,
        type: row.type,
        status: row.status,
        comment: row.comment,
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
        // Frontend currently uses dateAdded.
        dateAdded: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
function customerApprovalQuery(input) {
    var _a, _b, _c, _d, _e;
    const allowed = [
        "search",
        "email",
        "customerGroup",
        "customerGroupId",
        "type",
        "status",
        "date",
        "startDate",
        "endDate",
        "page",
        "limit",
        "sortBy",
        "sortOrder",
        "format",
    ];
    for (const [key, value] of Object.entries(input)) {
        if (!allowed.includes(key) || typeof value !== "string") {
            throw new api_error_1.ApiError(400, `Invalid query parameter: ${key}`);
        }
    }
    const q = input;
    const integer = (key, fallback, max) => {
        if (q[key] === undefined) {
            return fallback;
        }
        if (!/^[1-9]\d*$/.test(q[key]) || Number(q[key]) > max) {
            throw new api_error_1.ApiError(400, `Invalid ${key}`);
        }
        return Number(q[key]);
    };
    const page = integer("page", 1, 1000000);
    const limit = integer("limit", 10, 100);
    const qb = approvalBaseQuery();
    const status = (_a = q.status) !== null && _a !== void 0 ? _a : "pending";
    if (!["pending", "approved", "rejected", "all"].includes(status)) {
        throw new api_error_1.ApiError(400, "Invalid status");
    }
    if (status !== "all") {
        qb.andWhere("approval.status = :status", {
            status,
        });
    }
    const searchFilters = [
        ["search", "customer.fullname"],
        ["email", "customer.email"],
        ["customerGroup", "customerGroup.name"],
    ];
    for (const [key, column] of searchFilters) {
        if (q[key] !== undefined) {
            if (q[key].length > 255) {
                throw new api_error_1.ApiError(400, `Invalid ${key}`);
            }
            const searchValue = q[key].trim().replace(/[\\%_]/g, "\\$&");
            qb.andWhere(`${column} ILIKE :${key} ESCAPE '\\'`, {
                [key]: `%${searchValue}%`,
            });
        }
    }
    if (q.customerGroupId !== undefined) {
        if (!(0, class_validator_1.isUUID)(q.customerGroupId)) {
            throw new api_error_1.ApiError(400, "Invalid customerGroupId");
        }
        qb.andWhere("approval.customerGroupId = :groupId", {
            groupId: q.customerGroupId,
        });
    }
    if (q.type !== undefined) {
        if (!["customer", "wholesaler"].includes(q.type)) {
            throw new api_error_1.ApiError(400, "type must be customer or wholesaler");
        }
        qb.andWhere("approval.type = :type", {
            type: q.type,
        });
    }
    if (q.date !== undefined &&
        (q.startDate !== undefined || q.endDate !== undefined)) {
        throw new api_error_1.ApiError(400, "Use date or startDate/endDate");
    }
    const start = (_b = q.date) !== null && _b !== void 0 ? _b : q.startDate;
    const end = (_c = q.date) !== null && _c !== void 0 ? _c : q.endDate;
    for (const date of [start, end]) {
        if (date !== undefined &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                !(0, class_validator_1.isDateString)(date, {
                    strict: true,
                }))) {
            throw new api_error_1.ApiError(400, "Dates must use YYYY-MM-DD");
        }
    }
    if (start && end && start > end) {
        throw new api_error_1.ApiError(400, "Invalid date range");
    }
    if (start) {
        qb.andWhere("approval.createdAt >= CAST(:start AS date)", { start });
    }
    if (end) {
        qb.andWhere("approval.createdAt < CAST(:end AS date) + INTERVAL '1 day'", {
            end,
        });
    }
    const sorts = {
        customerName: "customer.fullname",
        email: "customer.email",
        customerGroup: "customerGroup.name",
        type: "approval.type",
        createdAt: "approval.createdAt",
    };
    const sortBy = (_d = q.sortBy) !== null && _d !== void 0 ? _d : "createdAt";
    const direction = (_e = q.sortOrder) !== null && _e !== void 0 ? _e : "DESC";
    if (!Object.prototype.hasOwnProperty.call(sorts, sortBy) ||
        !["ASC", "DESC"].includes(direction)) {
        throw new api_error_1.ApiError(400, "Invalid sorting");
    }
    qb.orderBy(sorts[sortBy], direction);
    qb.addOrderBy("approval.id", "ASC");
    return {
        qb,
        page,
        limit,
    };
}
function getCustomerApproval(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, class_validator_1.isUUID)(id)) {
            throw new api_error_1.ApiError(400, "Invalid customer approval ID");
        }
        const row = yield approvalBaseQuery()
            .where("approval.id = :id", { id })
            .getOne();
        if (!row) {
            throw new api_error_1.ApiError(404, "Customer approval not found");
        }
        return approvalResponse(row);
    });
}
function createCustomerApproval(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const dto = yield inputDto(customer_approval_dto_1.CreateCustomerApprovalDto, input);
        try {
            const id = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const user = yield manager.getRepository(user_entity_1.User).findOne({
                    where: {
                        id: dto.userId,
                    },
                    lock: {
                        mode: "pessimistic_write",
                    },
                });
                if (!user) {
                    throw new api_error_1.ApiError(404, "Customer not found");
                }
                // The project seed uses these role names.
                if (!["customer", "wholesaler"].includes(user.userRole)) {
                    throw new api_error_1.ApiError(409, "Only customer accounts can be submitted for approval");
                }
                const group = yield manager.getRepository(customer_group_entity_1.CustomerGroup).findOneBy({
                    id: dto.customerGroupId,
                });
                if (!group) {
                    throw new api_error_1.ApiError(404, "Customer group not found");
                }
                if (!group.approveNewCustomers) {
                    throw new api_error_1.ApiError(409, "This customer group does not require approval");
                }
                const repo = manager.getRepository(customer_approval_entity_1.CustomerApproval);
                const existing = yield repo.findOneBy({
                    userId: user.id,
                });
                if (existing) {
                    throw new api_error_1.ApiError(409, "Customer already has an approval record");
                }
                const type = user.userRole === "wholesaler" ? "wholesaler" : "customer";
                const saved = yield repo.save(repo.create({
                    userId: user.id,
                    customerGroupId: group.id,
                    type,
                    status: "pending",
                    comment: "",
                    reviewedBy: null,
                    reviewedAt: null,
                }));
                return saved.id;
            }));
            return getCustomerApproval(id);
        }
        catch (error) {
            if (typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "23505") {
                throw new api_error_1.ApiError(409, "Customer already has an approval record");
            }
            throw error;
        }
    });
}
function reviewCustomerApproval(id, status, input, actor) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, class_validator_1.isUUID)(id)) {
            throw new api_error_1.ApiError(400, "Invalid customer approval ID");
        }
        if (!(0, class_validator_1.isUUID)(actor)) {
            throw new api_error_1.ApiError(400, "Invalid reviewer ID");
        }
        const dto = yield inputDto(customer_approval_dto_1.ReviewCustomerApprovalDto, input !== null && input !== void 0 ? input : {});
        yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const repo = manager.getRepository(customer_approval_entity_1.CustomerApproval);
            const row = yield repo.findOne({
                where: { id },
                lock: {
                    mode: "pessimistic_write",
                },
            });
            if (!row) {
                throw new api_error_1.ApiError(404, "Customer approval not found");
            }
            if (row.status !== "pending") {
                throw new api_error_1.ApiError(409, "This customer approval has already been reviewed");
            }
            if (row.userId === actor) {
                throw new api_error_1.ApiError(403, "You cannot review your own approval");
            }
            row.status = status;
            row.comment = (_a = dto.comment) !== null && _a !== void 0 ? _a : "";
            row.reviewedBy = actor;
            row.reviewedAt = new Date();
            yield repo.save(row);
        }));
        return getCustomerApproval(id);
    });
}
