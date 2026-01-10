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
exports.CheckoutPaymentDto = exports.RefundPaymentDto = exports.ProcessPaymentDto = void 0;
const class_validator_1 = require("class-validator");
const order_dto_1 = require("./order.dto");
class ProcessPaymentDto {
}
exports.ProcessPaymentDto = ProcessPaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessPaymentDto.prototype, "orderId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{13,19}$/, { message: "Invalid card number" }),
    __metadata("design:type", String)
], ProcessPaymentDto.prototype, "cardNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, {
        message: "Invalid expiration date (MM/YY)",
    }),
    __metadata("design:type", String)
], ProcessPaymentDto.prototype, "expirationDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{3,4}$/, { message: "Invalid CVV" }),
    __metadata("design:type", String)
], ProcessPaymentDto.prototype, "cardCode", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], ProcessPaymentDto.prototype, "amount", void 0);
class RefundPaymentDto {
}
exports.RefundPaymentDto = RefundPaymentDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], RefundPaymentDto.prototype, "amount", void 0);
// New DTO to support pay-then-create flow (no pre-existing orderId)
class CheckoutPaymentDto extends order_dto_1.CreateOrderDto {
}
exports.CheckoutPaymentDto = CheckoutPaymentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{13,19}$/u, { message: "Invalid card number" }),
    __metadata("design:type", String)
], CheckoutPaymentDto.prototype, "cardNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/u, {
        message: "Invalid expiration date (MM/YY)",
    }),
    __metadata("design:type", String)
], CheckoutPaymentDto.prototype, "expirationDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{3,4}$/u, { message: "Invalid CVV" }),
    __metadata("design:type", String)
], CheckoutPaymentDto.prototype, "cardCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CheckoutPaymentDto.prototype, "amount", void 0);
