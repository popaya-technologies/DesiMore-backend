import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { GiftVoucher } from "../entities/gift_voucher.entity";
import {
  CreateGiftVoucherDto,
  UpdateGiftVoucherDto,
} from "../dto/gift_voucher.dto";
import { validate } from "class-validator";

const giftVoucherRepository = AppDataSource.getRepository(GiftVoucher);

export const GiftVoucherController = {
  // Create Gift Voucher
  createGiftVoucher: async (req: Request, res: Response): Promise<void> => {
    try {
      const giftVoucherData = new CreateGiftVoucherDto();

      Object.assign(giftVoucherData, req.body);

      const errors = await validate(giftVoucherData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const giftVoucher = giftVoucherRepository.create({
        code: giftVoucherData.code.trim(),
        fromName: giftVoucherData.fromName.trim(),
        fromEmail: giftVoucherData.fromEmail.trim(),
        toName: giftVoucherData.toName.trim(),
        toEmail: giftVoucherData.toEmail.trim(),
        theme: giftVoucherData.theme?.trim() || null,
        message: giftVoucherData.message?.trim() || null,
        amount: giftVoucherData.amount ?? 0,
        isActive: giftVoucherData.isActive ?? true,
      });

      await giftVoucherRepository.save(giftVoucher);

      res.status(201).json(giftVoucher);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get Gift Vouchers
  getGiftVouchers: async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, page = "1", limit = "10" } = req.query;

      const currentPage = Math.max(parseInt(page as string, 10) || 1, 1);

      const take = Math.max(parseInt(limit as string, 10) || 10, 1);

      const skip = (currentPage - 1) * take;

      const query = giftVoucherRepository.createQueryBuilder("giftVoucher");

      if (search && String(search).trim()) {
        const searchValue = `%${String(search).trim()}%`;

        query.andWhere(
          `(
            giftVoucher.code ILIKE :search
            OR giftVoucher.fromName ILIKE :search
            OR giftVoucher.toName ILIKE :search
            OR giftVoucher.fromEmail ILIKE :search
            OR giftVoucher.toEmail ILIKE :search
            OR giftVoucher.theme ILIKE :search
          )`,
          {
            search: searchValue,
          },
        );
      }

      query.orderBy("giftVoucher.createdAt", "DESC");

      const [giftVouchers, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: giftVouchers,
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

  // Get Gift Voucher By ID
  getGiftVoucherById: async (req: Request, res: Response): Promise<void> => {
    try {
      const giftVoucher = await giftVoucherRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!giftVoucher) {
        res.status(404).json({
          message: "Gift voucher not found",
        });

        return;
      }

      res.status(200).json(giftVoucher);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Update Gift Voucher
  updateGiftVoucher: async (req: Request, res: Response): Promise<void> => {
    try {
      const giftVoucher = await giftVoucherRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!giftVoucher) {
        res.status(404).json({
          message: "Gift voucher not found",
        });

        return;
      }

      const updateData = new UpdateGiftVoucherDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.code !== undefined) {
        giftVoucher.code = updateData.code.trim();
      }

      if (updateData.fromName !== undefined) {
        giftVoucher.fromName = updateData.fromName.trim();
      }

      if (updateData.fromEmail !== undefined) {
        giftVoucher.fromEmail = updateData.fromEmail.trim();
      }

      if (updateData.toName !== undefined) {
        giftVoucher.toName = updateData.toName.trim();
      }

      if (updateData.toEmail !== undefined) {
        giftVoucher.toEmail = updateData.toEmail.trim();
      }

      if (updateData.theme !== undefined) {
        giftVoucher.theme = updateData.theme.trim() || null;
      }

      if (updateData.message !== undefined) {
        giftVoucher.message = updateData.message.trim() || null;
      }

      if (updateData.amount !== undefined) {
        giftVoucher.amount = updateData.amount;
      }

      if (updateData.isActive !== undefined) {
        giftVoucher.isActive = updateData.isActive;
      }

      await giftVoucherRepository.save(giftVoucher);

      res.status(200).json(giftVoucher);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Delete Gift Voucher
  deleteGiftVoucher: async (req: Request, res: Response): Promise<void> => {
    try {
      const giftVoucher = await giftVoucherRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!giftVoucher) {
        res.status(404).json({
          message: "Gift voucher not found",
        });

        return;
      }

      await giftVoucherRepository.remove(giftVoucher);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};
