import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { AppDataSource } from "../data-source";
import {
  CreateZoneDto,
  UpdateZoneDto,
} from "../dto/zone.dto";
import { Country } from "../entities/country.entity";
import { GeoZoneLocation } from "../entities/geo_zone_location.entity";
import { Store } from "../entities/store.entity";
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

const normalizeCode = (value?: string) =>
  value?.trim().toUpperCase() || null;

// Returns a message when the name or code is already used by another zone of the same country.
const findConflict = async (
  values: { countryId: string; name: string; code: string | null },
  excludeId?: string,
): Promise<string | null> => {
  const checks: Array<[string, string, string | null]> = [
    ["Zone already exists for this country", "LOWER(zone.name) = LOWER(:value)", values.name],
    ["Zone code is already used by another zone of this country", "UPPER(zone.code) = :value", values.code],
  ];

  for (const [message, condition, value] of checks) {
    if (!value) continue;

    const query = AppDataSource.getRepository(Zone)
      .createQueryBuilder("zone")
      .select(["zone.id"])
      .where("zone.countryId = :countryId", { countryId: values.countryId })
      .andWhere(condition, { value });

    if (excludeId) {
      query.andWhere("zone.id != :excludeId", { excludeId });
    }

    if (await query.getOne()) {
      return message;
    }
  }

  return null;
};

const countGeoZoneUsage = (zoneId: string) =>
  AppDataSource.getRepository(GeoZoneLocation).count({
    where: { zoneId },
  });

// Stores keep country and region/state as free text, so a zone is "used" when the
// store's region matches its name or code and the store's country matches its country.
const countStoreUsage = async (zone: Zone) => {
  const country =
    zone.country ??
    (await AppDataSource.getRepository(Country).findOne({
      where: { id: zone.countryId },
    }));
  if (!country) return 0;

  const lower = (values: Array<string | null>) =>
    values
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase());

  return AppDataSource.getRepository(Store)
    .createQueryBuilder("store")
    .where("LOWER(TRIM(store.regionState)) IN (:...zoneValues)", {
      zoneValues: lower([zone.name, zone.code]),
    })
    .andWhere("LOWER(TRIM(store.country)) IN (:...countryValues)", {
      countryValues: lower([country.name, country.isoCode2, country.isoCode3]),
    })
    .getCount();
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

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

      const dto = plainToInstance(CreateZoneDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

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
      const code = normalizeCode(dto.code);

      const conflict = await findConflict({
        countryId: country.id,
        name,
        code,
      });

      if (conflict) {
        res.status(409).json({
          message: conflict,
        });
        return;
      }

      const zone = zoneRepository.create({
        countryId: country.id,
        country,
        name,
        code,
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

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim().toLowerCase()
          : "";

      // The admin country filter can send several ids ("id1,id2").
      const countryIds =
        typeof req.query.countryId === "string"
          ? req.query.countryId
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          : [];

      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 10, 1),
        100,
      );

      // Column sorting from the admin list; default is country, then zone name
      // (the old site's order).
      const sortColumns: Record<string, string> = {
        country: "country.name",
        name: "zone.name",
        code: "zone.code",
      };
      const sortBy =
        typeof req.query.sortBy === "string" &&
        sortColumns[req.query.sortBy]
          ? sortColumns[req.query.sortBy]
          : sortColumns.country;
      const sortOrder =
        String(req.query.sortOrder).toUpperCase() === "DESC"
          ? "DESC"
          : "ASC";

      const queryBuilder = repository
        .createQueryBuilder("zone")
        .leftJoinAndSelect("zone.country", "country")
        .orderBy(sortBy, sortOrder, "NULLS LAST")
        .addOrderBy("country.name", "ASC")
        .addOrderBy("zone.name", "ASC");

      if (countryIds.length) {
        queryBuilder.andWhere("zone.countryId IN (:...countryIds)", {
          countryIds,
        });
      }

      if (status === "enabled" || status === "true") {
        queryBuilder.andWhere("zone.status = :status", { status: true });
      } else if (status === "disabled" || status === "false") {
        queryBuilder.andWhere("zone.status = :status", { status: false });
      }

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

  // Storefront: enabled zones of one enabled country, looked up by ISO-2 code or id.
  // The main store's Region / State is marked isDefault so checkout can pre-select it.
  static async getEnabledZones(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const countryParam =
        typeof req.query.country === "string"
          ? req.query.country.trim()
          : "";

      if (!countryParam) {
        res.status(400).json({
          message: "country is required",
        });
        return;
      }

      const country = await AppDataSource.getRepository(Country)
        .createQueryBuilder("country")
        .where("country.status = :status", { status: true })
        .andWhere(
          "(UPPER(country.isoCode2) = :code OR CAST(country.id AS TEXT) = :value)",
          { code: countryParam.toUpperCase(), value: countryParam },
        )
        .getOne();

      if (!country) {
        res.json({ data: [] });
        return;
      }

      const [zones, [store]] = await Promise.all([
        AppDataSource.getRepository(Zone).find({
          where: { countryId: country.id, status: true },
          select: ["id", "name", "code", "countryId"],
          order: { name: "ASC" },
        }),
        AppDataSource.getRepository(Store).find({
          select: ["id", "country", "regionState"],
          order: { createdAt: "ASC" },
          take: 1,
        }),
      ]);

      const lower = (value?: string | null) =>
        value?.trim().toLowerCase() || "";
      const storeCountry = lower(store?.country);
      const storeRegion = lower(store?.regionState);
      const isStoreCountry =
        Boolean(storeCountry) &&
        [country.name, country.isoCode2, country.isoCode3]
          .map(lower)
          .includes(storeCountry);

      res.json({
        data: zones.map((zone) => ({
          ...zone,
          isDefault:
            isStoreCountry &&
            Boolean(storeRegion) &&
            [lower(zone.name), lower(zone.code)].includes(storeRegion),
        })),
      });
    } catch (error) {
      console.error(
        "Get enabled zones error:",
        error,
      );

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

      const dto = plainToInstance(UpdateZoneDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      if (
        dto.countryId !== undefined &&
        dto.countryId !== zone.countryId
      ) {
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

        // Geo zone locations store the zone together with its country.
        const geoZoneUsage = await countGeoZoneUsage(zone.id);

        if (geoZoneUsage > 0) {
          res.status(409).json({
            message: `${zone.name} is used by ${plural(geoZoneUsage, "geo zone location")}, so its country cannot be changed. Remove it from those geo zones first.`,
          });
          return;
        }

        zone.countryId = country.id;
        zone.country = country;
      }

      if (dto.name !== undefined) {
        zone.name = dto.name.trim();
      }

      if (dto.code !== undefined) {
        zone.code = normalizeCode(dto.code);
      }

      if (dto.status !== undefined) {
        zone.status = dto.status;
      }

      const conflict = await findConflict(
        {
          countryId: zone.countryId,
          name: zone.name,
          code: zone.code,
        },
        zone.id,
      );

      if (conflict) {
        res.status(409).json({
          message: conflict,
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

      const [geoZoneUsage, storeUsage] = await Promise.all([
        countGeoZoneUsage(zone.id),
        countStoreUsage(zone),
      ]);

      if (geoZoneUsage > 0 || storeUsage > 0) {
        const usage = [
          storeUsage > 0 ? `${plural(storeUsage, "store")} (Region / State)` : "",
          geoZoneUsage > 0 ? plural(geoZoneUsage, "geo zone location") : "",
        ]
          .filter(Boolean)
          .join(", ");

        res.status(409).json({
          message: `${zone.name} is used by ${usage}. Change or remove them first.`,
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