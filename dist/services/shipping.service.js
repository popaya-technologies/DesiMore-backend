"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retailCartRequiresShipping = exports.calculateRetailShippingWeight = void 0;
/** Returns retail shipping weight in pounds. Cart option snapshots already
 * contain the signed adjustment, so it must only be added once per item. */
const pounds = (value, unit) => {
    const normalized = (unit || "pound").trim().toLowerCase();
    if (["kg", "kilogram", "kilograms"].includes(normalized))
        return value * 2.2046226218;
    if (["g", "gram", "grams"].includes(normalized))
        return value * 0.0022046226;
    if (["oz", "ounce", "ounces"].includes(normalized))
        return value / 16;
    return value;
};
const calculateRetailShippingWeight = (cart) => Number((cart.items || [])
    .filter((item) => { var _a; return ((_a = item.product) === null || _a === void 0 ? void 0 : _a.requiresShipping) !== false; })
    .reduce((total, item) => {
    var _a, _b;
    const optionWeight = (item.selectedOptions || []).reduce((sum, option) => sum + Number(option.weightAdjustment || 0), 0);
    const unitWeight = Math.max(0, Number(((_a = item.product) === null || _a === void 0 ? void 0 : _a.weight) || 0) + optionWeight);
    return total + pounds(unitWeight, (_b = item.product) === null || _b === void 0 ? void 0 : _b.weightClass) * Number(item.quantity || 0);
}, 0)
    .toFixed(2));
exports.calculateRetailShippingWeight = calculateRetailShippingWeight;
const retailCartRequiresShipping = (cart) => (cart.items || []).some((item) => { var _a; return ((_a = item.product) === null || _a === void 0 ? void 0 : _a.requiresShipping) !== false; });
exports.retailCartRequiresShipping = retailCartRequiresShipping;
