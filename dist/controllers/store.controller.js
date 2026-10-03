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
exports.StoreController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const store_entity_1 = require("../entities/store.entity");
const store_dto_1 = require("../dto/store.dto");
const typeorm_1 = require("typeorm");
const api_error_1 = require("../utils/api-error");
const storeRepository = data_source_1.AppDataSource.getRepository(store_entity_1.Store);
exports.StoreController = {
    // Create Store
    createStore: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17;
        try {
            const storeData = new store_dto_1.CreateStoreDto();
            Object.assign(storeData, req.body);
            const errors = yield (0, class_validator_1.validate)(storeData, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: {
                    target: false,
                },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Keep only one default store
            if (storeData.isDefault === true) {
                yield storeRepository.update({ isDefault: true }, { isDefault: false });
            }
            const store = storeRepository.create({
                metaTitle: (_b = (_a = storeData.metaTitle) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "",
                metaTagDescription: (_d = (_c = storeData.metaTagDescription) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "",
                metaTagKeywords: (_f = (_e = storeData.metaTagKeywords) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : "",
                name: storeData.name.trim(),
                storeOwner: storeData.storeOwner.trim(),
                address: storeData.address.trim(),
                geocode: (_h = (_g = storeData.geocode) === null || _g === void 0 ? void 0 : _g.trim()) !== null && _h !== void 0 ? _h : "",
                email: storeData.email.trim(),
                telephone: storeData.telephone.trim(),
                fax: (_k = (_j = storeData.fax) === null || _j === void 0 ? void 0 : _j.trim()) !== null && _k !== void 0 ? _k : "",
                image: (_m = (_l = storeData.image) === null || _l === void 0 ? void 0 : _l.trim()) !== null && _m !== void 0 ? _m : "",
                openingTimes: (_p = (_o = storeData.openingTimes) === null || _o === void 0 ? void 0 : _o.trim()) !== null && _p !== void 0 ? _p : "",
                comment: (_r = (_q = storeData.comment) === null || _q === void 0 ? void 0 : _q.trim()) !== null && _r !== void 0 ? _r : "",
                country: ((_s = storeData.country) === null || _s === void 0 ? void 0 : _s.trim()) || "United States",
                regionState: ((_t = storeData.regionState) === null || _t === void 0 ? void 0 : _t.trim()) || "New Jersey",
                language: ((_u = storeData.language) === null || _u === void 0 ? void 0 : _u.trim()) || "English",
                currency: ((_v = storeData.currency) === null || _v === void 0 ? void 0 : _v.trim()) || "US Dollar",
                displayPricesWithTax: (_w = storeData.displayPricesWithTax) !== null && _w !== void 0 ? _w : false,
                useStoreTaxAddress: (_y = (_x = storeData.useStoreTaxAddress) === null || _x === void 0 ? void 0 : _x.trim()) !== null && _y !== void 0 ? _y : "",
                useCustomerTaxAddress: (_0 = (_z = storeData.useCustomerTaxAddress) === null || _z === void 0 ? void 0 : _z.trim()) !== null && _0 !== void 0 ? _0 : "",
                customerGroup: ((_1 = storeData.customerGroup) === null || _1 === void 0 ? void 0 : _1.trim()) || "Default",
                customerGroups: (_2 = storeData.customerGroups) !== null && _2 !== void 0 ? _2 : ["Default"],
                accountTerms: (_4 = (_3 = storeData.accountTerms) === null || _3 === void 0 ? void 0 : _3.trim()) !== null && _4 !== void 0 ? _4 : "",
                displayWeightOnCartPage: (_5 = storeData.displayWeightOnCartPage) !== null && _5 !== void 0 ? _5 : false,
                guestCheckout: (_6 = storeData.guestCheckout) !== null && _6 !== void 0 ? _6 : false,
                checkoutTerms: (_8 = (_7 = storeData.checkoutTerms) === null || _7 === void 0 ? void 0 : _7.trim()) !== null && _8 !== void 0 ? _8 : "",
                orderStatus: ((_9 = storeData.orderStatus) === null || _9 === void 0 ? void 0 : _9.trim()) || "Canceled",
                displayStock: (_10 = storeData.displayStock) !== null && _10 !== void 0 ? _10 : false,
                stockCheckout: (_11 = storeData.stockCheckout) !== null && _11 !== void 0 ? _11 : false,
                storeLogo: (_13 = (_12 = storeData.storeLogo) === null || _12 === void 0 ? void 0 : _12.trim()) !== null && _13 !== void 0 ? _13 : "",
                icon: (_15 = (_14 = storeData.icon) === null || _14 === void 0 ? void 0 : _14.trim()) !== null && _15 !== void 0 ? _15 : "",
                url: storeData.url.trim(),
                useSsl: (_16 = storeData.useSsl) !== null && _16 !== void 0 ? _16 : false,
                isDefault: (_17 = storeData.isDefault) !== null && _17 !== void 0 ? _17 : false,
            });
            yield storeRepository.save(store);
            res.status(201).json(store);
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    // Get Stores
    getStores: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, url, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
            const skip = (currentPage - 1) * take;
            const where = [];
            if (name) {
                where.push({
                    name: (0, typeorm_1.ILike)(`%${String(name).trim()}%`),
                });
            }
            if (url) {
                where.push({
                    url: (0, typeorm_1.ILike)(`%${String(url).trim()}%`),
                });
            }
            let stores;
            let total;
            if (where.length > 0) {
                const result = yield storeRepository.findAndCount({
                    where,
                    order: {
                        isDefault: "DESC",
                        createdAt: "DESC",
                    },
                    skip,
                    take,
                });
                stores = result[0];
                total = result[1];
            }
            else {
                const result = yield storeRepository.findAndCount({
                    order: {
                        isDefault: "DESC",
                        createdAt: "DESC",
                    },
                    skip,
                    take,
                });
                stores = result[0];
                total = result[1];
            }
            const totalPages = Math.max(Math.ceil(total / take), 1);
            res.json({
                data: stores,
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages,
                },
            });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    // Get Store By ID
    getStoreById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const store = yield storeRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!store) {
                res.status(404).json({
                    message: "Store not found",
                });
                return;
            }
            res.json(store);
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    // Update Store
    updateStore: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const store = yield storeRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!store) {
                res.status(404).json({
                    message: "Store not found",
                });
                return;
            }
            const storeData = new store_dto_1.UpdateStoreDto();
            Object.assign(storeData, req.body);
            const errors = yield (0, class_validator_1.validate)(storeData, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: {
                    target: false,
                },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (storeData.isDefault === true) {
                yield storeRepository
                    .createQueryBuilder()
                    .update(store_entity_1.Store)
                    .set({ isDefault: false })
                    .where("isDefault = :isDefault", {
                    isDefault: true,
                })
                    .andWhere("id != :id", {
                    id: store.id,
                })
                    .execute();
            }
            Object.assign(store, Object.assign(Object.assign({}, storeData), { metaTitle: storeData.metaTitle !== undefined
                    ? storeData.metaTitle.trim()
                    : store.metaTitle, metaTagDescription: storeData.metaTagDescription !== undefined
                    ? storeData.metaTagDescription.trim()
                    : store.metaTagDescription, metaTagKeywords: storeData.metaTagKeywords !== undefined
                    ? storeData.metaTagKeywords.trim()
                    : store.metaTagKeywords, name: storeData.name !== undefined
                    ? storeData.name.trim()
                    : store.name, storeOwner: storeData.storeOwner !== undefined
                    ? storeData.storeOwner.trim()
                    : store.storeOwner, address: storeData.address !== undefined
                    ? storeData.address.trim()
                    : store.address, geocode: storeData.geocode !== undefined
                    ? storeData.geocode.trim()
                    : store.geocode, email: storeData.email !== undefined
                    ? storeData.email.trim()
                    : store.email, telephone: storeData.telephone !== undefined
                    ? storeData.telephone.trim()
                    : store.telephone, fax: storeData.fax !== undefined
                    ? storeData.fax.trim()
                    : store.fax, image: storeData.image !== undefined
                    ? storeData.image.trim()
                    : store.image, openingTimes: storeData.openingTimes !== undefined
                    ? storeData.openingTimes.trim()
                    : store.openingTimes, comment: storeData.comment !== undefined
                    ? storeData.comment.trim()
                    : store.comment, country: storeData.country !== undefined
                    ? storeData.country.trim()
                    : store.country, regionState: storeData.regionState !== undefined
                    ? storeData.regionState.trim()
                    : store.regionState, language: storeData.language !== undefined
                    ? storeData.language.trim()
                    : store.language, currency: storeData.currency !== undefined
                    ? storeData.currency.trim()
                    : store.currency, useStoreTaxAddress: storeData.useStoreTaxAddress !== undefined
                    ? storeData.useStoreTaxAddress.trim()
                    : store.useStoreTaxAddress, useCustomerTaxAddress: storeData.useCustomerTaxAddress !== undefined
                    ? storeData.useCustomerTaxAddress.trim()
                    : store.useCustomerTaxAddress, customerGroup: storeData.customerGroup !== undefined
                    ? storeData.customerGroup.trim()
                    : store.customerGroup, accountTerms: storeData.accountTerms !== undefined
                    ? storeData.accountTerms.trim()
                    : store.accountTerms, checkoutTerms: storeData.checkoutTerms !== undefined
                    ? storeData.checkoutTerms.trim()
                    : store.checkoutTerms, orderStatus: storeData.orderStatus !== undefined
                    ? storeData.orderStatus.trim()
                    : store.orderStatus, storeLogo: storeData.storeLogo !== undefined
                    ? storeData.storeLogo.trim()
                    : store.storeLogo, icon: storeData.icon !== undefined
                    ? storeData.icon.trim()
                    : store.icon, url: storeData.url !== undefined
                    ? storeData.url.trim()
                    : store.url }));
            yield storeRepository.save(store);
            res.json(store);
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    // Delete Store
    deleteStore: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const store = yield storeRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!store) {
                res.status(404).json({
                    message: "Store not found",
                });
                return;
            }
            yield storeRepository.remove(store);
            res.json({
                message: "Store deleted successfully",
            });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
