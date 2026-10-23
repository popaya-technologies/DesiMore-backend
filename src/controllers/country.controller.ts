import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { AppDataSource } from "../data-source";
import {
  CreateCountryDto,
  UpdateCountryDto,
} from "../dto/country.dto";
import { Country } from "../entities/country.entity";
import { GeoZoneLocation } from "../entities/geo_zone_location.entity";
import { Zone } from "../entities/zone.entity";

const validationErrors = async (dto: object) => {
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return errors.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
};

const normalizeIso = (value?: string) =>
  value?.trim().toUpperCase() || null;

// Returns a message when name or an ISO code is already used by another country.
const findConflict = async (
  values: {
    name?: string;
    isoCode2?: string | null;
    isoCode3?: string | null;
  },
  excludeId?: string,
): Promise<string | null> => {
  const repository = AppDataSource.getRepository(Country);
  const checks: Array<[string, string, string | null | undefined]> = [
    ["Country already exists", "LOWER(country.name) = LOWER(:value)", values.name],
    ["ISO Code (2) is already used by another country", "UPPER(country.isoCode2) = :value", values.isoCode2],
    ["ISO Code (3) is already used by another country", "UPPER(country.isoCode3) = :value", values.isoCode3],
  ];

  for (const [message, condition, value] of checks) {
    if (!value) continue;

    const query = repository
      .createQueryBuilder("country")
      .select(["country.id"])
      .where(condition, { value });

    if (excludeId) {
      query.andWhere("country.id != :excludeId", { excludeId });
    }

    if (await query.getOne()) {
      return message;
    }
  }

  return null;
};

export class CountryController {
  static async createCountry(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(Country);

      const dto = plainToInstance(CreateCountryDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const name = dto.name.trim();
      const isoCode2 = normalizeIso(dto.isoCode2);
      const isoCode3 = normalizeIso(dto.isoCode3);

      const conflict = await findConflict({ name, isoCode2, isoCode3 });

      if (conflict) {
        res.status(409).json({
          message: conflict,
        });
        return;
      }

      const country = repository.create({
        name,
        isoCode2,
        isoCode3,
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

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim().toLowerCase()
          : "";

      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 10, 1),
        100,
      );

      const queryBuilder = repository
        .createQueryBuilder("country")
        .orderBy("country.name", "ASC");

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

      if (status === "enabled" || status === "true") {
        queryBuilder.andWhere("country.status = :status", { status: true });
      } else if (status === "disabled" || status === "false") {
        queryBuilder.andWhere("country.status = :status", { status: false });
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

  // Storefront: enabled countries only, for address and checkout dropdowns.
  static async getEnabledCountries(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const countries = await AppDataSource.getRepository(Country).find({
        where: { status: true },
        select: [
          "id",
          "name",
          "isoCode2",
          "isoCode3",
          "addressFormat",
          "postcodeRequired",
        ],
        order: { name: "ASC" },
      });

      res.json({ data: countries });
    } catch (error) {
      console.error(
        "Get enabled countries error:",
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

      const dto = plainToInstance(UpdateCountryDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const name = dto.name?.trim();
      const isoCode2 =
        dto.isoCode2 !== undefined ? normalizeIso(dto.isoCode2) : undefined;
      const isoCode3 =
        dto.isoCode3 !== undefined ? normalizeIso(dto.isoCode3) : undefined;

      const conflict = await findConflict(
        { name, isoCode2, isoCode3 },
        country.id,
      );

      if (conflict) {
        res.status(409).json({
          message: conflict,
        });
        return;
      }

      if (name !== undefined) {
        country.name = name;
      }

      if (isoCode2 !== undefined) {
        country.isoCode2 = isoCode2;
      }

      if (isoCode3 !== undefined) {
        country.isoCode3 = isoCode3;
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

      const [zoneCount, geoZoneCount] = await Promise.all([
        AppDataSource.getRepository(Zone).count({
          where: { countryId: country.id },
        }),
        AppDataSource.getRepository(GeoZoneLocation).count({
          where: { countryId: country.id },
        }),
      ]);

      if (zoneCount > 0 || geoZoneCount > 0) {
        const usage = [
          zoneCount > 0 ? `${zoneCount} zone${zoneCount === 1 ? "" : "s"}` : "",
          geoZoneCount > 0
            ? `${geoZoneCount} geo zone location${geoZoneCount === 1 ? "" : "s"}`
            : "",
        ]
          .filter(Boolean)
          .join(" and ");

        res.status(409).json({
          message: `${country.name} is used by ${usage}. Delete or move them first.`,
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
