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
exports.cartTaxItems = exports.calculateTax = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const store_entity_1 = require("../entities/store.entity");
const tax_class_entity_1 = require("../entities/tax-class.entity");
const normalize = (value) => String(value !== null && value !== void 0 ? value : "").trim().toLowerCase();
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
// Addresses keep country as an ISO-2 code or name and state as a zone code or name,
// so a geo zone location matches on any of those.
const isInGeoZone = (address, geoZone) => {
    var _a;
    const country = normalize(address.country);
    const state = normalize(address.state);
    if (!country)
        return false;
    return ((_a = geoZone.locations) !== null && _a !== void 0 ? _a : []).some((location) => {
        var _a, _b, _c, _d, _e;
        const countryValues = [
            (_a = location.country) === null || _a === void 0 ? void 0 : _a.name,
            (_b = location.country) === null || _b === void 0 ? void 0 : _b.isoCode2,
            (_c = location.country) === null || _c === void 0 ? void 0 : _c.isoCode3,
        ].map(normalize);
        if (!countryValues.includes(country))
            return false;
        // No zone on the location means "All Zones" of the country.
        if (!location.zoneId)
            return true;
        return [(_d = location.zone) === null || _d === void 0 ? void 0 : _d.name, (_e = location.zone) === null || _e === void 0 ? void 0 : _e.code]
            .map(normalize)
            .filter(Boolean)
            .includes(state);
    });
};
// The store address is the main (first created) store's country and region/state.
const loadStoreAddress = (manager) => __awaiter(void 0, void 0, void 0, function* () {
    const [store] = yield manager.getRepository(store_entity_1.Store).find({
        select: ["id", "country", "regionState"],
        order: { createdAt: "ASC" },
        take: 1,
    });
    return { country: store === null || store === void 0 ? void 0 : store.country, state: store === null || store === void 0 ? void 0 : store.regionState };
});
const calculateTax = (items_1, addresses_1, ...args_1) => __awaiter(void 0, [items_1, addresses_1, ...args_1], void 0, function* (items, addresses, manager = data_source_1.AppDataSource.manager) {
    var _a, _b, _c, _d;
    const taxClassIds = [
        ...new Set(items
            .map((item) => item.taxClassId)
            .filter((id) => Boolean(id))),
    ];
    if (!taxClassIds.length)
        return { lines: [], total: 0 };
    const rules = yield manager.getRepository(tax_class_entity_1.TaxClassRule).find({
        where: { taxClassId: (0, typeorm_1.In)(taxClassIds) },
        relations: {
            taxRate: {
                geoZone: { locations: { country: true, zone: true } },
            },
        },
        order: { priority: "ASC", id: "ASC" },
    });
    const shipping = (_a = addresses.shipping) !== null && _a !== void 0 ? _a : null;
    // The billing address falls back to the shipping address.
    const payment = (_b = addresses.payment) !== null && _b !== void 0 ? _b : shipping;
    const store = rules.some((rule) => rule.basedOn === "store")
        ? yield loadStoreAddress(manager)
        : null;
    // Rates that apply to each tax class for these addresses (each rate once per class).
    const ratesByClass = new Map();
    for (const rule of rules) {
        const address = rule.basedOn === "payment"
            ? payment
            : rule.basedOn === "store"
                ? store
                : shipping;
        const rate = rule.taxRate;
        // Like OpenCart, a rate without a geo zone applies nowhere.
        if (!address || !(rate === null || rate === void 0 ? void 0 : rate.geoZone) || !isInGeoZone(address, rate.geoZone))
            continue;
        const classRates = (_c = ratesByClass.get(rule.taxClassId)) !== null && _c !== void 0 ? _c : new Map();
        classRates.set(rate.id, rate);
        ratesByClass.set(rule.taxClassId, classRates);
    }
    const totals = new Map();
    for (const item of items) {
        const classRates = item.taxClassId ? ratesByClass.get(item.taxClassId) : null;
        if (!classRates)
            continue;
        const quantity = Math.max(Number(item.quantity) || 0, 0);
        const lineTotal = (Number(item.price) || 0) * quantity;
        for (const rate of classRates.values()) {
            const value = Number(rate.rate) || 0;
            const amount = rate.type === "fixed" ? value * quantity : (lineTotal * value) / 100;
            const line = (_d = totals.get(rate.id)) !== null && _d !== void 0 ? _d : {
                taxRateId: rate.id,
                name: rate.name,
                rate: value,
                type: rate.type,
                amount: 0,
            };
            line.amount += amount;
            totals.set(rate.id, line);
        }
    }
    const lines = [...totals.values()]
        .map((line) => (Object.assign(Object.assign({}, line), { amount: roundMoney(line.amount) })))
        .filter((line) => line.amount > 0);
    return {
        lines,
        total: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
    };
});
exports.calculateTax = calculateTax;
// Taxable items of a cart loaded with its items and their products.
const cartTaxItems = (cart) => {
    var _a;
    return ((_a = cart.items) !== null && _a !== void 0 ? _a : []).map((item) => {
        var _a, _b;
        return ({
            taxClassId: (_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.taxClassId) !== null && _b !== void 0 ? _b : null,
            price: Number(item.price),
            quantity: item.quantity,
        });
    });
};
exports.cartTaxItems = cartTaxItems;
