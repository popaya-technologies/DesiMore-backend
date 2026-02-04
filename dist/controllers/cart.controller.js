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
exports.CartController = void 0;
const data_source_1 = require("../data-source");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const product_entity_1 = require("../entities/product.entity");
const cart_dto_1 = require("../dto/cart.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const cartRepository = data_source_1.AppDataSource.getRepository(cart_entity_1.Cart);
const cartItemRepository = data_source_1.AppDataSource.getRepository(cart_item_entity_1.CartItem);
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
const CART_RELATIONS = ["items", "items.product"];
const parseCartType = (value) => value === cart_entity_1.CartType.BUY_NOW ? cart_entity_1.CartType.BUY_NOW : cart_entity_1.CartType.REGULAR;
const findCart = (userId, type) => __awaiter(void 0, void 0, void 0, function* () {
    return cartRepository.findOne({
        where: { userId, type },
        relations: [...CART_RELATIONS],
    });
});
const ensureCart = (userId, type) => __awaiter(void 0, void 0, void 0, function* () {
    let cart = yield findCart(userId, type);
    if (!cart) {
        cart = cartRepository.create({ userId, type, items: [] });
        cart = yield cartRepository.save(cart);
        cart.items = [];
    }
    return cart;
});
const toNumber = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "number")
        return isNaN(value) ? null : value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
};
const resolveProductPrice = (product) => {
    var _a;
    const discountPrice = toNumber(product.discountPrice);
    const regularPrice = toNumber(product.price);
    return (_a = discountPrice !== null && discountPrice !== void 0 ? discountPrice : regularPrice) !== null && _a !== void 0 ? _a : 0;
};
const calcFreight = (amount) => {
    if (amount >= 3500)
        return 0;
    if (amount >= 3000)
        return 75;
    if (amount >= 2500)
        return 95;
    if (amount >= 1500)
        return 125;
    if (amount >= 1200)
        return 150;
    if (amount >= 1)
        return 199;
    return 0;
};
const buildWholesaleSummary = (items) => {
    const subtotal = items.reduce((sum, item) => {
        var _a, _b;
        const qty = item.quantity || 0;
        const wholesalePrice = (_b = toNumber((_a = item.product) === null || _a === void 0 ? void 0 : _a.wholesalePrice)) !== null && _b !== void 0 ? _b : 0;
        return sum + wholesalePrice * qty;
    }, 0);
    const discount = Number((subtotal * 0.02).toFixed(2)); // 2% mandatory
    const discountedSubtotal = Math.max(subtotal - discount, 0);
    const shipping = calcFreight(discountedSubtotal);
    const tax = 0;
    const total = Number((discountedSubtotal + shipping + tax).toFixed(2));
    return { subtotal, discount, shipping, tax, total };
};
const withWholesaleSummary = (cart) => {
    var _a, _b, _c, _d;
    if (!cart)
        return cart;
    // Prefer persisted wholesale fields if present
    const summary = {
        subtotal: (_a = toNumber(cart.wholesaleSubtotal)) !== null && _a !== void 0 ? _a : 0,
        discount: (_b = toNumber(cart.wholesaleDiscount)) !== null && _b !== void 0 ? _b : 0,
        shipping: (_c = toNumber(cart.wholesaleShipping)) !== null && _c !== void 0 ? _c : 0,
        tax: 0,
        total: (_d = toNumber(cart.wholesaleTotal)) !== null && _d !== void 0 ? _d : 0,
    };
    return Object.assign({}, cart, { wholesaleSummary: summary });
};
exports.CartController = {
    // Get user's cart
    getCart: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const cartType = parseCartType(req.query.type);
            const cart = yield ensureCart(userId, cartType);
            cart.calculateTotal();
            yield cartRepository.save(cart);
            res.status(200).json(withWholesaleSummary(cart));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Add item to cart
    addToCart: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const addToCartDto = (0, class_transformer_1.plainToInstance)(cart_dto_1.AddToCartDto, req.body);
            const errors = yield (0, class_validator_1.validate)(addToCartDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Find or create cart
            let cart = yield ensureCart(userId, cart_entity_1.CartType.REGULAR);
            // Check if product exists
            const product = yield productRepository.findOne({
                where: { id: addToCartDto.productId },
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            // Check if product is in stock
            if (!product.inStock) {
                res.status(400).json({
                    message: "Product is out of stock",
                });
                return;
            }
            // Handle product quantity (could be string or number)
            const availableQuantity = typeof product.quantity === "string"
                ? parseInt(product.quantity) || 0
                : product.quantity || 0;
            if (availableQuantity < addToCartDto.quantity) {
                res.status(400).json({
                    message: "Insufficient quantity",
                    availableQuantity: availableQuantity,
                });
                return;
            }
            // Handle product price (now a number from decimal column)
            const productPrice = resolveProductPrice(product);
            if (!productPrice || productPrice <= 0) {
                res.status(400).json({ message: "Invalid product price" });
                return;
            }
            // Check if item already in cart
            const existingItem = cart.items.find((item) => item.productId === addToCartDto.productId);
            if (existingItem) {
                // Update quantity if item exists
                const newQuantity = existingItem.quantity + addToCartDto.quantity;
                existingItem.updateQuantity(newQuantity, productPrice);
                yield cartItemRepository.save(existingItem);
            }
            else {
                // Add new item
                const newItem = cartItemRepository.create({
                    cartId: cart.id,
                    productId: addToCartDto.productId,
                    quantity: addToCartDto.quantity,
                    price: productPrice,
                    product: product,
                });
                cart.items.push(newItem);
                yield cartItemRepository.save(newItem);
            }
            // Recalculate cart total
            cart.calculateTotal();
            yield cartRepository.save(cart);
            //  updated cart
            const updatedCart = yield cartRepository.findOne({
                where: { id: cart.id },
                relations: ["items", "items.product"],
            });
            res.status(200).json(withWholesaleSummary(updatedCart !== null && updatedCart !== void 0 ? updatedCart : cart));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    createBuyNowCart: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const dto = (0, class_transformer_1.plainToInstance)(cart_dto_1.AddToCartDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const product = yield productRepository.findOne({
                where: { id: dto.productId },
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            if (!product.inStock) {
                res.status(400).json({ message: "Product is out of stock" });
                return;
            }
            const availableQuantity = typeof product.quantity === "string"
                ? parseInt(product.quantity) || 0
                : product.quantity || 0;
            if (availableQuantity < dto.quantity) {
                res.status(400).json({
                    message: "Insufficient quantity",
                    availableQuantity,
                });
                return;
            }
            let cart = yield ensureCart(userId, cart_entity_1.CartType.BUY_NOW);
            yield cartItemRepository.delete({ cartId: cart.id });
            cart.items = [];
            const productPrice = resolveProductPrice(product);
            if (!productPrice || productPrice <= 0) {
                res.status(400).json({ message: "Invalid product price" });
                return;
            }
            const newItem = cartItemRepository.create({
                cartId: cart.id,
                productId: dto.productId,
                quantity: dto.quantity,
                price: productPrice,
                product,
            });
            yield cartItemRepository.save(newItem);
            cart.items = [newItem];
            cart.calculateTotal();
            yield cartRepository.save(cart);
            const updatedCart = yield cartRepository.findOne({
                where: { id: cart.id },
                relations: [...CART_RELATIONS],
            });
            res.status(200).json(updatedCart !== null && updatedCart !== void 0 ? updatedCart : cart);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Update cart item quantity
    updateCartItem: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { itemId } = req.params;
            const updateDto = (0, class_transformer_1.plainToInstance)(cart_dto_1.UpdateCartItemDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Find cart and item
            const cart = yield findCart(userId, cart_entity_1.CartType.REGULAR);
            if (!cart) {
                res.status(404).json({ message: "Cart not found" });
                return;
            }
            const cartItem = cart.items.find((item) => item.id === itemId);
            if (!cartItem) {
                res.status(404).json({ message: "Item not found in cart" });
                return;
            }
            if (updateDto.quantity === 0) {
                // Remove item if quantity is 0
                yield cartItemRepository.delete(itemId);
                cart.items = cart.items.filter((item) => item.id !== itemId);
            }
            else {
                // Check product availability
                const product = yield productRepository.findOne({
                    where: { id: cartItem.productId },
                });
                if (product && !product.inStock) {
                    res.status(400).json({
                        message: "Product is out of stock",
                    });
                    return;
                }
                // Handle available quantity
                const availableQuantity = typeof (product === null || product === void 0 ? void 0 : product.quantity) === "string"
                    ? parseInt(product.quantity) || 0
                    : (product === null || product === void 0 ? void 0 : product.quantity) || 0;
                if (updateDto.quantity > availableQuantity) {
                    res.status(400).json({
                        message: "Insufficient quantity",
                        availableQuantity: availableQuantity,
                    });
                    return;
                }
                // Update quantity
                cartItem.updateQuantity(updateDto.quantity, cartItem.price);
                yield cartItemRepository.save(cartItem);
            }
            // Recalculate cart total
            cart.calculateTotal();
            yield cartRepository.save(cart);
            res.status(200).json(withWholesaleSummary(cart));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Remove item from cart
    removeCartItem: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { itemId } = req.params;
            const cart = yield findCart(userId, cart_entity_1.CartType.REGULAR);
            if (!cart) {
                res.status(404).json({ message: "Cart not found" });
                return;
            }
            // Check if item exists in cart
            const itemExists = cart.items.some((item) => item.id === itemId);
            if (!itemExists) {
                res.status(404).json({ message: "Item not found in cart" });
                return;
            }
            // Remove item
            yield cartItemRepository.delete(itemId);
            // Update in-memory items and recalculate totals
            cart.items = cart.items.filter((item) => item.id !== itemId);
            cart.calculateTotal();
            yield cartRepository.save(cart);
            res.status(200).json(withWholesaleSummary(cart));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Clear entire cart
    clearCart: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const cartType = parseCartType(req.query.type);
            const cart = yield cartRepository.findOne({
                where: { userId, type: cartType },
                relations: ["items"],
            });
            if (!cart) {
                res.status(404).json({ message: "Cart not found" });
                return;
            }
            // Remove all items
            yield cartItemRepository.delete({ cartId: cart.id });
            // Reset cart items and totals
            cart.items = [];
            cart.total = 0;
            cart.wholesaleTotal = 0;
            cart.wholesaleSubtotal = 0;
            cart.wholesaleDiscount = 0;
            cart.wholesaleShipping = 0;
            cart.itemsCount = 0;
            yield cartRepository.save(cart);
            res.status(200).json(withWholesaleSummary(cart));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
