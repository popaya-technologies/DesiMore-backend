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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
exports.validateMailInput = validateMailInput;
const crypto_1 = require("crypto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const data_source_1 = require("../data-source");
const mail_dto_1 = require("../dto/mail.dto");
const mail_request_entity_1 = require("../entities/mail-request.entity");
const newsletter_subscriber_entity_1 = require("../entities/newsletter-subscriber.entity");
const email_1 = require("../utils/email");
const api_error_1 = require("../utils/api-error");
function validateMailInput(input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input))
            throw new api_error_1.ApiError(400, "Mail must be an object");
        const dto = (0, class_transformer_1.plainToInstance)(mail_dto_1.SendMailDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid mail data", errors);
        dto.subject = dto.subject.trim();
        dto.message = (0, sanitize_html_1.default)(dto.message, {
            allowedTags: [...sanitize_html_1.default.defaults.allowedTags, "img"],
            allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "width", "height"] },
            allowedSchemes: ["https", "http", "mailto"], allowProtocolRelative: false,
        });
        const text = (0, sanitize_html_1.default)(dto.message, { allowedTags: [], allowedAttributes: {} })
            .replace(/&nbsp;|&#160;|&#x[aA]0;/g, " ").trim();
        if (!text)
            throw new api_error_1.ApiError(400, "Message must contain text");
        return dto;
    });
}
class MailService {
    // Tests inject or mock delivery: never contact a live provider.
    constructor(db = data_source_1.AppDataSource, deliver = email_1.sendEmail) {
        this.db = db;
        this.deliver = deliver;
    }
    send(input, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateMailInput(input);
            const repository = this.db.getRepository(mail_request_entity_1.MailRequest);
            const payloadHash = (0, crypto_1.createHash)("sha256")
                .update(JSON.stringify([dto.from, dto.to, dto.subject, dto.message])).digest("hex");
            const existing = yield repository.findOneBy({ requestId: dto.requestId });
            if (existing) {
                if (existing.createdBy !== userId || existing.payloadHash !== payloadHash)
                    throw new api_error_1.ApiError(409, "requestId was already used for another mail request");
                return existing;
            }
            const subscribers = yield this.db.getRepository(newsletter_subscriber_entity_1.NewsletterSubscriber).find({
                where: { isActive: true }, order: { id: "ASC" }, take: 501,
            });
            if (subscribers.length > 500)
                throw new api_error_1.ApiError(400, "This endpoint supports at most 500 active subscribers per send");
            const recipients = [...new Set(subscribers.map(s => s.email.trim().toLowerCase()))];
            if (!recipients.length)
                throw new api_error_1.ApiError(400, "No active newsletter subscribers");
            if (recipients.some(email => !(0, class_validator_1.isEmail)(email)))
                throw new api_error_1.ApiError(400, "Subscriber data contains an invalid email address");
            let record = repository.create({
                requestId: dto.requestId, createdBy: userId, payloadHash, subject: dto.subject,
                status: "processing", total: recipients.length, accepted: 0, uncertain: 0,
            });
            try {
                record = yield repository.save(record);
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "This mail request is already being processed; check its status");
                throw error;
            }
            for (const recipient of recipients) {
                const active = yield this.db.getRepository(newsletter_subscriber_entity_1.NewsletterSubscriber).findOneBy({
                    email: recipient, isActive: true,
                });
                if (!active) {
                    record.total--;
                    yield repository.save(record);
                    continue;
                }
                try {
                    yield this.deliver({ to: recipient, subject: dto.subject, html: dto.message });
                    record.accepted++;
                }
                catch (_a) {
                    // The provider may have accepted the email before the connection failed.
                    record.uncertain++;
                }
                yield repository.save(record);
            }
            record.status = record.uncertain ? "needs_review" : "completed";
            return repository.save(record);
        });
    }
}
exports.MailService = MailService;
