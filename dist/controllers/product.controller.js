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
exports.ProductController = void 0;
const data_source_1 = require("../data-source");
const product_entity_1 = require("../entities/product.entity");
const product_dto_1 = require("../dto/product.dto");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const category_entity_1 = require("../entities/category.entity");
const brand_entity_1 = require("../entities/brand.entity");
const XLSX = __importStar(require("xlsx"));
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.Category);
const brandRepository = data_source_1.AppDataSource.getRepository(brand_entity_1.Brand);
const toNum = (val) => {
    if (val === undefined || val === null || val === "")
        return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
};
const splitIds = (val) => {
    if (!val)
        return [];
    return val
        .toString()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
};
const splitTags = (val) => {
    if (!val)
        return [];
    return val
        .toString()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
};
const formatProductResponse = (product) => {
    var _a, _b;
    if (!product) {
        return null;
    }
    const { categories = [], brand } = product, productData = __rest(product, ["categories", "brand"]);
    const normalizedProduct = Object.assign(Object.assign({}, productData), { discountPrice: (_a = productData.discountPrice) !== null && _a !== void 0 ? _a : productData.price, tags: (_b = productData.tags) !== null && _b !== void 0 ? _b : [] });
    return Object.assign(Object.assign({}, normalizedProduct), { categoryIds: categories.map((c) => c.id), brandId: brand ? brand.id : null });
};
exports.ProductController = {
    // Create Product (Admin only) or Users with access
    createProduct: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        try {
            // Create and validate DTO
            const productData = new product_dto_1.CreateProductDto();
            Object.assign(productData, req.body);
            const errors = yield (0, class_validator_1.validate)(productData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Validate categories
            const categories = yield categoryRepository.find({
                where: { id: (0, typeorm_1.In)(productData.categoryIds) },
            });
            if (categories.length !== productData.categoryIds.length) {
                res.status(400).json({
                    message: "One or more category IDs are invalid",
                    invalidIds: productData.categoryIds.filter((id) => !categories.some((c) => c.id === id)),
                });
                return;
            }
            // Validate brand if provided
            let brand = null;
            if (productData.brandId) {
                brand = yield brandRepository.findOne({
                    where: { id: productData.brandId },
                });
                if (!brand) {
                    res.status(400).json({ message: "Invalid brand ID" });
                    return;
                }
            }
            // Create and save product
            const product = productRepository.create({
                title: productData.title,
                model: (_a = productData.model) !== null && _a !== void 0 ? _a : null,
                images: productData.images,
                price: productData.price,
                discountPrice: (_b = productData.discountPrice) !== null && _b !== void 0 ? _b : productData.price,
                wholesalePrice: (_c = productData.wholesalePrice) !== null && _c !== void 0 ? _c : null,
                summary: productData.summary,
                quantity: productData.quantity || "0",
                wholesaleOrderQuantity: (_d = productData.wholesaleOrderQuantity) !== null && _d !== void 0 ? _d : null,
                unitsPerCarton: (_e = productData.unitsPerCarton) !== null && _e !== void 0 ? _e : null,
                weight: (_f = productData.weight) !== null && _f !== void 0 ? _f : null,
                length: (_g = productData.length) !== null && _g !== void 0 ? _g : null,
                width: (_h = productData.width) !== null && _h !== void 0 ? _h : null,
                height: (_j = productData.height) !== null && _j !== void 0 ? _j : null,
                inStock: (_k = productData.inStock) !== null && _k !== void 0 ? _k : true,
                isActive: (_l = productData.isActive) !== null && _l !== void 0 ? _l : true,
                tags: (_m = productData.tags) !== null && _m !== void 0 ? _m : [],
                metaTitle: (_o = productData.metaTitle) !== null && _o !== void 0 ? _o : null,
                metaDescription: (_p = productData.metaDescription) !== null && _p !== void 0 ? _p : null,
                metaKeyword: (_q = productData.metaKeyword) !== null && _q !== void 0 ? _q : null,
                brand: brand !== null && brand !== void 0 ? brand : null,
                categories,
            });
            yield productRepository.save(product);
            // Return the created product with relations
            const createdProduct = yield productRepository.findOne({
                where: { id: product.id },
                relations: ["categories", "brand"],
            });
            res.status(201).json(formatProductResponse(createdProduct));
        }
        catch (error) {
            console.error("Product creation error:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error.message,
            });
        }
    }),
    // Get All Products (Public)
    getProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { category, active } = req.query;
            // 1. First get the product IDs that match our filters
            const productIdsQuery = productRepository
                .createQueryBuilder("product")
                .select("product.id", "id");
            if (category) {
                productIdsQuery
                    .innerJoin("product.categories", "category")
                    .andWhere("category.id = :categoryId", { categoryId: category });
            }
            if (active === "true") {
                productIdsQuery.andWhere("product.isActive = :isActive", {
                    isActive: true,
                });
            }
            const productIds = (yield productIdsQuery.getRawMany()).map((p) => p.id);
            // 2. If no products found, return empty array
            if (productIds.length === 0) {
                res.status(200).json([]);
                return;
            }
            // 3. Get complete product data with category IDs
            const products = yield productRepository
                .createQueryBuilder("product")
                .leftJoinAndSelect("product.categories", "category")
                .leftJoinAndSelect("product.brand", "brand")
                .where("product.id IN (:...productIds)", { productIds })
                .getMany();
            // 4. Transform response to include only categoryIds
            const response = products.map((product) => formatProductResponse(product));
            res.status(200).json(response);
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
                relations: ["categories", "brand"],
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            res.status(200).json(formatProductResponse(product));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }),
    // Related products (by shared categories or brand)
    getRelatedProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const { id } = req.params;
            const limitParam = req.query.limit;
            const take = limitParam ? parseInt(limitParam, 10) : 10;
            const product = yield productRepository.findOne({
                where: { id },
                relations: ["categories", "brand"],
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            const categoryIds = (product.categories || []).map((c) => c.id);
            const brandId = (_a = product.brand) === null || _a === void 0 ? void 0 : _a.id;
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
            res.status(200).json(related.map((p) => formatProductResponse(p)));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }),
    // Import products from XLSX/CSV (upsert by model if provided, else title)
    importProducts: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const uploadedFile = req.file;
            if (!uploadedFile || !uploadedFile.buffer) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            const workbook = XLSX.read(uploadedFile.buffer, { type: "buffer" });
            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, {
                defval: "",
                raw: false,
                blankrows: false,
            });
            if (!rows || rows.length === 0) {
                res.status(400).json({ message: "No data found in file" });
                return;
            }
            let created = 0;
            let updated = 0;
            const errors = [];
            const createdProducts = [];
            const updatedProducts = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const title = (_a = row.title) === null || _a === void 0 ? void 0 : _a.toString().trim();
                if (!title) {
                    errors.push({ row: i + 2, error: "Missing title" });
                    continue;
                }
                const model = ((_b = row.model) === null || _b === void 0 ? void 0 : _b.toString().trim()) || null;
                const price = toNum(row.price);
                if (price === null) {
                    errors.push({ row: i + 2, error: "Invalid price" });
                    continue;
                }
                const quantityStr = (_d = (_c = row.quantity) === null || _c === void 0 ? void 0 : _c.toString().trim()) !== null && _d !== void 0 ? _d : "0";
                const categoryIds = splitIds(row.categoryIds);
                let categories = [];
                if (categoryIds.length > 0) {
                    categories = yield categoryRepository.find({ where: { id: (0, typeorm_1.In)(categoryIds) } });
                    if (categories.length !== categoryIds.length) {
                        errors.push({ row: i + 2, error: "Invalid categoryIds" });
                        continue;
                    }
                }
                const tags = splitTags(row.tag);
                const weight = toNum(row.weight);
                const length = toNum(row.length);
                const width = toNum(row.width);
                const height = toNum(row.height);
                // Upsert by model if provided, else by title
                const existing = yield productRepository.findOne({
                    where: model ? [{ model }, { title }] : [{ title }],
                    relations: ["categories", "brand"],
                });
                const baseData = {
                    model,
                    title,
                    summary: row.summary || "",
                    price,
                    discountPrice: price,
                    wholesalePrice: null,
                    quantity: quantityStr,
                    wholesaleOrderQuantity: null,
                    unitsPerCarton: null,
                    weight,
                    length,
                    width,
                    height,
                    inStock: true,
                    isActive: true,
                    tags,
                    metaTitle: row.metaTitle || null,
                    metaDescription: row.metaDescription || null,
                    metaKeyword: row.metaKeyword || null,
                    images: [],
                };
                if (existing) {
                    Object.assign(existing, baseData);
                    existing.categories = categories;
                    yield productRepository.save(existing);
                    updated += 1;
                    updatedProducts.push({ title: existing.title, id: existing.id });
                }
                else {
                    const newProduct = productRepository.create(Object.assign(Object.assign({}, baseData), { categories, brand: null }));
                    yield productRepository.save(newProduct);
                    created += 1;
                    createdProducts.push({ title: newProduct.title, id: newProduct.id });
                }
            }
            res.status(200).json({
                message: "Import completed",
                created,
                updated,
                errors,
                createdProducts,
                updatedProducts,
            });
        }
        catch (error) {
            console.error("Product import error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    //Update product (Admin only)
    updateProduct: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const product = yield productRepository.findOne({
                where: { id: req.params.id },
                relations: ["categories", "brand"], // This ensures relations are loaded
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            const updateData = new product_dto_1.UpdateProductDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Update categories if provided
            if (updateData.categoryIds) {
                // Find categories with proper typing
                const categories = (yield categoryRepository.find({
                    where: { id: (0, typeorm_1.In)(updateData.categoryIds) },
                })); // Explicit type assertion
                if (categories.length !== updateData.categoryIds.length) {
                    res
                        .status(400)
                        .json({ message: "One or more category IDs are invalid" });
                    return;
                }
                // Clear existing categories and set new ones
                product.categories = categories;
            }
            if (updateData.brandId) {
                const brand = yield brandRepository.findOne({
                    where: { id: updateData.brandId },
                });
                if (!brand) {
                    res.status(400).json({ message: "Invalid brand ID" });
                    return;
                }
                product.brand = brand;
            }
            // Update other fields (excluding categories which we handled above)
            const { categoryIds, brandId } = updateData, rest = __rest(updateData, ["categoryIds", "brandId"]);
            Object.assign(product, rest);
            product.discountPrice = (_a = product.discountPrice) !== null && _a !== void 0 ? _a : product.price;
            if (updateData.tags) {
                product.tags = updateData.tags;
            }
            yield productRepository.save(product);
            // Return the updated product with categories
            const updatedProduct = yield productRepository.findOne({
                where: { id: product.id },
                relations: ["categories", "brand"],
            });
            res.status(200).json(formatProductResponse(updatedProduct));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
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
    // Upload Product Image (Admin only)
    //under work
    // uploadImage: async (req: Request, res: Response) => {
    //   try {
    //     if (!req.file) {
    //       return res.status(400).json({ message: "No file uploaded" });
    //     }
    //     // In production, you would upload to S3/Cloudinary/etc.
    //     const imagePath = `/uploads/${req.file.filename}`;
    //     return res.status(200).json({
    //       message: "Image uploaded successfully",
    //       imagePath,
    //     });
    //   } catch (error) {
    //     console.error(error);
    //     return res.status(500).json({ message: "Internal server error" });
    //   }
    // },
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
            }
            const [products, total] = yield productRepository.findAndCount({
                where: {
                    categories: { id: category.id },
                    isActive: true,
                },
                relations: ["categories", "brand"],
                take,
                skip,
                order: { createdAt: "DESC" },
            });
            const formattedProducts = products.map((product) => formatProductResponse(product));
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
                relations: ["categories", "brand"],
                take,
                skip,
                order: { createdAt: "DESC" },
            });
            const formattedProducts = products.map((product) => formatProductResponse(product));
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
