import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Carrier } from "../entities/carrier.entity";
import {
  CreateCarrierDto,
  UpdateCarrierDto,
} from "../dto/carrier.dto";
import { validate } from "class-validator";

const carrierRepository = AppDataSource.getRepository(Carrier);

export const CarrierController = {
  createCarrier: async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierData = new CreateCarrierDto();

      Object.assign(carrierData, req.body);

      const errors = await validate(carrierData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const carrier = carrierRepository.create({
        name: carrierData.name.trim(),
        trackingNoLength: carrierData.trackingNoLength ?? 0,
        match: carrierData.match?.trim() || "Exact",
        carrierUrl: carrierData.carrierUrl?.trim() || null,
        sortOrder: carrierData.sortOrder ?? 0,
        isActive: carrierData.isActive ?? true,
      });

      await carrierRepository.save(carrier);

      res.status(201).json(carrier);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getCarriers: async (req: Request, res: Response): Promise<void> => {
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

      const query = carrierRepository.createQueryBuilder("carrier");

      if (search && String(search).trim()) {
        query.andWhere("carrier.name ILIKE :search", {
          search: `%${String(search).trim()}%`,
        });
      }

      query
        .orderBy("carrier.sortOrder", "ASC")
        .addOrderBy("carrier.createdAt", "DESC");

      const [carriers, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: carriers,
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

  getCarrierById: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const carrier = await carrierRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!carrier) {
        res.status(404).json({
          message: "Carrier not found",
        });
        return;
      }

      res.status(200).json(carrier);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateCarrier: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const carrier = await carrierRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!carrier) {
        res.status(404).json({
          message: "Carrier not found",
        });
        return;
      }

      const updateData = new UpdateCarrierDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.name !== undefined) {
        carrier.name = updateData.name.trim();
      }

      if (updateData.trackingNoLength !== undefined) {
        carrier.trackingNoLength = updateData.trackingNoLength;
      }

      if (updateData.match !== undefined) {
        carrier.match = updateData.match.trim();
      }

      if (updateData.carrierUrl !== undefined) {
        carrier.carrierUrl =
          updateData.carrierUrl.trim() || null;
      }

      if (updateData.sortOrder !== undefined) {
        carrier.sortOrder = updateData.sortOrder;
      }

      if (updateData.isActive !== undefined) {
        carrier.isActive = updateData.isActive;
      }

      await carrierRepository.save(carrier);

      res.status(200).json(carrier);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteCarrier: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const carrier = await carrierRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!carrier) {
        res.status(404).json({
          message: "Carrier not found",
        });
        return;
      }

      await carrierRepository.remove(carrier);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};