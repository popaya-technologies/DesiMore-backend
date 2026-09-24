"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ProductController = exports.formatProductResponse = void 0;
const data_source_1 = require("../data-source");
const product_entity_1 = require("../entities/product.entity");
const typeorm_1 = require("typeorm");
const category_entity_1 = require("../entities/category.entity");
const XLSX = __importStar(require("xlsx"));
const product_service_1 = require("../services/product.service");
const api_error_1 = require("../utils/api-error");
const product_dto_1 = require("../dto/product.dto");
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.Category);
const splitIds = (val) => {
    if (!val)
        return [];
    return val
        .toString()
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined");
};
exports.formatProductResponse = product_service_1.productResponse;
exports.ProductController = {
    // Create Product (Admin only) or Users with access
    createProduct: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.status(201).json(yield (0, product_service_1.saveProduct)(req.body));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    getProductForEdit: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const product = yield productRepository.findOne({
                where: { id: req.params.id },
                relations: product_service_1.PRODUCT_RELATIONS,
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            res.json((0, product_service_1.productResponse)(product, true));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    getFormOptions: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.json({
            lengthClasses: product_dto_1.LENGTH_CLASSES,
            weightClasses: product_dto_1.WEIGHT_CLASSES,
            outOfStockStatuses: product_dto_1.STOCK_STATUSES,
            optionTypes: product_dto_1.OPTION_TYPES,
            customerGroups: product_dto_1.CUSTOMER_GROUPS,
            manufacturerEndpoint: "/api/brands",
            categoryEndpoint: "/api/categories/all",
            downloadEndpoint: "/api/downloads",
            wholesalePriceUnit: "box",
            wholesaleStockUnit: "box",
        });
    }),
    // Get All Products (Public)
    getProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { category, active, page = "1", limit = "10", minPrice, maxPrice, sort, } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
            // 1. First get the product IDs that match our filters
            const baseQuery = productRepository
                .createQueryBuilder("product")
                .select("product.id", "id");
            const min = minPrice !== undefined ? parseFloat(minPrice) : undefined;
            const max = maxPrice !== undefined ? parseFloat(maxPrice) : undefined;
            if (category) {
                baseQuery
                    .innerJoin("product.categories", "category")
                    .andWhere("category.id = :categoryId", { categoryId: category });
            }
            if (active === "true") {
                baseQuery.andWhere("product.isActive = :isActive", {
                    isActive: true,
                });
            }
            if (!isNaN(min)) {
                baseQuery.andWhere("product.price >= :minPrice", { minPrice: min });
            }
            if (!isNaN(max)) {
                baseQuery.andWhere("product.price <= :maxPrice", { maxPrice: max });
            }
            if (sort === "price_asc" || sort === "price_desc")
                baseQuery.orderBy("product.price", sort === "price_asc" ? "ASC" : "DESC");
            else
                baseQuery
                    .orderBy("product.sortOrder", "ASC")
                    .addOrderBy("product.createdAt", "DESC");
            baseQuery.addOrderBy("product.id", "ASC");
            const total = yield baseQuery.getCount();
            const productIds = (yield baseQuery.clone().offset(skip).limit(take).getRawMany()).map((p) => p.id);
            // 2. If no products found, return empty array
            if (productIds.length === 0) {
                res.status(200).json({
                    data: [],
                    meta: {
                        total,
                        page: Math.max(parseInt(page, 10) || 1, 1),
                        limit: take,
                        totalPages: Math.ceil(total / take),
                    },
                });
                return;
            }
            // 3. Get complete product data with category IDs
            const qb = productRepository
                .createQueryBuilder("product")
                .leftJoinAndSelect("product.categories", "category")
                .leftJoinAndSelect("product.brand", "brand")
                .where("product.id IN (:...productIds)", { productIds });
            if (sort === "price_asc") {
                qb.orderBy("product.price", "ASC");
            }
            else if (sort === "price_desc") {
                qb.orderBy("product.price", "DESC");
            }
            else {
                qb.orderBy("product.sortOrder", "ASC").addOrderBy("product.createdAt", "DESC");
            }
            const products = yield qb.getMany();
            // 4. Transform response to include only categoryIds
            const response = products.map((product) => (0, exports.formatProductResponse)(product));
            res.status(200).json({
                data: response,
                meta: {
                    total,
                    page: Math.max(parseInt(page, 10) || 1, 1),
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }),
    //Get Single Product (Public) by category slug
    getProductById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const product = yield productRepository.findOne({
                where: { id: req.params.id },
                relations: product_service_1.PRODUCT_RELATIONS,
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            res.status(200).json((0, exports.formatProductResponse)(product));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }),
    // Related products (by shared categories or brand)
    getRelatedProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const { id } = req.params;
            const limitParam = req.query.limit;
            const take = limitParam ? parseInt(limitParam, 10) : 10;
            const product = yield productRepository.findOne({
                where: { id },
                relations: product_service_1.PRODUCT_RELATIONS,
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            if ((_a = product.relatedProducts) === null || _a === void 0 ? void 0 : _a.length) {
                const related = yield productRepository.find({
                    where: {
                        id: (0, typeorm_1.In)(product.relatedProducts.map((p) => p.id)),
                        isActive: true,
                    },
                    relations: ["categories", "brand"],
                    take: Math.min(Math.max(take || 10, 1), 100),
                });
                res.json(related
                    .filter((p) => !p.dateAvailable ||
                    p.dateAvailable <= new Date().toISOString().slice(0, 10))
                    .map((p) => (0, product_service_1.productResponse)(p)));
                return;
            }
            const categoryIds = (product.categories || []).map((c) => c.id);
            const brandId = (_b = product.brand) === null || _b === void 0 ? void 0 : _b.id;
            const qb = productRepository
                .createQueryBuilder("product")
                .leftJoinAndSelect("product.categories", "category")
                .leftJoinAndSelect("product.brand", "brand")
                .where("product.id != :id", { id })
                .andWhere("product.isActive = :active", { active: true })
                .andWhere(new typeorm_1.Brackets((qb) => {
                if (categoryIds.length > 0) {
                    qb.orWhere("category.id IN (:...categoryIds)", { categoryIds });
                }
                if (brandId) {
                    qb.orWhere("brand.id = :brandId", { brandId });
                }
            }))
                .distinct(true)
                .orderBy("product.createdAt", "DESC");
            if (take && !isNaN(take) && take > 0) {
                qb.take(take);
            }
            const related = yield qb.getMany();
            res.status(200).json(related.map((p) => (0, exports.formatProductResponse)(p)));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }),
    // Search products (title/summary/model/tag), paginated
    searchProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const q = req.query.q || "";
            const { page = "1", limit = "10" } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
            if (!q.trim()) {
                res.status(400).json({ message: "Query parameter q is required" });
                return;
            }
            const qb = productRepository
                .createQueryBuilder("product")
                .leftJoinAndSelect("product.categories", "category")
                .leftJoinAndSelect("product.brand", "brand")
                .where(new typeorm_1.Brackets((qb) => {
                qb.where("product.title ILIKE :q", { q: `%${q}%` }).orWhere("product.model ILIKE :q", { q: `%${q}%` });
            }))
                .andWhere("product.isActive = :active", { active: true });
            const [products, total] = yield qb
                .orderBy("product.createdAt", "DESC")
                .skip(skip)
                .take(take)
                .getManyAndCount();
            res.status(200).json({
                data: products.map((p) => (0, exports.formatProductResponse)(p)),
                meta: {
                    total,
                    page: Math.max(parseInt(page, 10) || 1, 1),
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }),
    // Import products from XLSX/CSV (upsert by model if provided, else title)
    importProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const file = req.file;
            if (!(file === null || file === void 0 ? void 0 : file.buffer)) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            const workbook = XLSX.read(file.buffer, { type: "buffer" });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, blankrows: false });
            if (!rows.length || rows.length > 5000) {
                res.status(400).json({ message: "Import must contain 1 to 5000 rows" });
                return;
            }
            const numeric = new Set([
                "price",
                "discountPrice",
                "wholesalePrice",
                "wholesaleQuantity",
                "boxQuantity",
                "unitsPerCarton",
                "minimumQuantity",
                "wholesaleMinimumQuantity",
                "sortOrder",
                "length",
                "width",
                "height",
                "weight",
                "wholesaleLength",
                "wholesaleWidth",
                "wholesaleHeight",
                "wholesaleWeight",
            ]);
            const boolean = new Set([
                "isActive",
                "inStock",
                "subtractStock",
                "requiresShipping",
                "wholesaleRequiresShipping",
            ]);
            const json = new Set([
                "attributes",
                "options",
                "discounts",
                "imageDetails",
                "package",
            ]);
            const errors = [], createdProducts = [], updatedProducts = [];
            for (let index = 0; index < rows.length; index++) {
                try {
                    const body = {};
                    for (const [key, value] of Object.entries(rows[index])) {
                        if (value === undefined || value === null || value === "")
                            continue;
                        if (numeric.has(key))
                            body[key] = Number(value);
                        else if (boolean.has(key)) {
                            const normalized = String(value).trim().toLowerCase();
                            if (!["true", "false", "yes", "no", "1", "0"].includes(normalized))
                                throw new Error("Invalid boolean: " + key);
                            body[key] = ["true", "yes", "1"].includes(normalized);
                        }
                        else if (json.has(key))
                            body[key] = JSON.parse(String(value));
                        else if (["categoryIds", "downloadIds", "relatedProductIds"].includes(key))
                            body[key] = String(value).trim().startsWith("[")
                                ? JSON.parse(String(value))
                                : splitIds(value);
                        else if (key === "images")
                            body.images = String(value).trim().startsWith("[")
                                ? JSON.parse(String(value))
                                : [String(value)];
                        else
                            body[key] = String(value).trim();
                    }
                    const title = body.title || body.productName;
                    if (!title)
                        throw new Error("Missing title");
                    const existing = yield productRepository.findOne({
                        where: body.model
                            ? [{ model: body.model }, { title }]
                            : [{ title }],
                    });
                    const result = yield (0, product_service_1.saveProduct)(body, existing === null || existing === void 0 ? void 0 : existing.id, true);
                    (existing ? updatedProducts : createdProducts).push({
                        id: result.id,
                        title: result.title,
                    });
                }
                catch (error) {
                    errors.push(Object.assign({ row: index + 2, error: error.message }, (error.errors ? { details: error.errors } : {})));
                }
            }
            res.json({
                message: "Import completed",
                created: createdProducts.length,
                updated: updatedProducts.length,
                errors,
                createdProducts,
                updatedProducts,
            });
        }
        catch (error) {
            res.status(400).json({ message: "Unable to read import file" });
        }
    }),
    //Update product (Admin only)
    updateProduct: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield (0, product_service_1.saveProduct)(req.body, req.params.id));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    //Delete Product (Admin only)
    deleteProduct: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const product = yield productRepository.findOne({
                where: { id: req.params.id },
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            yield productRepository.remove(product);
            res.status(200).json({ message: "Product deleted successfully" });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Sever Error" });
        }
    }),
    getProductsByCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { slug } = req.params;
            const { limit = "10", page = "1" } = req.query;
            const take = parseInt(limit);
            const skip = (parseInt(page) - 1) * take;
            const category = yield categoryRepository.findOne({
                where: { slug },
            });
            if (!category) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            const [products, total] = yield productRepository.findAndCount({
                where: {
                    categories: { id: category.id },
                    isActive: true,
                },
                relations: product_service_1.PRODUCT_RELATIONS,
                take,
                skip,
                order: { createdAt: "DESC" },
            });
            const formattedProducts = products.map((product) => (0, exports.formatProductResponse)(product));
            res.status(200).json({
                data: formattedProducts,
                meta: {
                    total,
                    page: parseInt(page),
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
    getProductsByCategoryId: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const { limit = "10", page = "1" } = req.query;
            const take = parseInt(limit);
            const skip = (parseInt(page) - 1) * take;
            const category = yield categoryRepository.findOne({
                where: { id },
            });
            if (!category) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            const [products, total] = yield productRepository.findAndCount({
                where: {
                    categories: { id: category.id },
                    isActive: true,
                },
                relations: product_service_1.PRODUCT_RELATIONS,
                take,
                skip,
                order: { createdAt: "DESC" },
            });
            const formattedProducts = products.map((product) => (0, exports.formatProductResponse)(product));
            res.status(200).json({
                data: formattedProducts,
                meta: {
                    total,
                    page: parseInt(page),
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
};
