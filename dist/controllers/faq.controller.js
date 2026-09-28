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
exports.FaqController = void 0;
const data_source_1 = require("../data-source");
const faq_entity_1 = require("../entities/faq.entity");
const faq_dto_1 = require("../dto/faq.dto");
const class_validator_1 = require("class-validator");
const faqRepository = data_source_1.AppDataSource.getRepository(faq_entity_1.FAQ);
exports.FaqController = {
    createFaq: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const faqData = new faq_dto_1.CreateFaqDto();
            Object.assign(faqData, req.body);
            const errors = yield (0, class_validator_1.validate)(faqData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const faq = faqRepository.create({
                title: faqData.title.trim(),
                description: faqData.description,
                sortOrder: faqData.sortOrder,
                isActive: (_a = faqData.isActive) !== null && _a !== void 0 ? _a : true,
            });
            yield faqRepository.save(faq);
            res.status(201).json(faq);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getFaqs: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { search, startDate, endDate, page = "1", limit = "10", } = req.query;
            const currentPage = Math.max(parseInt(page, 10) || 1, 1);
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (currentPage - 1) * take;
            const query = faqRepository.createQueryBuilder("faq");
            if (search && String(search).trim()) {
                query.andWhere("faq.title ILIKE :search", {
                    search: `%${String(search).trim()}%`,
                });
            }
            if (startDate) {
                query.andWhere("faq.createdAt >= :startDate", {
                    startDate: `${startDate} 00:00:00`,
                });
            }
            if (endDate) {
                query.andWhere("faq.createdAt <= :endDate", {
                    endDate: `${endDate} 23:59:59`,
                });
            }
            query.orderBy("faq.sortOrder", "ASC").addOrderBy("faq.createdAt", "DESC");
            const [faqs, total] = yield query.skip(skip).take(take).getManyAndCount();
            res.status(200).json({
                data: faqs,
                meta: {
                    total,
                    page: currentPage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    getFaqById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const faq = yield faqRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!faq) {
                res.status(404).json({
                    message: "FAQ not found",
                });
                return;
            }
            res.status(200).json(faq);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    updateFaq: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const faq = yield faqRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!faq) {
                res.status(404).json({
                    message: "FAQ not found",
                });
                return;
            }
            const updateData = new faq_dto_1.UpdateFaqDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            if (updateData.title !== undefined) {
                faq.title = updateData.title.trim();
            }
            if (updateData.description !== undefined) {
                faq.description = updateData.description;
            }
            if (updateData.sortOrder !== undefined) {
                faq.sortOrder = updateData.sortOrder;
            }
            if (updateData.isActive !== undefined) {
                faq.isActive = updateData.isActive;
            }
            yield faqRepository.save(faq);
            res.status(200).json(faq);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
    deleteFaq: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const faq = yield faqRepository.findOne({
                where: {
                    id: req.params.id,
                },
            });
            if (!faq) {
                res.status(404).json({
                    message: "FAQ not found",
                });
                return;
            }
            yield faqRepository.remove(faq);
            res.status(204).send();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Internal server error",
            });
        }
    }),
};
