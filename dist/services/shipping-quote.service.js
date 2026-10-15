"use strict";
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
exports.getMockShippingQuote = exports.getMockShippingQuotes = void 0;
const api_error_1 = require("../utils/api-error");
const product_pricing_service_1 = require("./product-pricing.service");
// Temporary mock rates expressed per pound. They reproduce the legacy site's
// 30 lb examples and keep all client-visible and order pricing in one service.
const MOCK_UPS_METHODS = [
    { shippingCode: "ups.03", name: "UPS Ground", ratePerPound: 8.216 },
    { shippingCode: "ups.12", name: "UPS 3 Day Select", ratePerPound: 22.197 },
    { shippingCode: "ups.02", name: "UPS 2nd Day Air", ratePerPound: 28.6883333333 },
    { shippingCode: "ups.01", name: "UPS Next Day Air", ratePerPound: 36.0813333333 },
];
const getMockShippingQuotes = (weightPounds) => {
    if (!Number.isFinite(weightPounds) || weightPounds < 0)
        throw new api_error_1.ApiError(400, "Invalid shipping weight");
    if (weightPounds === 0)
        return [];
    return MOCK_UPS_METHODS.map((_a) => {
        var { ratePerPound } = _a, method = __rest(_a, ["ratePerPound"]);
        return (Object.assign(Object.assign({}, method), { price: (0, product_pricing_service_1.roundMoney)(weightPounds * ratePerPound) }));
    });
};
exports.getMockShippingQuotes = getMockShippingQuotes;
const getMockShippingQuote = (weightPounds, shippingCode) => {
    const quote = (0, exports.getMockShippingQuotes)(weightPounds).find((method) => method.shippingCode === shippingCode);
    if (!quote)
        throw new api_error_1.ApiError(400, "Invalid or unavailable shipping method");
    return quote;
};
exports.getMockShippingQuote = getMockShippingQuote;
