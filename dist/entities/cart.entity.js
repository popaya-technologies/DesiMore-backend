"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cart = exports.CartType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const cart_item_entity_1 = require("./cart-item.entity");
var CartType;
(function (CartType) {
    CartType["REGULAR"] = "regular";
    CartType["BUY_NOW"] = "buy-now";
})(CartType || (exports.CartType = CartType = {}));
let Cart = class Cart {
    calculateTotal() {
        var _a, _b, _c;
        const items = (_a = this.items) !== null && _a !== void 0 ? _a : [];
        let total = 0;
        let wholesaleSubtotal = 0;
        let count = 0;
        for (const item of items) {
            const quantity = (_b = item.quantity) !== null && _b !== void 0 ? _b : 0;
            const regularPrice = this.toNumber(item.price);
            const wholesalePrice = this.toNumber((_c = item.product) === null || _c === void 0 ? void 0 : _c.wholesalePrice);
            total += regularPrice * quantity;
            wholesaleSubtotal += wholesalePrice * quantity;
            count += quantity;
        }
        const wholesaleDiscount = Number((wholesaleSubtotal * 0.02).toFixed(2));
        const discountedWholesale = Math.max(wholesaleSubtotal - wholesaleDiscount, 0);
        const wholesaleShipping = this.calcFreight(discountedWholesale);
        const wholesaleTotal = discountedWholesale + wholesaleShipping;
        this.total = total;
        this.wholesaleSubtotal = wholesaleSubtotal;
        this.wholesaleDiscount = wholesaleDiscount;
        this.wholesaleShipping = wholesaleShipping;
        this.wholesaleTotal = wholesaleTotal;
        this.itemsCount = count;
    }
    calcFreight(amount) {
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
    }
    toNumber(value) {
        if (value === null || value === undefined) {
            return 0;
        }
        if (typeof value === "number") {
            return isNaN(value) ? 0 : value;
        }
        if (typeof value === "string") {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }
};
exports.Cart = Cart;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Cart.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.carts, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", user_entity_1.User)
], Cart.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], Cart.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => cart_item_entity_1.CartItem, (cartItem) => cartItem.cart, { cascade: true }),
    __metadata("design:type", Array)
], Cart.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Cart.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Cart.prototype, "wholesaleTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Cart.prototype, "wholesaleSubtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Cart.prototype, "wholesaleDiscount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Cart.prototype, "wholesaleShipping", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 0 }),
    __metadata("design:type", Number)
], Cart.prototype, "itemsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: CartType.REGULAR }),
    __metadata("design:type", String)
], Cart.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Cart.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Cart.prototype, "updatedAt", void 0);
exports.Cart = Cart = __decorate([
    (0, typeorm_1.Entity)("carts"),
    (0, typeorm_1.Index)(["userId", "type"], { unique: true })
], Cart);
