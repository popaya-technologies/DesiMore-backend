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
exports.MessageController = void 0;
const data_source_1 = require("../data-source");
const message_entity_1 = require("../entities/message.entity");
const message_dto_1 = require("../dto/message.dto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const messageRepository = data_source_1.AppDataSource.getRepository(message_entity_1.Message);
exports.MessageController = {
    upsertMessage: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = (0, class_transformer_1.plainToInstance)(message_dto_1.UpsertMessageDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const existing = yield messageRepository.findOne({
                where: { key: dto.key },
            });
            if (existing) {
                existing.message = dto.message;
                yield messageRepository.save(existing);
                res.status(200).json(existing);
                return;
            }
            const created = messageRepository.create({
                key: dto.key,
                message: dto.message,
            });
            yield messageRepository.save(created);
            res.status(201).json(created);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getMessageByKey: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { key } = req.params;
            const existing = yield messageRepository.findOne({
                where: { key },
            });
            if (!existing) {
                res.status(404).json({ message: "Message not found" });
                return;
            }
            res.status(200).json(existing);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Get all messages (public)
    getAllMessages: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const messages = yield messageRepository.find({
                order: { createdAt: "DESC" },
            });
            res.status(200).json(messages);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
