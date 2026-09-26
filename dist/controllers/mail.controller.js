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
exports.MailController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const mail_request_entity_1 = require("../entities/mail-request.entity");
const newsletter_subscriber_entity_1 = require("../entities/newsletter-subscriber.entity");
const mail_service_1 = require("../services/mail.service");
const api_error_1 = require("../utils/api-error");
exports.MailController = {
    options: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const count = yield data_source_1.AppDataSource.getRepository(newsletter_subscriber_entity_1.NewsletterSubscriber).countBy({ isActive: true });
            res.json({
                from: [{ value: "default", label: "Default" }],
                to: [{ value: "newsletter_subscribers", label: "All Newsletter Subscribers", count }],
                maxRecipients: 500,
            });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    send: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield new mail_service_1.MailService().send(req.body, req.user.id));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    status: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const requestId = String(req.params.requestId);
            if (!(0, class_validator_1.isUUID)(requestId)) {
                res.status(400).json({ message: "Invalid requestId" });
                return;
            }
            const record = yield data_source_1.AppDataSource.getRepository(mail_request_entity_1.MailRequest).findOneBy({
                requestId, createdBy: req.user.id,
            });
            if (!record) {
                res.status(404).json({ message: "Mail request not found" });
                return;
            }
            res.json(record);
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
