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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveProduct = exports.productResponse = exports.validateProductInput = exports.normalizeProductInput = exports.validateAssetUrl = exports.cleanRichText = exports.PRODUCT_RELATIONS = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const crypto_1 = require("crypto");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const data_source_1 = require("../data-source");
const product_entity_1 = require("../entities/product.entity");
const category_entity_1 = require("../entities/category.entity");
const brand_entity_1 = require("../entities/brand.entity");
const download_entity_1 = require("../entities/download.entity");
const product_attribute_entity_1 = require("../entities/product-attribute.entity");
const product_option_entity_1 = require("../entities/product-option.entity");
const product_discount_entity_1 = require("../entities/product-discount.entity");
const product_image_entity_1 = require("../entities/product-image.entity");
const product_dto_1 = require("../dto/product.dto");
const api_error_1 = require("../utils/api-error");
exports.PRODUCT_RELATIONS = [
    "categories",
    "brand",
    "attributes",
    "options",
    "discounts",
    "imageDetails",
    "downloads",
    "relatedProducts",
];
const scalars = [
    "title",
    "model",
    "summary",
    "metaTitle",
    "sku",
    "mpn",
    "metaDescription",
    "metaKeyword",
    "tag",
    "price",
    "discountPrice",
    "wholesalePrice",
    "quantity",
    "unitsPerCarton",
    "wholesaleOrderQuantity",
    "weight",
    "length",
    "width",
    "height",
    "inStock",
    "isActive",
    "package",
    "minimumQuantity",
    "subtractStock",
    "outOfStockStatus",
    "requiresShipping",
    "dateAvailable",
    "lengthClass",
    "weightClass",
    "sortOrder",
    "wholesaleQuantity",
    "wholesaleMinimumQuantity",
    "wholesaleRequiresShipping",
    "wholesaleDateAvailable",
    "wholesaleLength",
    "wholesaleWidth",
    "wholesaleHeight",
    "wholesaleWeight",
    "wholesaleLengthClass",
    "wholesaleWeightClass",
];
const cleanRichText = (value) => (0, sanitize_html_1.default)(value, {
    allowedTags: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "img",
        "h2",
        "h3",
        "h4",
        "span",
    ],
    allowedAttributes: {
        a: ["href", "title"],
        img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["https", "http"],
    allowProtocolRelative: false,
});
exports.cleanRichText = cleanRichText;
const validateAssetUrl = (value) => {
    if (typeof value !== "string" ||
        value.length > 2048 ||
        /[\\\s\x00-\x1f]/.test(value))
        throw new api_error_1.ApiError(400, "Invalid asset URL");
    if (/^\/(uploads|catalog)\//.test(value) &&
        !value.includes("..") &&
        !/%2e|%2f|%5c/i.test(value))
        return;
    try {
        const url = new URL(value);
        if (["https:", "http:"].includes(url.protocol) &&
            !url.username &&
            !url.password)
            return;
    }
    catch (_a) { }
    throw new api_error_1.ApiError(400, "Asset URL must use HTTP(S) or a local /uploads/ or /catalog/ path");
};
exports.validateAssetUrl = validateAssetUrl;
const normalizeProductInput = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input))
        throw new api_error_1.ApiError(400, "Product must be an object");
    const body = Object.assign({}, input);
    for (const [alias, key] of Object.entries({
        productName: "title",
        description: "summary",
        manufacturerId: "brandId",
        boxQuantity: "unitsPerCarton",
    })) {
        if (body[alias] !== undefined) {
            if (body[key] !== undefined && body[key] !== body[alias])
                throw new api_error_1.ApiError(400, "Conflicting " + alias + " and " + key);
            body[key] = body[alias];
            delete body[alias];
        }
    }
    if (body.unitsPerCarton !== undefined &&
        body.wholesaleOrderQuantity !== undefined &&
        String(body.unitsPerCarton) !== String(body.wholesaleOrderQuantity))
        throw new api_error_1.ApiError(400, "Box quantity aliases must agree");
    return body;
};
exports.normalizeProductInput = normalizeProductInput;
const validateProductInput = (input, creating) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const body = (0, exports.normalizeProductInput)(input);
    const dto = (0, class_transformer_1.plainToInstance)(product_dto_1.CreateProductDto, body);
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
    });
    if (errors.length)
        throw new api_error_1.ApiError(400, "Invalid product data", errors);
    if (creating)
        for (const field of [
            "title",
            "model",
            "metaTitle",
            "price",
            "quantity",
            "wholesalePrice",
            "wholesaleQuantity",
            "brandId",
            "categoryIds",
        ]) {
            if (dto[field] === undefined ||
                dto[field] === null ||
                dto[field] === "" ||
                (field === "categoryIds" && !dto.categoryIds.length))
                throw new api_error_1.ApiError(400, field + " is required");
        }
    if (!creating && !Object.keys(body).length)
        throw new api_error_1.ApiError(400, "At least one product field is required");
    if (dto.imageDetails !== undefined && dto.images !== undefined)
        throw new api_error_1.ApiError(400, "Send imageDetails or images, not both");
    if (((_a = dto.imageDetails) === null || _a === void 0 ? void 0 : _a.length) &&
        dto.imageDetails.filter((i) => i.isMain).length !== 1)
        throw new api_error_1.ApiError(400, "Choose exactly one main image");
    for (const image of dto.imageDetails || [])
        (0, exports.validateAssetUrl)(image.url);
    for (const url of dto.images || [])
        (0, exports.validateAssetUrl)(url);
    for (const discount of dto.discounts || [])
        if (discount.dateStart &&
            discount.dateEnd &&
            discount.dateEnd < discount.dateStart)
            throw new api_error_1.ApiError(400, "Discount end date must not precede start date");
    for (const option of dto.options || []) {
        const choice = ["checkbox", "select", "radio"].includes(option.type);
        if (choice && !option.values.length)
            throw new api_error_1.ApiError(400, "Choice options require values");
        if (!choice && option.values.length)
            throw new api_error_1.ApiError(400, "Text and date options cannot have choice values");
        if (new Set(option.values.map((v) => v.value.trim().toLowerCase())).size !==
            option.values.length)
            throw new api_error_1.ApiError(400, "Duplicate option values");
    }
    return dto;
});
exports.validateProductInput = validateProductInput;
const productResponse = (product, admin = false) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!product)
        return null;
    const { categories = [], brand, relatedProducts = [], downloads = [] } = product, data = __rest(product, ["categories", "brand", "relatedProducts", "downloads"]);
    const orderedImages = [...(product.imageDetails || [])].sort((a, b) => Number(b.isMain) - Number(a.isMain) ||
        a.sortOrder - b.sortOrder ||
        a.id.localeCompare(b.id));
    const result = Object.assign(Object.assign({}, data), { discountPrice: (_a = data.discountPrice) !== null && _a !== void 0 ? _a : data.price, tag: (_b = data.tag) !== null && _b !== void 0 ? _b : null, categoryIds: categories.map((c) => c.id), brandId: (_c = brand === null || brand === void 0 ? void 0 : brand.id) !== null && _c !== void 0 ? _c : null, manufacturerId: (_d = brand === null || brand === void 0 ? void 0 : brand.id) !== null && _d !== void 0 ? _d : null, boxQuantity: product.unitsPerCarton, relatedProductIds: relatedProducts.map((p) => p.id), downloadIds: downloads.map((d) => d.id), downloads: downloads.map((d) => (admin ? d : { id: d.id, name: d.name })) });
    if (product.imageDetails) {
        result.imageDetails = orderedImages;
        result.images = orderedImages.map((i) => i.url);
        result.mainImage = (_f = (_e = orderedImages.find((i) => i.isMain)) === null || _e === void 0 ? void 0 : _e.url) !== null && _f !== void 0 ? _f : null;
    }
    else
        result.mainImage = (_h = (_g = product.images) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : null;
    for (const key of ["attributes", "options"])
        if (result[key])
            result[key] = [...result[key]].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    return result;
};
exports.productResponse = productResponse;
const resolveIds = (manager, entity, ids, label) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ids.length)
        return [];
    const rows = yield manager
        .getRepository(entity)
        .findBy({ id: (0, typeorm_1.In)(ids) });
    if (rows.length !== ids.length)
        throw new api_error_1.ApiError(400, "Invalid " + label);
    return rows;
});
const replaceRows = (manager, entity, productId, rows, transform) => __awaiter(void 0, void 0, void 0, function* () {
    const repo = manager.getRepository(entity);
    const old = yield repo.findBy({ productId });
    const ids = rows.filter((r) => r.id).map((r) => r.id);
    if (new Set(ids).size !== ids.length ||
        ids.some((id) => !old.some((r) => r.id === id)))
        throw new api_error_1.ApiError(400, "Invalid or duplicate nested row ID");
    const keep = rows.map((row, i) => (Object.assign(Object.assign({}, transform(row, i, old.find((r) => r.id === row.id))), { id: row.id || (0, crypto_1.randomUUID)(), productId })));
    if (entity === product_image_entity_1.ProductImage)
        yield repo.update({ productId }, { isMain: false });
    const removed = old.filter((r) => !ids.includes(r.id)).map((r) => r.id);
    if (removed.length)
        yield repo.delete(removed);
    if (keep.length)
        yield repo.save(keep);
});
const saveProduct = (input_1, id_1, ...args_1) => __awaiter(void 0, [input_1, id_1, ...args_1], void 0, function* (input, id, legacyImport = false) {
    const dto = yield (0, exports.validateProductInput)(input, !id && !legacyImport);
    if (!id && (dto.title === undefined || dto.price === undefined))
        throw new api_error_1.ApiError(400, "title and price are required");
    return data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const repo = manager.getRepository(product_entity_1.Product);
        let product = id
            ? yield repo.findOne({
                where: { id },
                lock: { mode: "pessimistic_write" },
            })
            : repo.create({ summary: "", images: [], categories: [] });
        if (!product)
            throw new api_error_1.ApiError(404, "Product not found");
        for (const key of scalars)
            if (dto[key] !== undefined)
                product[key] = dto[key];
        if (dto.summary !== undefined)
            product.summary = (0, exports.cleanRichText)(dto.summary);
        if (dto.unitsPerCarton !== undefined)
            product.wholesaleOrderQuantity =
                dto.unitsPerCarton === null ? null : String(dto.unitsPerCarton);
        else if (dto.wholesaleOrderQuantity !== undefined)
            product.unitsPerCarton =
                dto.wholesaleOrderQuantity === null
                    ? null
                    : Number(dto.wholesaleOrderQuantity);
        if (dto.categoryIds !== undefined)
            product.categories = yield resolveIds(manager, category_entity_1.Category, dto.categoryIds, "categoryIds");
        if (dto.brandId !== undefined)
            product.brand =
                dto.brandId === null
                    ? null
                    : (yield resolveIds(manager, brand_entity_1.Brand, [dto.brandId], "brandId"))[0];
        if (dto.relatedProductIds !== undefined) {
            if (id && dto.relatedProductIds.includes(id))
                throw new api_error_1.ApiError(400, "Product cannot be related to itself");
            product.relatedProducts = yield resolveIds(manager, product_entity_1.Product, dto.relatedProductIds, "relatedProductIds");
        }
        if (dto.downloadIds !== undefined)
            product.downloads = yield resolveIds(manager, download_entity_1.Download, dto.downloadIds, "downloadIds");
        if (dto.package !== undefined) {
            for (const key of ["length", "width", "height"])
                product[key] = (_b = (_a = dto.package) === null || _a === void 0 ? void 0 : _a[key]) !== null && _b !== void 0 ? _b : null;
        }
        else if (["length", "width", "height"].some((key) => dto[key] !== undefined)) {
            product.package = {
                length: product.length,
                width: product.width,
                height: product.height,
            };
        }
        yield repo.save(product);
        if (dto.attributes !== undefined)
            yield replaceRows(manager, product_attribute_entity_1.ProductAttribute, product.id, dto.attributes, (row, index) => {
                var _a;
                return ({
                    name: row.name.trim(),
                    text: (0, exports.cleanRichText)(row.text),
                    sortOrder: (_a = row.sortOrder) !== null && _a !== void 0 ? _a : index,
                });
            });
        if (dto.discounts !== undefined)
            yield replaceRows(manager, product_discount_entity_1.ProductDiscount, product.id, dto.discounts, (row) => (Object.assign(Object.assign({}, row), { dateStart: row.dateStart || null, dateEnd: row.dateEnd || null })));
        if (dto.options !== undefined)
            yield replaceRows(manager, product_option_entity_1.ProductOption, product.id, dto.options, (row, index, old) => {
                var _a;
                const oldIds = new Set(((old === null || old === void 0 ? void 0 : old.values) || []).map((v) => v.id));
                const incomingIds = row.values.filter((v) => v.id).map((v) => v.id);
                if (new Set(incomingIds).size !== incomingIds.length ||
                    incomingIds.some((v) => !oldIds.has(v)))
                    throw new api_error_1.ApiError(400, "Invalid or duplicate option value ID");
                return {
                    name: row.name.trim(),
                    type: row.type,
                    required: row.required,
                    sortOrder: (_a = row.sortOrder) !== null && _a !== void 0 ? _a : index,
                    values: row.values.map((v) => (Object.assign(Object.assign({ quantity: 0, subtractStock: true, pricePrefix: "+", price: 0, pointsPrefix: "+", points: 0, weightPrefix: "+", weight: 0 }, v), { id: v.id || (0, crypto_1.randomUUID)() }))),
                };
            });
        const images = (_c = dto.imageDetails) !== null && _c !== void 0 ? _c : (_d = dto.images) === null || _d === void 0 ? void 0 : _d.map((url, i) => ({ url, isMain: i === 0, sortOrder: i }));
        if (images !== undefined) {
            if (new Set(images.map((i) => i.url)).size !== images.length)
                throw new api_error_1.ApiError(400, "Duplicate image URLs");
            yield replaceRows(manager, product_image_entity_1.ProductImage, product.id, images, (row) => row);
            product.images = [...images]
                .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder)
                .map((i) => i.url);
            yield repo.save(product);
        }
        return (0, exports.productResponse)(yield repo.findOne({
            where: { id: product.id },
            relations: exports.PRODUCT_RELATIONS,
        }), true);
    }));
});
exports.saveProduct = saveProduct;
