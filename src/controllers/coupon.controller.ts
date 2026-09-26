import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Coupon } from "../entities/coupon.entity";
import {
  CreateCouponDto,
  UpdateCouponDto,
} from "../dto/coupon.dto";
import { validate } from "class-validator";

const couponRepository = AppDataSource.getRepository(Coupon);

export const CouponController = {
  createCoupon: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const couponData = new CreateCouponDto();

      Object.assign(couponData, req.body);

      const errors = await validate(couponData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const coupon = couponRepository.create({
        name: couponData.name.trim(),
        code: couponData.code.trim(),
        type: couponData.type?.trim() || "Percentage",
        discount: couponData.discount ?? 0,
        totalAmount: couponData.totalAmount ?? 0,
        customerLogin: couponData.customerLogin ?? false,
        freeShipping: couponData.freeShipping ?? false,
        dateStart: couponData.dateStart,
        dateEnd: couponData.dateEnd,
        usesPerCoupon: couponData.usesPerCoupon ?? 1,
        usesPerCustomer: couponData.usesPerCustomer ?? 1,
        isActive: couponData.isActive ?? true,
      });

      await couponRepository.save(coupon);

      res.status(201).json(coupon);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getCoupons: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        search,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(
        parseInt(page as string, 10) || 1,
        1,
      );

      const take = Math.max(
        parseInt(limit as string, 10) || 10,
        1,
      );

      const skip = (currentPage - 1) * take;

      const query =
        couponRepository.createQueryBuilder("coupon");

      if (search && String(search).trim()) {
        const searchValue = `%${String(search).trim()}%`;

        query.andWhere(
          `(
            coupon.name ILIKE :search
            OR coupon.code ILIKE :search
          )`,
          {
            search: searchValue,
          },
        );
      }

      query
        .orderBy("coupon.createdAt", "DESC");

      const [coupons, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: coupons,
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getCouponById: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const coupon = await couponRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!coupon) {
        res.status(404).json({
          message: "Coupon not found",
        });
        return;
      }

      res.status(200).json(coupon);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateCoupon: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const coupon = await couponRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!coupon) {
        res.status(404).json({
          message: "Coupon not found",
        });
        return;
      }

      const updateData = new UpdateCouponDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.name !== undefined) {
        coupon.name = updateData.name.trim();
      }

      if (updateData.code !== undefined) {
        coupon.code = updateData.code.trim();
      }

      if (updateData.type !== undefined) {
        coupon.type = updateData.type.trim();
      }

      if (updateData.discount !== undefined) {
        coupon.discount = updateData.discount;
      }

      if (updateData.totalAmount !== undefined) {
        coupon.totalAmount = updateData.totalAmount;
      }

      if (updateData.customerLogin !== undefined) {
        coupon.customerLogin = updateData.customerLogin;
      }

      if (updateData.freeShipping !== undefined) {
        coupon.freeShipping = updateData.freeShipping;
      }

      if (updateData.dateStart !== undefined) {
        coupon.dateStart = updateData.dateStart;
      }

      if (updateData.dateEnd !== undefined) {
        coupon.dateEnd = updateData.dateEnd;
      }

      if (updateData.usesPerCoupon !== undefined) {
        coupon.usesPerCoupon =
          updateData.usesPerCoupon;
      }

      if (updateData.usesPerCustomer !== undefined) {
        coupon.usesPerCustomer =
          updateData.usesPerCustomer;
      }

      if (updateData.isActive !== undefined) {
        coupon.isActive = updateData.isActive;
      }

      await couponRepository.save(coupon);

      res.status(200).json(coupon);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteCoupon: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const coupon = await couponRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!coupon) {
        res.status(404).json({
          message: "Coupon not found",
        });
        return;
      }

      await couponRepository.remove(coupon);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};