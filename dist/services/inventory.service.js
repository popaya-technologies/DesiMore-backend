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
exports.releaseInventory = exports.reserveCartInventory = void 0;
const product_entity_1 = require("../entities/product.entity");
const product_option_entity_1 = require("../entities/product-option.entity");
const cart_service_1 = require("./cart.service");
const api_error_1 = require("../utils/api-error");
const reserveCartInventory = (manager, cart, wholesale) => __awaiter(void 0, void 0, void 0, function* () {
    const ids = [...new Set(cart.items.map((i) => i.productId))].sort();
    const products = new Map();
    for (const id of ids) {
        const product = yield manager
            .getRepository(product_entity_1.Product)
            .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!product)
            throw new api_error_1.ApiError(400, "Product no longer exists");
        product.options = yield manager
            .getRepository(product_option_entity_1.ProductOption)
            .findBy({ productId: id });
        product.discounts = yield manager
            .getRepository(product_entity_1.Product)
            .createQueryBuilder("product")
            .relation(product_entity_1.Product, "discounts")
            .of(id)
            .loadMany();
        products.set(id, product);
    }
    for (const item of cart.items)
        item.product = products.get(item.productId);
    (0, cart_service_1.repriceCart)(cart, wholesale);
    const reservations = [];
    for (const item of cart.items) {
        const product = item.product;
        const productDeducted = wholesale || product.subtractStock !== false;
        if (productDeducted) {
            if (wholesale)
                product.wholesaleQuantity -= item.quantity;
            else
                product.quantity = String(Number(product.quantity) - item.quantity);
        }
        const optionValueIds = [];
        for (const selection of item.selectedOptions || []) {
            const option = product.options.find((o) => o.id === selection.optionId);
            for (const id of selection.valueIds || []) {
                const value = option.values.find((v) => v.id === id);
                if (value.subtractStock) {
                    value.quantity -= item.quantity;
                    optionValueIds.push(id);
                }
            }
        }
        reservations.push({
            productId: product.id,
            quantity: item.quantity,
            wholesale,
            productDeducted,
            optionValueIds,
        });
    }
    for (const product of products.values()) {
        yield manager.getRepository(product_entity_1.Product).save(product);
        if (product.options.length)
            yield manager.getRepository(product_option_entity_1.ProductOption).save(product.options);
    }
    return reservations;
});
exports.reserveCartInventory = reserveCartInventory;
const releaseInventory = (manager, reservations) => __awaiter(void 0, void 0, void 0, function* () {
    for (const id of [...new Set(reservations.map((r) => r.productId))].sort()) {
        const product = yield manager
            .getRepository(product_entity_1.Product)
            .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!product)
            continue;
        const options = yield manager
            .getRepository(product_option_entity_1.ProductOption)
            .findBy({ productId: id });
        for (const row of reservations.filter((r) => r.productId === id)) {
            if (row.productDeducted) {
                if (row.wholesale)
                    product.wholesaleQuantity += row.quantity;
                else
                    product.quantity = String(Number(product.quantity) + row.quantity);
            }
            for (const option of options)
                for (const value of option.values)
                    if (row.optionValueIds.includes(value.id))
                        value.quantity += row.quantity;
        }
        yield manager.getRepository(product_entity_1.Product).save(product);
        if (options.length)
            yield manager.getRepository(product_option_entity_1.ProductOption).save(options);
    }
});
exports.releaseInventory = releaseInventory;
