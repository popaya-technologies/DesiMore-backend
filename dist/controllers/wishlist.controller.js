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
exports.WishlistController = void 0;
const cart_service_1 = require("../services/cart.service");
const api_error_1 = require("../utils/api-error");
const cart_dto_1 = require("../dto/cart.dto");
const data_source_1 = require("../data-source");
const wishlist_entity_1 = require("../entities/wishlist.entity");
const wishlist_item_entity_1 = require("../entities/wishlist-item.entity");
const product_entity_1 = require("../entities/product.entity");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const wishlist_dto_1 = require("../dto/wishlist.dto");
const wishlistRepository = data_source_1.AppDataSource.getRepository(wishlist_entity_1.Wishlist);
const wishlistItemRepository = data_source_1.AppDataSource.getRepository(wishlist_item_entity_1.WishlistItem);
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
exports.WishlistController = {
    // Get user's wishlist
    getWishlist: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            let wishlist = yield wishlistRepository.findOne({
                where: { userId },
                relations: ["items", "items.product"],
            });
            if (!wishlist) {
                wishlist = wishlistRepository.create({ userId, items: [] });
                yield wishlistRepository.save(wishlist);
            }
            res.status(200).json(wishlist);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Add a product to wishlist using route param :item (productId)
    addItemByParam: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const userId = req.user.id;
            const dto = (0, class_transformer_1.plainToInstance)(wishlist_dto_1.AddToWishlistDto, {
                productId: req.params.item,
            });
            const errors = yield (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Find or create wishlist
            let wishlist = yield wishlistRepository.findOne({
                where: { userId },
                relations: ["items", "items.product"],
            });
            if (!wishlist) {
                wishlist = wishlistRepository.create({ userId, items: [] });
                yield wishlistRepository.save(wishlist);
            }
            // Check product exists
            const product = yield productRepository.findOne({
                where: { id: dto.productId },
            });
            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }
            // Prevent duplicates
            const exists = (_a = wishlist.items) === null || _a === void 0 ? void 0 : _a.some((i) => i.productId === dto.productId);
            if (exists) {
                res.status(200).json(wishlist);
                return;
            }
            const newItem = wishlistItemRepository.create({
                wishlistId: wishlist.id,
                productId: dto.productId,
                product,
            });
            yield wishlistItemRepository.save(newItem);
            // Return updated wishlist
            const updated = yield wishlistRepository.findOne({
                where: { id: wishlist.id },
                relations: ["items", "items.product"],
            });
            res.status(200).json(updated);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Remove an item from wishlist
    removeItem: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const userId = req.user.id;
            const { itemId } = req.params;
            const wishlist = yield wishlistRepository.findOne({
                where: { userId },
                relations: ["items"],
            });
            if (!wishlist) {
                res.status(404).json({ message: "Wishlist not found" });
                return;
            }
            const itemExists = (_a = wishlist.items) === null || _a === void 0 ? void 0 : _a.some((i) => i.id === itemId);
            if (!itemExists) {
                res.status(404).json({ message: "Item not found in wishlist" });
                return;
            }
            yield wishlistItemRepository.delete(itemId);
            const updated = yield wishlistRepository.findOne({
                where: { id: wishlist.id },
                relations: ["items", "items.product"],
            });
            res.status(200).json(updated);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Clear wishlist
    clearWishlist: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const wishlist = yield wishlistRepository.findOne({
                where: { userId },
                relations: ["items"],
            });
            if (!wishlist) {
                res.status(404).json({ message: "Wishlist not found" });
                return;
            }
            yield wishlistItemRepository.delete({ wishlistId: wishlist.id });
            const updated = yield wishlistRepository.findOne({
                where: { id: wishlist.id },
                relations: ["items", "items.product"],
            });
            res.status(200).json(updated);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Move wishlist item to cart (adds quantity 1 and removes from wishlist)
    moveItemToCart: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const userId = req.user.id;
            const { itemId } = req.params;
            // Load wishlist + items
            const wishlist = yield wishlistRepository.findOne({
                where: { userId },
                relations: ["items", "items.product"],
            });
            if (!wishlist) {
                res.status(404).json({ message: "Wishlist not found" });
                return;
            }
            const wItem = (_a = wishlist.items) === null || _a === void 0 ? void 0 : _a.find((i) => i.id === itemId);
            if (!wItem) {
                res.status(404).json({ message: "Item not found in wishlist" });
                return;
            }
            const cartDto = (0, class_transformer_1.plainToInstance)(cart_dto_1.AddToCartDto, {
                productId: wItem.productId,
                quantity: (_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.quantity) !== null && _c !== void 0 ? _c : 1,
                selectedOptions: (_d = req.body) === null || _d === void 0 ? void 0 : _d.selectedOptions,
            });
            const cartErrors = yield (0, class_validator_1.validate)(cartDto, {
                whitelist: true,
                forbidNonWhitelisted: true,
                validationError: { target: false, value: false },
            });
            if (cartErrors.length)
                throw new api_error_1.ApiError(400, "Invalid cart data", cartErrors);
            const updatedCart = yield (0, cart_service_1.addCartItem)(req.user, wItem.productId, cartDto.quantity, cartDto.selectedOptions);
            // Remove from wishlist
            yield wishlistItemRepository.delete(wItem.id);
            // Return updated resources
            const updatedWishlist = yield wishlistRepository.findOne({
                where: { id: wishlist.id },
                relations: ["items", "items.product"],
            });
            res.status(200).json({ cart: updatedCart, wishlist: updatedWishlist });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
