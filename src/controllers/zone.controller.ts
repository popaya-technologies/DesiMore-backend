import { Request, Response } from "express";

import { AppDataSource } from "../data-source";
import {
  CreateZoneDto,
  UpdateZoneDto,
} from "../dto/zone.dto";
import { Country } from "../entities/country.entity";
import { Zone } from "../entities/zone.entity";

export class ZoneController {
  static async createZone(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const zoneRepository =
        AppDataSource.getRepository(Zone);

      const countryRepository =
        AppDataSource.getRepository(Country);

      const dto = req.body as CreateZoneDto;

      const country = await countryRepository.findOne({
        where: {
          id: dto.countryId,
        },
      });

      if (!country) {
        res.status(404).json({
          message: "Country not found",
        });
        return;
      }

      const name = dto.name.trim();

      const existing = await zoneRepository.findOne({
        where: {
          countryId: dto.countryId,
          name,
        },
      });

      if (existing) {
        res.status(409).json({
          message: "Zone already exists for this country",
        });
        return;
      }

      const zone = zoneRepository.create({
        countryId: dto.countryId,
        country,
        name,
        code: dto.code?.trim() || null,
        status: dto.status,
      });

      const savedZone = await zoneRepository.save(zone);

      const result = await zoneRepository.findOne({
        where: {
          id: savedZone.id,
        },
        relations: {
          country: true,
        },
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Create zone error:", error);

      res.status(500).json({
        message: "Failed to create zone",
      });
    }
  }

  static async getZones(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Zone);

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.max(
        Number(req.query.limit) || 10,
        1,
      );

      const queryBuilder = repository
        .createQueryBuilder("zone")
        .leftJoinAndSelect("zone.country", "country")
        .orderBy("zone.createdAt", "ASC");

      if (search) {
        queryBuilder.andWhere(
          `(
            zone.name ILIKE :search
            OR zone.code ILIKE :search
            OR country.name ILIKE :search
          )`,
          {
            search: `%${search}%`,
          },
        );
      }

      const [data, total] =
        await queryBuilder
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount();

      res.json({
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(
            total / limit,
          ),
        },
      });
    } catch (error) {
      console.error("Get zones error:", error);

      res.status(500).json({
        message: "Failed to get zones",
      });
    }
  }

  static async getZoneById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Zone);

      const zone = await repository.findOne({
        where: {
          id: req.params.id,
        },
        relations: {
          country: true,
        },
      });

      if (!zone) {
        res.status(404).json({
          message: "Zone not found",
        });
        return;
      }

      res.json(zone);
    } catch (error) {
      console.error(
        "Get zone by id error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get zone",
      });
    }
  }

  static async updateZone(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Zone);

      const countryRepository =
        AppDataSource.getRepository(Country);

      const zone = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!zone) {
        res.status(404).json({
          message: "Zone not found",
        });
        return;
      }

      const dto = req.body as UpdateZoneDto;

      if (dto.countryId !== undefined) {
        const country =
          await countryRepository.findOne({
            where: {
              id: dto.countryId,
            },
          });

        if (!country) {
          res.status(404).json({
            message: "Country not found",
          });
          return;
        }

        zone.countryId = dto.countryId;
        zone.country = country;
      }

      if (dto.name !== undefined) {
        zone.name = dto.name.trim();
      }

      if (dto.code !== undefined) {
        zone.code = dto.code.trim() || null;
      }

      if (dto.status !== undefined) {
        zone.status = dto.status;
      }

      const existing = await repository.findOne({
        where: {
          countryId: zone.countryId,
          name: zone.name,
        },
      });

      if (
        existing &&
        existing.id !== zone.id
      ) {
        res.status(409).json({
          message: "Zone already exists for this country",
        });
        return;
      }

      await repository.save(zone);

      const updatedZone =
        await repository.findOne({
          where: {
            id: zone.id,
          },
          relations: {
            country: true,
          },
        });

      res.json(updatedZone);
    } catch (error) {
      console.error(
        "Update zone error:",
        error,
      );

      res.status(500).json({
        message: "Failed to update zone",
      });
    }
  }

  static async deleteZone(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Zone);

      const zone = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!zone) {
        res.status(404).json({
          message: "Zone not found",
        });
        return;
      }

      await repository.remove(zone);

      res.json({
        message: "Zone deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete zone error:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete zone",
      });
    }
  }
}