import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate, type ValidationError } from "class-validator";
import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { GeoZone } from "../entities/geo_zone.entity";
import { GeoZoneLocation } from "../entities/geo_zone_location.entity";
import { Country } from "../entities/country.entity";
import { TaxRate } from "../entities/tax-class.entity";
import { Zone } from "../entities/zone.entity";
import {
  CreateGeoZoneDto,
  GeoZoneLocationDto,
  UpdateGeoZoneDto,
} from "../dto/geo_zone.dto";

// Location rows are nested, so collect constraint messages from every level.
const collectMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...collectMessages(error.children ?? []),
  ]);

const validationErrors = async (dto: object) =>
  collectMessages(
    await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

// Geo zone names are unique regardless of upper/lower case.
const isNameTaken = async (name: string, excludeId?: string) => {
  const query = AppDataSource.getRepository(GeoZone)
    .createQueryBuilder("geoZone")
    .select(["geoZone.id"])
    .where("LOWER(geoZone.name) = LOWER(:name)", { name });

  if (excludeId) {
    query.andWhere("geoZone.id != :excludeId", { excludeId });
  }

  return Boolean(await query.getOne());
};

// Returns an error message when the Country + Zone rows are invalid, otherwise null.
const checkLocations = async (
  locations: GeoZoneLocationDto[]
): Promise<string | null> => {
  if (locations.length === 0) {
    return "At least one Geo Zone location is required";
  }

  const countryIds = [...new Set(locations.map((row) => row.countryId))];
  const countries = await AppDataSource.getRepository(Country).findBy({
    id: In(countryIds),
  });

  if (countries.length !== countryIds.length) {
    return "One or more countries are invalid";
  }

  const zoneIds = [
    ...new Set(
      locations
        .map((row) => row.zoneId)
        .filter((zoneId): zoneId is string => Boolean(zoneId))
    ),
  ];
  const zones = zoneIds.length
    ? await AppDataSource.getRepository(Zone).findBy({ id: In(zoneIds) })
    : [];

  if (zones.length !== zoneIds.length) {
    return "One or more zones are invalid";
  }

  const countryName = new Map(countries.map((c) => [c.id, c.name]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const seen = new Set<string>();
  const allZonesCountries = new Set(
    locations.filter((row) => !row.zoneId).map((row) => row.countryId)
  );

  for (const row of locations) {
    const country = countryName.get(row.countryId);

    if (row.zoneId) {
      const zone = zoneById.get(row.zoneId);

      if (!zone || zone.countryId !== row.countryId) {
        return "Selected zone does not belong to the selected country";
      }

      // "All Zones" already covers every zone of the country.
      if (allZonesCountries.has(row.countryId)) {
        return `${country} is already added with All Zones. Remove the other ${country} rows.`;
      }
    }

    const key = `${row.countryId}|${row.zoneId ?? "all"}`;

    if (seen.has(key)) {
      const zoneName = row.zoneId
        ? zoneById.get(row.zoneId)?.name
        : "All Zones";
      return `${country} - ${zoneName} is added more than once`;
    }

    seen.add(key);
  }

  return null;
};

const geoZoneRelations = [
  "locations",
  "locations.country",
  "locations.zone",
];

export class GeoZoneController {
  static async createGeoZone(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const dto = plainToInstance(CreateGeoZoneDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const geoZoneRepository =
        AppDataSource.getRepository(GeoZone);

      const name = dto.name.trim();

      if (await isNameTaken(name)) {
        res.status(409).json({
          message: "Geo Zone with this name already exists",
        });
        return;
      }

      const locationError = await checkLocations(dto.locations);

      if (locationError) {
        res.status(400).json({
          message: locationError,
        });
        return;
      }

      const geoZone = geoZoneRepository.create({
        name,
        description: dto.description.trim(),
        locations: dto.locations.map((location) => ({
          countryId: location.countryId,
          zoneId: location.zoneId ?? null,
        })) as GeoZoneLocation[],
      });

      const savedGeoZone =
        await geoZoneRepository.save(geoZone);

      const result =
        await geoZoneRepository.findOne({
          where: {
            id: savedGeoZone.id,
          },
          relations: geoZoneRelations,
        });

      res.status(201).json(result);
    } catch (error) {
      console.error("Create Geo Zone error:", error);

      res.status(500).json({
        message: "Failed to create Geo Zone",
      });
    }
  }

  static async getGeoZones(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const geoZoneRepository =
        AppDataSource.getRepository(GeoZone);

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 10, 1),
        100
      );

      // Column sorting from the admin list; default is name A-Z (the old site's order).
      const sortColumns: Record<string, string> = {
        name: "geoZone.name",
        description: "geoZone.description",
      };
      const sortBy =
        typeof req.query.sortBy === "string" &&
        sortColumns[req.query.sortBy]
          ? sortColumns[req.query.sortBy]
          : sortColumns.name;
      const sortOrder =
        String(req.query.sortOrder).toUpperCase() === "DESC"
          ? "DESC"
          : "ASC";

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const queryBuilder =
        geoZoneRepository
          .createQueryBuilder("geoZone")
          .leftJoinAndSelect(
            "geoZone.locations",
            "location"
          )
          .leftJoinAndSelect(
            "location.country",
            "country"
          )
          .leftJoinAndSelect(
            "location.zone",
            "zone"
          );

      if (search) {
        queryBuilder.where(
          "(geoZone.name ILIKE :search OR geoZone.description ILIKE :search)",
          {
            search: `%${search}%`,
          }
        );
      }

      queryBuilder
        .orderBy(sortBy, sortOrder)
        .addOrderBy("geoZone.name", "ASC")
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get Geo Zones error:", error);

      res.status(500).json({
        message: "Failed to get Geo Zones",
      });
    }
  }

  static async getGeoZoneById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;

      const geoZoneRepository =
        AppDataSource.getRepository(GeoZone);

      const geoZone =
        await geoZoneRepository.findOne({
          where: { id },
          relations: geoZoneRelations,
        });

      if (!geoZone) {
        res.status(404).json({
          message: "Geo Zone not found",
        });
        return;
      }

      res.status(200).json(geoZone);
    } catch (error) {
      console.error("Get Geo Zone error:", error);

      res.status(500).json({
        message: "Failed to get Geo Zone",
      });
    }
  }

  static async updateGeoZone(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;

      const dto = plainToInstance(UpdateGeoZoneDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const geoZoneRepository =
        AppDataSource.getRepository(GeoZone);

      const geoZone = await geoZoneRepository.findOne({
        where: { id },
      });

      if (!geoZone) {
        res.status(404).json({
          message: "Geo Zone not found",
        });
        return;
      }

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        if (await isNameTaken(name, id)) {
          res.status(409).json({
            message: "Geo Zone with this name already exists",
          });
          return;
        }

        geoZone.name = name;
      }

      if (dto.description !== undefined) {
        geoZone.description = dto.description.trim();
      }

      if (dto.locations !== undefined) {
        const locationError = await checkLocations(dto.locations);

        if (locationError) {
          res.status(400).json({
            message: locationError,
          });
          return;
        }
      }

      // Replace the Country + Zone rows and save the geo zone together, so a
      // failure cannot leave the geo zone without its rows.
      await AppDataSource.transaction(async (manager) => {
        if (dto.locations !== undefined) {
          await manager.delete(GeoZoneLocation, { geoZoneId: id });
          await manager.save(
            dto.locations.map((location) =>
              manager.create(GeoZoneLocation, {
                geoZoneId: id,
                countryId: location.countryId,
                zoneId: location.zoneId ?? null,
              })
            )
          );
        }

        await manager.save(geoZone);
      });

      const result =
        await geoZoneRepository.findOne({
          where: { id },
          relations: geoZoneRelations,
        });

      res.status(200).json(result);
    } catch (error) {
      console.error("Update Geo Zone error:", error);

      res.status(500).json({
        message: "Failed to update Geo Zone",
      });
    }
  }

  static async deleteGeoZone(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;

      const geoZoneRepository =
        AppDataSource.getRepository(GeoZone);

      const geoZone =
        await geoZoneRepository.findOne({
          where: { id },
        });

      if (!geoZone) {
        res.status(404).json({
          message: "Geo Zone not found",
        });
        return;
      }

      // Tax rates point to their geo zone (RESTRICT), like OpenCart's delete check.
      const taxRateCount = await AppDataSource.getRepository(TaxRate).count({
        where: { geoZoneId: id },
      });

      if (taxRateCount > 0) {
        res.status(409).json({
          message: `${geoZone.name} is used by ${taxRateCount} tax rate${taxRateCount === 1 ? "" : "s"}. Change them first.`,
        });
        return;
      }

      await geoZoneRepository.remove(geoZone);

      res.status(200).json({
        message: "Geo Zone deleted successfully",
      });
    } catch (error) {
      console.error("Delete Geo Zone error:", error);

      res.status(500).json({
        message: "Failed to delete Geo Zone",
      });
    }
  }
}
