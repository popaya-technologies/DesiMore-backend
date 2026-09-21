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
exports.MessageController = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const message_entity_1 = require("../entities/message.entity");
const product_entity_1 = require("../entities/product.entity");
const message_dto_1 = require("../dto/message.dto");
const product_controller_1 = require("./product.controller");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const messageRepository = data_source_1.AppDataSource.getRepository(message_entity_1.Message);
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
const VALIDATION_OPTIONS = {
    whitelist: true,
    forbidUnknownValues: true,
    validationError: { target: false },
};
// Resolves products for a set of ids and reports any id that does not exist,
// so a bad payload comes back as a 400 instead of a raw FK violation.
const resolveProducts = (productIds) => __awaiter(void 0, void 0, void 0, function* () {
    const unique = Array.from(new Set(productIds));
    if (unique.length === 0) {
        return { products: [], missing: [] };
    }
    const products = yield productRepository.find({
        where: { id: (0, typeorm_1.In)(unique) },
    });
    const found = new Set(products.map((p) => p.id));
    const missing = unique.filter((id) => !found.has(id));
    return { products, missing };
});
exports.MessageController = {
    upsertMessage: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = (0, class_transformer_1.plainToInstance)(message_dto_1.UpsertMessageDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, VALIDATION_OPTIONS);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const existing = yield messageRepository.findOne({
                where: { key: dto.key },
            });
            if (existing) {
                existing.message = dto.message;
                yield messageRepository.save(existing);
                res.status(200).json(existing);
                return;
            }
            const created = messageRepository.create({
                key: dto.key,
                message: dto.message,
            });
            yield messageRepository.save(created);
            res.status(201).json(created);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getMessageByKey: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { key } = req.params;
            const existing = yield messageRepository.findOne({
                where: { key },
            });
            if (!existing) {
                res.status(404).json({ message: "Message not found" });
                return;
            }
            res.status(200).json(existing);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Get all messages (public)
    getAllMessages: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const messages = yield messageRepository.find({
                order: { createdAt: "DESC" },
            });
            res.status(200).json(messages);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Products linked to a ticker/tipper message key (public)
    getMessageProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { key } = req.params;
            const { limit = "10", page = "1" } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const skip = (currentPage - 1) * take;
            const message = yield messageRepository.findOne({ where: { key } });
            if (!message) {
                res.status(404).json({ message: "Message not found" });
                return;
            }
            const [products, total] = yield productRepository.findAndCount({
                where: {
                    messages: { id: message.id },
                    isActive: true,
                },
                relations: ["categories", "brand"],
                take,
                skip,
                order: { createdAt: "DESC" },
            });
            res.status(200).json({
                data: products.map((product) => (0, product_controller_1.formatProductResponse)(product)),
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
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Attach products to a message key without dropping the existing ones
    addProductsToMessage: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { key } = req.params;
            const dto = (0, class_transformer_1.plainToInstance)(message_dto_1.LinkProductsDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, VALIDATION_OPTIONS);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const message = yield messageRepository.findOne({
                where: { key },
                relations: ["products"],
            });
            if (!message) {
                res.status(404).json({ message: "Message not found" });
                return;
            }
            const { products, missing } = yield resolveProducts(dto.productIds);
            if (missing.length > 0) {
                res.status(400).json({
                    message: "Some products were not found",
                    productIds: missing,
                });
                return;
            }
            const existingIds = new Set((message.products || []).map((p) => p.id));
            const additions = products.filter((p) => !existingIds.has(p.id));
            if (additions.length > 0) {
                message.products = [...(message.products || []), ...additions];
                yield messageRepository.save(message);
            }
            res.status(200).json({
                key: message.key,
                added: additions.map((p) => p.id),
                productIds: (message.products || []).map((p) => p.id),
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Replace the full product set for a message key
    setMessageProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { key } = req.params;
            const dto = (0, class_transformer_1.plainToInstance)(message_dto_1.SetProductsDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, VALIDATION_OPTIONS);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const message = yield messageRepository.findOne({
                where: { key },
                relations: ["products"],
            });
            if (!message) {
                res.status(404).json({ message: "Message not found" });
                return;
            }
            const { products, missing } = yield resolveProducts(dto.productIds);
            if (missing.length > 0) {
                res.status(400).json({
                    message: "Some products were not found",
                    productIds: missing,
                });
                return;
            }
            message.products = products;
            yield messageRepository.save(message);
            res.status(200).json({
                key: message.key,
                productIds: products.map((p) => p.id),
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Detach a single product from a message key
    removeProductFromMessage: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { key, productId } = req.params;
            const message = yield messageRepository.findOne({
                where: { key },
                relations: ["products"],
            });
            if (!message) {
                res.status(404).json({ message: "Message not found" });
                return;
            }
            const linked = message.products || [];
            if (!linked.some((p) => p.id === productId)) {
                res
                    .status(404)
                    .json({ message: "Product is not linked to this message" });
                return;
            }
            message.products = linked.filter((p) => p.id !== productId);
            yield messageRepository.save(message);
            res.status(200).json({
                key: message.key,
                productIds: message.products.map((p) => p.id),
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
