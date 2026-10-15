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
exports.NewsletterController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const newsletter_dto_1 = require("../dto/newsletter.dto");
const newsletter_service_1 = require("../services/newsletter.service");
const api_error_1 = require("../utils/api-error");
const validated = (type, body) => __awaiter(void 0, void 0, void 0, function* () {
    const dto = (0, class_transformer_1.plainToInstance)(type, body);
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
    });
    if (errors.length)
        throw new api_error_1.ApiError(400, "Invalid newsletter data", errors);
    return dto;
});
exports.NewsletterController = {
    subscribe: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = yield validated(newsletter_dto_1.SubscribeNewsletterDto, req.body);
            const preference = yield new newsletter_service_1.NewsletterService().setPreference(dto.email, true);
            res.status(200).json(Object.assign(Object.assign({}, preference), { message: "You have been subscribed to the newsletter." }));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    getMyPreference: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield new newsletter_service_1.NewsletterService().getPreference(req.user.email));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    updateMyPreference: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = yield validated(newsletter_dto_1.UpdateNewsletterPreferenceDto, req.body);
            const preference = yield new newsletter_service_1.NewsletterService().setPreference(req.user.email, dto.subscribed);
            res.json(Object.assign(Object.assign({}, preference), { message: dto.subscribed
                    ? "Your newsletter subscription has been enabled."
                    : "Your newsletter subscription has been disabled." }));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
