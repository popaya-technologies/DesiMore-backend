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
exports.retailCartRequiresShipping = exports.calculateRetailShippingWeight = exports.loadWeightClassValues = void 0;
const data_source_1 = require("../data-source");
const weight_class_entity_1 = require("../entities/weight-class.entity");
const loadWeightClassValues = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (manager = data_source_1.AppDataSource.manager) {
    const values = new Map();
    for (const row of yield manager.getRepository(weight_class_entity_1.WeightClass).find()) {
        const value = Number(row.value);
        if (!(value > 0))
            continue;
        values.set(row.weightTitle.trim().toLowerCase(), value);
        values.set(row.weightUnit.trim().toLowerCase(), value);
    }
    return values;
});
exports.loadWeightClassValues = loadWeightClassValues;
/** Returns retail shipping weight in pounds. Cart option snapshots already
 * contain the signed adjustment, so it must only be added once per item. */
const pounds = (value, unit, classes) => {
    var _a;
    const normalized = (unit || "pound").trim().toLowerCase();
    // Convert with the admin values when both the product's class and Pound exist.
    const classValue = classes === null || classes === void 0 ? void 0 : classes.get(normalized);
    const poundValue = (_a = classes === null || classes === void 0 ? void 0 : classes.get("pound")) !== null && _a !== void 0 ? _a : classes === null || classes === void 0 ? void 0 : classes.get("lb");
    if (classValue && poundValue)
        return (value * poundValue) / classValue;
    if (["kg", "kilogram", "kilograms"].includes(normalized))
        return value * 2.2046226218;
    if (["g", "gram", "grams"].includes(normalized))
        return value * 0.0022046226;
    if (["oz", "ounce", "ounces"].includes(normalized))
        return value / 16;
    return value;
};
const calculateRetailShippingWeight = (cart, classes) => Number((cart.items || [])
    .filter((item) => { var _a; return ((_a = item.product) === null || _a === void 0 ? void 0 : _a.requiresShipping) !== false; })
    .reduce((total, item) => {
    var _a, _b;
    const optionWeight = (item.selectedOptions || []).reduce((sum, option) => sum + Number(option.weightAdjustment || 0), 0);
    const unitWeight = Math.max(0, Number(((_a = item.product) === null || _a === void 0 ? void 0 : _a.weight) || 0) + optionWeight);
    return total + pounds(unitWeight, (_b = item.product) === null || _b === void 0 ? void 0 : _b.weightClass, classes) * Number(item.quantity || 0);
}, 0)
    .toFixed(2));
exports.calculateRetailShippingWeight = calculateRetailShippingWeight;
const retailCartRequiresShipping = (cart) => (cart.items || []).some((item) => { var _a; return ((_a = item.product) === null || _a === void 0 ? void 0 : _a.requiresShipping) !== false; });
exports.retailCartRequiresShipping = retailCartRequiresShipping;
