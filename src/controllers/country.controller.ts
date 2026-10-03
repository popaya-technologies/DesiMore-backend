import { Request, Response } from "express";

import { AppDataSource } from "../data-source";
import {
  CreateCountryDto,
  UpdateCountryDto,
} from "../dto/country.dto";
import { Country } from "../entities/country.entity";

export class CountryController {
  static async createCountry(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Country);

      const dto = req.body as CreateCountryDto;

      const name = dto.name.trim();

      const existing = await repository.findOne({
        where: { name },
      });

      if (existing) {
        res.status(409).json({
          message: "Country already exists",
        });
        return;
      }

      const country = repository.create({
        name,
        isoCode2: dto.isoCode2?.trim() || null,
        isoCode3: dto.isoCode3?.trim() || null,
        addressFormat:
          dto.addressFormat?.trim() || null,
        postcodeRequired: dto.postcodeRequired,
        status: dto.status,
      });

      const savedCountry =
        await repository.save(country);

      res.status(201).json(savedCountry);
    } catch (error) {
      console.error("Create country error:", error);

      res.status(500).json({
        message: "Failed to create country",
      });
    }
  }

  static async getCountries(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Country);

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
        .createQueryBuilder("country")
        .orderBy("country.createdAt", "ASC");

      if (search) {
        queryBuilder.andWhere(
          `(
            country.name ILIKE :search
            OR country.isoCode2 ILIKE :search
            OR country.isoCode3 ILIKE :search
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
      console.error(
        "Get countries error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get countries",
      });
    }
  }

  static async getCountryById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Country);

      const country = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!country) {
        res.status(404).json({
          message: "Country not found",
        });
        return;
      }

      res.json(country);
    } catch (error) {
      console.error(
        "Get country by id error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get country",
      });
    }
  }

  static async updateCountry(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Country);

      const country = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!country) {
        res.status(404).json({
          message: "Country not found",
        });
        return;
      }

      const dto = req.body as UpdateCountryDto;

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        const existing =
          await repository.findOne({
            where: { name },
          });

        if (
          existing &&
          existing.id !== country.id
        ) {
          res.status(409).json({
            message: "Country already exists",
          });
          return;
        }

        country.name = name;
      }

      if (dto.isoCode2 !== undefined) {
        country.isoCode2 =
          dto.isoCode2.trim() || null;
      }

      if (dto.isoCode3 !== undefined) {
        country.isoCode3 =
          dto.isoCode3.trim() || null;
      }

      if (dto.addressFormat !== undefined) {
        country.addressFormat =
          dto.addressFormat.trim() || null;
      }

      if (dto.postcodeRequired !== undefined) {
        country.postcodeRequired =
          dto.postcodeRequired;
      }

      if (dto.status !== undefined) {
        country.status = dto.status;
      }

      const updatedCountry =
        await repository.save(country);

      res.json(updatedCountry);
    } catch (error) {
      console.error(
        "Update country error:",
        error,
      );

      res.status(500).json({
        message: "Failed to update country",
      });
    }
  }

  static async deleteCountry(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Country);

      const country = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!country) {
        res.status(404).json({
          message: "Country not found",
        });
        return;
      }

      await repository.remove(country);

      res.json({
        message: "Country deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete country error:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete country",
      });
    }
  }
}