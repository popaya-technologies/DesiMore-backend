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
exports.ReviewController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const review_entity_1 = require("../entities/review.entity");
const review_dto_1 = require("../dto/review.dto");
const reviewRepository = data_source_1.AppDataSource.getRepository(review_entity_1.Review);
class ReviewController {
    static createReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const dto = new review_dto_1.CreateReviewDto();
                Object.assign(dto, req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    res.status(400).json({ errors });
                    return;
                }
                const review = reviewRepository.create({
                    author: dto.author.trim(),
                    productId: dto.productId,
                    text: dto.text.trim(),
                    rating: dto.rating,
                    dateAdded: dto.dateAdded,
                    isActive: (_a = dto.isActive) !== null && _a !== void 0 ? _a : true,
                });
                const savedReview = yield reviewRepository.save(review);
                res.status(201).json(savedReview);
            }
            catch (error) {
                console.error("Create review error:", error);
                res.status(500).json({
                    message: "Failed to create review",
                });
            }
        });
    }
    static getReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const skip = (page - 1) * limit;
                const queryBuilder = reviewRepository
                    .createQueryBuilder("review")
                    .leftJoinAndSelect("review.product", "product")
                    .orderBy("review.dateAdded", "DESC")
                    .addOrderBy("review.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where("review.author ILIKE :search OR review.text ILIKE :search", {
                        search: `%${search}%`,
                    });
                }
                const [reviews, total] = yield queryBuilder.getManyAndCount();
                res.json({
                    data: reviews,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get reviews error:", error);
                res.status(500).json({
                    message: "Failed to get reviews",
                });
            }
        });
    }
    static getReviewById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const review = yield reviewRepository.findOne({
                    where: { id },
                    relations: {
                        product: true,
                    },
                });
                if (!review) {
                    res.status(404).json({
                        message: "Review not found",
                    });
                    return;
                }
                res.json(review);
            }
            catch (error) {
                console.error("Get review error:", error);
                res.status(500).json({
                    message: "Failed to get review",
                });
            }
        });
    }
    static updateReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const review = yield reviewRepository.findOne({
                    where: { id },
                });
                if (!review) {
                    res.status(404).json({
                        message: "Review not found",
                    });
                    return;
                }
                const dto = new review_dto_1.UpdateReviewDto();
                Object.assign(dto, req.body);
                const errors = yield (0, class_validator_1.validate)(dto);
                if (errors.length > 0) {
                    res.status(400).json({ errors });
                    return;
                }
                if (dto.author !== undefined) {
                    review.author = dto.author.trim();
                }
                if (dto.productId !== undefined) {
                    review.productId = dto.productId;
                }
                if (dto.text !== undefined) {
                    review.text = dto.text.trim();
                }
                if (dto.rating !== undefined) {
                    review.rating = dto.rating;
                }
                if (dto.dateAdded !== undefined) {
                    review.dateAdded = dto.dateAdded;
                }
                if (dto.isActive !== undefined) {
                    review.isActive = dto.isActive;
                }
                const updatedReview = yield reviewRepository.save(review);
                res.json(updatedReview);
            }
            catch (error) {
                console.error("Update review error:", error);
                res.status(500).json({
                    message: "Failed to update review",
                });
            }
        });
    }
    static deleteReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const review = yield reviewRepository.findOne({
                    where: { id },
                });
                if (!review) {
                    res.status(404).json({
                        message: "Review not found",
                    });
                    return;
                }
                yield reviewRepository.remove(review);
                res.json({
                    message: "Review deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete review error:", error);
                res.status(500).json({
                    message: "Failed to delete review",
                });
            }
        });
    }
}
exports.ReviewController = ReviewController;
