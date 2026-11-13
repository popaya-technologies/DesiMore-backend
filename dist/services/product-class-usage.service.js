"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classUsageMessage = exports.countProductsUsingClass = void 0;
const data_source_1 = require("../data-source");
const product_entity_1 = require("../entities/product.entity");
// Products keep their weight / length class as text (e.g. "pound", "inch"), for the
// retail and the wholesale data, so a class is "in use" when a product stores its
// title or unit.
const countProductsUsingClass = (kind, values, manager = data_source_1.AppDataSource.manager) => {
    const names = values
        .filter((value) => Boolean(value === null || value === void 0 ? void 0 : value.trim()))
        .map((value) => value.trim().toLowerCase());
    if (!names.length)
        return Promise.resolve(0);
    const field = kind === "weight" ? "weightClass" : "lengthClass";
    const wholesaleField = kind === "weight" ? "wholesaleWeightClass" : "wholesaleLengthClass";
    return manager
        .getRepository(product_entity_1.Product)
        .createQueryBuilder("product")
        .where(`(LOWER(TRIM(product.${field})) IN (:...names) OR LOWER(TRIM(product.${wholesaleField})) IN (:...names))`, { names })
        .getCount();
};
exports.countProductsUsingClass = countProductsUsingClass;
const classUsageMessage = (title, count) => `${title} is used by ${count} product${count === 1 ? "" : "s"} and cannot be deleted`;
exports.classUsageMessage = classUsageMessage;
