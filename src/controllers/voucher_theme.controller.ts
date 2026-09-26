import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { VoucherTheme } from "../entities/voucher_theme.entity";
import {
  CreateVoucherThemeDto,
  UpdateVoucherThemeDto,
} from "../dto/voucher_theme.dto";
import { validate } from "class-validator";

const voucherThemeRepository = AppDataSource.getRepository(VoucherTheme);

export const VoucherThemeController = {
  createVoucherTheme: async (req: Request, res: Response): Promise<void> => {
    try {
      const voucherThemeData = new CreateVoucherThemeDto();

      Object.assign(voucherThemeData, req.body);

      const errors = await validate(voucherThemeData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const voucherTheme = voucherThemeRepository.create({
        name: voucherThemeData.name.trim(),
        image: voucherThemeData.image.trim(),
      });

      await voucherThemeRepository.save(voucherTheme);

      res.status(201).json(voucherTheme);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getVoucherThemes: async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, page = "1", limit = "10" } = req.query;

      const currentPage = Math.max(parseInt(page as string, 10) || 1, 1);

      const take = Math.max(parseInt(limit as string, 10) || 10, 1);

      const skip = (currentPage - 1) * take;

      const query = voucherThemeRepository.createQueryBuilder("voucherTheme");

      if (search && String(search).trim()) {
        query.andWhere("voucherTheme.name ILIKE :search", {
          search: `%${String(search).trim()}%`,
        });
      }

      query.orderBy("voucherTheme.createdAt", "DESC");

      const [voucherThemes, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: voucherThemes,
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

  getVoucherThemeById: async (req: Request, res: Response): Promise<void> => {
    try {
      const voucherTheme = await voucherThemeRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!voucherTheme) {
        res.status(404).json({
          message: "Voucher theme not found",
        });
        return;
      }

      res.status(200).json(voucherTheme);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateVoucherTheme: async (req: Request, res: Response): Promise<void> => {
    try {
      const voucherTheme = await voucherThemeRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!voucherTheme) {
        res.status(404).json({
          message: "Voucher theme not found",
        });
        return;
      }

      const updateData = new UpdateVoucherThemeDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.name !== undefined) {
        voucherTheme.name = updateData.name.trim();
      }

      if (updateData.image !== undefined) {
        voucherTheme.image = updateData.image.trim();
      }

      await voucherThemeRepository.save(voucherTheme);

      res.status(200).json(voucherTheme);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteVoucherTheme: async (req: Request, res: Response): Promise<void> => {
    try {
      const voucherTheme = await voucherThemeRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!voucherTheme) {
        res.status(404).json({
          message: "Voucher theme not found",
        });
        return;
      }

      await voucherThemeRepository.remove(voucherTheme);

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};
