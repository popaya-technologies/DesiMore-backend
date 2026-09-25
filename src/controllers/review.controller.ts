import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Review } from "../entities/review.entity";
import {
  CreateReviewDto,
  UpdateReviewDto,
} from "../dto/review.dto";

const reviewRepository = AppDataSource.getRepository(Review);

export class ReviewController {
  static async createReview(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const dto = new CreateReviewDto();

      Object.assign(dto, req.body);

      const errors = await validate(dto);

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
        isActive: dto.isActive ?? true,
      });

      const savedReview = await reviewRepository.save(review);

      res.status(201).json(savedReview);
    } catch (error) {
      console.error("Create review error:", error);

      res.status(500).json({
        message: "Failed to create review",
      });
    }
  }

  static async getReviews(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.max(
        Number(req.query.limit) || 10,
        1,
      );

      const search =
        typeof req.query.search === "string"
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
        queryBuilder.where(
          "review.author ILIKE :search OR review.text ILIKE :search",
          {
            search: `%${search}%`,
          },
        );
      }

      const [reviews, total] =
        await queryBuilder.getManyAndCount();

      res.json({
        data: reviews,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get reviews error:", error);

      res.status(500).json({
        message: "Failed to get reviews",
      });
    }
  }

  static async getReviewById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const review = await reviewRepository.findOne({
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
    } catch (error) {
      console.error("Get review error:", error);

      res.status(500).json({
        message: "Failed to get review",
      });
    }
  }

  static async updateReview(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const review = await reviewRepository.findOne({
        where: { id },
      });

      if (!review) {
        res.status(404).json({
          message: "Review not found",
        });
        return;
      }

      const dto = new UpdateReviewDto();

      Object.assign(dto, req.body);

      const errors = await validate(dto);

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

      const updatedReview =
        await reviewRepository.save(review);

      res.json(updatedReview);
    } catch (error) {
      console.error("Update review error:", error);

      res.status(500).json({
        message: "Failed to update review",
      });
    }
  }

  static async deleteReview(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const review = await reviewRepository.findOne({
        where: { id },
      });

      if (!review) {
        res.status(404).json({
          message: "Review not found",
        });
        return;
      }

      await reviewRepository.remove(review);

      res.json({
        message: "Review deleted successfully",
      });
    } catch (error) {
      console.error("Delete review error:", error);

      res.status(500).json({
        message: "Failed to delete review",
      });
    }
  }
}