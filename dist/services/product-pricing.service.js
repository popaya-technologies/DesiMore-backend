"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectionKey = exports.quoteProduct = exports.effectivePrice = exports.freight = exports.roundMoney = exports.isWholesaler = void 0;
const api_error_1 = require("../utils/api-error");
const class_validator_1 = require("class-validator");
const isWholesaler = (user) => {
    var _a;
    return (user === null || user === void 0 ? void 0 : user.userRole) === "wholesaler" ||
        ((_a = user === null || user === void 0 ? void 0 : user.roles) === null || _a === void 0 ? void 0 : _a.some((r) => r.name === "wholesaler"));
};
exports.isWholesaler = isWholesaler;
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
exports.roundMoney = roundMoney;
const freight = (value) => value >= 3500
    ? 0
    : value >= 3000
        ? 75
        : value >= 2500
            ? 95
            : value >= 1500
                ? 125
                : value >= 1200
                    ? 150
                    : value > 0
                        ? 199
                        : 0;
exports.freight = freight;
const effectivePrice = (product, quantity, wholesale = false, today = new Date().toISOString().slice(0, 10)) => {
    var _a;
    const rules = (product.discounts || []).filter((d) => d.customerGroup === (wholesale ? "wholesaler" : "default") &&
        quantity >= d.quantity &&
        (!d.dateStart || d.dateStart <= today) &&
        (!d.dateEnd || d.dateEnd >= today));
    // Largest applicable quantity break, then lowest priority number, then lowest price.
    rules.sort((a, b) => b.quantity - a.quantity ||
        a.priority - b.priority ||
        Number(a.price) - Number(b.price));
    const price = rules.length
        ? Number(rules[0].price)
        : Number(wholesale
            ? product.wholesalePrice
            : ((_a = product.discountPrice) !== null && _a !== void 0 ? _a : product.price));
    if (!Number.isFinite(price) ||
        price < 0 ||
        (wholesale && product.wholesalePrice == null))
        throw new api_error_1.ApiError(400, "Invalid product price");
    return price;
};
exports.effectivePrice = effectivePrice;
const quoteProduct = (product, quantity, selected = [], wholesale = false) => {
    var _a, _b;
    const today = new Date().toISOString().slice(0, 10);
    if (!product || !product.isActive)
        throw new api_error_1.ApiError(400, "Product is unavailable");
    const date = wholesale
        ? product.wholesaleDateAvailable
        : product.dateAvailable;
    if (date && date > today)
        throw new api_error_1.ApiError(400, "Product is not available yet");
    const minimum = (_a = (wholesale ? product.wholesaleMinimumQuantity : product.minimumQuantity)) !== null && _a !== void 0 ? _a : 1;
    if (!Number.isInteger(quantity) || quantity < minimum)
        throw new api_error_1.ApiError(400, "Minimum quantity is " + minimum);
    if (!wholesale && !product.inStock)
        throw new api_error_1.ApiError(400, "Product is out of stock");
    const available = Number(wholesale ? product.wholesaleQuantity : product.quantity);
    if ((wholesale || product.subtractStock !== false) &&
        (!Number.isFinite(available) || quantity > available))
        throw new api_error_1.ApiError(400, "Insufficient " + (wholesale ? "wholesale " : "") + "stock");
    const options = product.options || [];
    if (new Set(selected.map((s) => s.optionId)).size !== selected.length)
        throw new api_error_1.ApiError(400, "Duplicate option selection");
    if (selected.some((s) => !options.some((o) => o.id === s.optionId)))
        throw new api_error_1.ApiError(400, "Unknown product option");
    let adjustment = 0, points = 0, weight = 0;
    const snapshot = [];
    for (const option of options) {
        const selection = selected.find((s) => s.optionId === option.id);
        const choice = ["checkbox", "select", "radio"].includes(option.type);
        const ids = (selection === null || selection === void 0 ? void 0 : selection.valueIds) || [];
        const text = (_b = selection === null || selection === void 0 ? void 0 : selection.text) === null || _b === void 0 ? void 0 : _b.trim();
        if (choice && text)
            throw new api_error_1.ApiError(400, "Choice option cannot contain text");
        if (!choice && ids.length)
            throw new api_error_1.ApiError(400, "Text option cannot contain value IDs");
        if (option.required && (choice ? !ids.length : !text))
            throw new api_error_1.ApiError(400, "Required option: " + option.name);
        if (!selection || (choice ? !ids.length : !text))
            continue;
        if (new Set(ids).size !== ids.length ||
            (option.type !== "checkbox" && ids.length > 1))
            throw new api_error_1.ApiError(400, "Invalid option selection");
        if (!choice && ["date", "time", "datetime"].includes(option.type)) {
            const valid = option.type === "time"
                ? /^([01]\d|2[0-3]):[0-5]\d$/.test(text)
                : option.type === "date"
                    ? /^\d{4}-\d{2}-\d{2}$/.test(text) &&
                        (0, class_validator_1.isISO8601)(text, { strict: true })
                    : (0, class_validator_1.isISO8601)(text, { strict: true });
            if (!valid)
                throw new api_error_1.ApiError(400, "Invalid date/time option");
        }
        let priceDelta = 0, pointsDelta = 0, weightDelta = 0;
        const values = ids.map((id) => {
            const value = option.values.find((v) => v.id === id);
            if (!value)
                throw new api_error_1.ApiError(400, "Unknown option value");
            if (value.subtractStock && quantity > value.quantity)
                throw new api_error_1.ApiError(400, "Insufficient option stock");
            priceDelta += (value.pricePrefix === "-" ? -1 : 1) * Number(value.price);
            pointsDelta +=
                (value.pointsPrefix === "-" ? -1 : 1) * Number(value.points);
            weightDelta +=
                (value.weightPrefix === "-" ? -1 : 1) * Number(value.weight);
            return value.value;
        });
        adjustment += priceDelta;
        points += pointsDelta;
        weight += weightDelta;
        snapshot.push(Object.assign(Object.assign({ optionId: option.id, name: option.name }, (choice ? { valueIds: ids, values } : { text })), { priceAdjustment: (0, exports.roundMoney)(priceDelta), pointsAdjustment: pointsDelta, weightAdjustment: (0, exports.roundMoney)(weightDelta) }));
    }
    const price = (0, exports.roundMoney)((0, exports.effectivePrice)(product, quantity, wholesale) + adjustment);
    if (price < 0)
        throw new api_error_1.ApiError(400, "Option adjustments produce a negative price");
    return {
        price,
        selectedOptions: snapshot,
        points,
        weight: (0, exports.roundMoney)(Number(wholesale ? product.wholesaleWeight || 0 : product.weight || 0) +
            weight),
        requiresShipping: wholesale
            ? product.wholesaleRequiresShipping !== false
            : product.requiresShipping !== false,
    };
};
exports.quoteProduct = quoteProduct;
const selectionKey = (selections = []) => JSON.stringify(selections
    .map((s) => {
    var _a;
    return ({
        optionId: s.optionId,
        valueIds: [...(s.valueIds || [])].sort(),
        text: ((_a = s.text) === null || _a === void 0 ? void 0 : _a.trim()) || "",
    });
})
    .sort((a, b) => a.optionId.localeCompare(b.optionId)));
exports.selectionKey = selectionKey;
