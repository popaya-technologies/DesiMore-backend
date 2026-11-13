"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnUsageMessage = exports.countReturnsUsing = void 0;
const data_source_1 = require("../data-source");
const product_return_entity_1 = require("../entities/product-return.entity");
const countReturnsUsing = (field, name, manager = data_source_1.AppDataSource.manager) => manager
    .getRepository(product_return_entity_1.ProductReturn)
    .createQueryBuilder("productReturn")
    .where(`LOWER(TRIM(productReturn.${field})) = LOWER(TRIM(:name))`, { name })
    .getCount();
exports.countReturnsUsing = countReturnsUsing;
const returnUsageMessage = (name, count) => `${name} is used by ${count} return${count === 1 ? "" : "s"} and cannot be deleted`;
exports.returnUsageMessage = returnUsageMessage;
