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
exports.ProductReturnController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const product_return_entity_1 = require("../entities/product-return.entity");
const product_return_dto_1 = require("../dto/product-return.dto");
const productReturnRepository = data_source_1.AppDataSource.getRepository(product_return_entity_1.ProductReturn);
exports.ProductReturnController = {
    createProductReturn: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            const productReturnData = new product_return_dto_1.CreateProductReturnDto();
            Object.assign(productReturnData, req.body);
            const errors = yield (0, class_validator_1.validate)(productReturnData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const productReturn = productReturnRepository.create({
                orderId: productReturnData.orderId.trim(),
                orderDate: productReturnData.orderDate
                    ? new Date(productReturnData.orderDate)
                    : null,
                customer: ((_a = productReturnData.customer) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                firstName: productReturnData.firstName.trim(),
                lastName: productReturnData.lastName.trim(),
                email: productReturnData.email.trim(),
                telephone: ((_b = productReturnData.telephone) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                product: productReturnData.product.trim(),
                model: productReturnData.model.trim(),
                quantity: productReturnData.quantity,
                returnReason: ((_c = productReturnData.returnReason) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                opened: productReturnData.opened,
                comment: ((_d = productReturnData.comment) === null || _d === void 0 ? void 0 : _d.trim()) || null,
                returnAction: ((_e = productReturnData.returnAction) === null || _e === void 0 ? void 0 : _e.trim()) || null,
                returnStatus: ((_f = productReturnData.returnStatus) === null || _f === void 0 ? void 0 : _f.trim()) || null,
            });
            yield productReturnRepository.save(productReturn);
            res.status(201).json(productReturn);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getProductReturns: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, returnId, orderId, customer, product, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = productReturnRepository.createQueryBuilder("productReturn");
            if (search && String(search).trim()) {
                const searchValue = `%${String(search).trim()}%`;
                query.andWhere(`(
            productReturn.orderId ILIKE :search
            OR productReturn.customer ILIKE :search
            OR productReturn.product ILIKE :search
            OR productReturn.model ILIKE :search
            OR productReturn.firstName ILIKE :search
            OR productReturn.lastName ILIKE :search
            OR productReturn.email ILIKE :search
          )`, { search: searchValue });
            }
            if (returnId && String(returnId).trim()) {
                query.andWhere("productReturn.id::text ILIKE :returnId", {
                    returnId: `%${String(returnId).trim()}%`,
                });
            }
            if (orderId && String(orderId).trim()) {
                query.andWhere("productReturn.orderId ILIKE :orderId", {
                    orderId: `%${String(orderId).trim()}%`,
                });
            }
            if (customer && String(customer).trim()) {
                query.andWhere("productReturn.customer ILIKE :customer", {
                    customer: `%${String(customer).trim()}%`,
                });
            }
            if (product && String(product).trim()) {
                query.andWhere("productReturn.product ILIKE :product", {
                    product: `%${String(product).trim()}%`,
                });
            }
            query.orderBy("productReturn.createdAt", "DESC");
            const [productReturns, total] = yield query
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: productReturns,
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getProductReturnById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const productReturn = yield productReturnRepository.findOne({
                where: { id },
            });
            if (!productReturn) {
                res.status(404).json({
                    message: "Product return not found",
                });
                return;
            }
            res.status(200).json(productReturn);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateProductReturn: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const productReturn = yield productReturnRepository.findOne({
                where: { id },
            });
            if (!productReturn) {
                res.status(404).json({
                    message: "Product return not found",
                });
                return;
            }
            const productReturnData = new product_return_dto_1.UpdateProductReturnDto();
            Object.assign(productReturnData, req.body);
            const errors = yield (0, class_validator_1.validate)(productReturnData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (productReturnData.orderId !== undefined) {
                productReturn.orderId = productReturnData.orderId.trim();
            }
            if (productReturnData.orderDate !== undefined) {
                productReturn.orderDate = productReturnData.orderDate
                    ? new Date(productReturnData.orderDate)
                    : null;
            }
            if (productReturnData.customer !== undefined) {
                productReturn.customer = productReturnData.customer.trim() || null;
            }
            if (productReturnData.firstName !== undefined) {
                productReturn.firstName = productReturnData.firstName.trim();
            }
            if (productReturnData.lastName !== undefined) {
                productReturn.lastName = productReturnData.lastName.trim();
            }
            if (productReturnData.email !== undefined) {
                productReturn.email = productReturnData.email.trim();
            }
            if (productReturnData.telephone !== undefined) {
                productReturn.telephone = productReturnData.telephone.trim() || null;
            }
            if (productReturnData.product !== undefined) {
                productReturn.product = productReturnData.product.trim();
            }
            if (productReturnData.model !== undefined) {
                productReturn.model = productReturnData.model.trim();
            }
            if (productReturnData.quantity !== undefined) {
                productReturn.quantity = productReturnData.quantity;
            }
            if (productReturnData.returnReason !== undefined) {
                productReturn.returnReason =
                    productReturnData.returnReason.trim() || null;
            }
            if (productReturnData.opened !== undefined) {
                productReturn.opened = productReturnData.opened;
            }
            if (productReturnData.comment !== undefined) {
                productReturn.comment = productReturnData.comment.trim() || null;
            }
            if (productReturnData.returnAction !== undefined) {
                productReturn.returnAction =
                    productReturnData.returnAction.trim() || null;
            }
            if (productReturnData.returnStatus !== undefined) {
                productReturn.returnStatus =
                    productReturnData.returnStatus.trim() || null;
            }
            yield productReturnRepository.save(productReturn);
            res.status(200).json(productReturn);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteProductReturn: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const productReturn = yield productReturnRepository.findOne({
                where: { id },
            });
            if (!productReturn) {
                res.status(404).json({
                    message: "Product return not found",
                });
                return;
            }
            yield productReturnRepository.remove(productReturn);
            res.status(204).send();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
