import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { GeoZone } from "../entities/geo_zone.entity";
import { GeoZoneLocation } from "../entities/geo_zone_location.entity";
import { Country } from "../entities/country.entity";
import { Zone } from "../entities/zone.entity";
import {
  CreateGeoZoneDto,
  UpdateGeoZoneDto,
} from "../dto/geo_zone.dto";

export class GeoZoneController {
  static async createGeoZone(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const dto = req.body as CreateGeoZoneDto;

      const geoZoneRepository =
        AppDataSource.getRepository(GeoZone);

      const countryRepository =
        AppDataSource.getRepository(Country);

      const zoneRepository =
        AppDataSource.getRepository(Zone);

      const existingGeoZone =
        await geoZoneRepository.findOne({
          where: {
            name: dto.name.trim(),
          },
        });

      if (existingGeoZone) {
        res.status(409).json({
          message: "Geo Zone with this name already exists",
        });
        return;
      }

      if (!dto.locations || dto.locations.length === 0) {
        res.status(400).json({
          message: "At least one Geo Zone location is required",
        });
        return;
      }

      const countryIds = [
        ...new Set(
          dto.locations.map((location) => location.countryId)
        ),
      ];

      const countries = await countryRepository.findByIds(
        countryIds
      );

      if (countries.length !== countryIds.length) {
        res.status(400).json({
          message: "One or more countries are invalid",
        });
        return;
      }

      const zoneIds = [
        ...new Set(
          dto.locations
            .map((location) => location.zoneId)
            .filter(
              (zoneId): zoneId is string => Boolean(zoneId)
            )
        ),
      ];

      const zones =
        zoneIds.length > 0
          ? await zoneRepository.findByIds(zoneIds)
          : [];

      if (zones.length !== zoneIds.length) {
        res.status(400).json({
          message: "One or more zones are invalid",
        });
        return;
      }

      const zoneMap = new Map(
        zones.map((zone) => [zone.id, zone])
      );

      for (const location of dto.locations) {
        if (!location.zoneId) {
          continue;
        }

        const zone = zoneMap.get(location.zoneId);

        if (!zone) {
          res.status(400).json({
            message: "Invalid zone",
          });
          return;
        }

        if (zone.countryId !== location.countryId) {
          res.status(400).json({
            message:
              "Selected zone does not belong to the selected country",
          });
          return;
        }
      }

      const geoZone = geoZoneRepository.create({
        name: dto.name.trim(),
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
          relations: [
            "locations",
            "locations.country",
            "locations.zone",
          ],
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

      const limit = Math.max(
        Number(req.query.limit) || 10,
        1
      );

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
          "LOWER(geoZone.name) LIKE LOWER(:search) OR LOWER(geoZone.description) LIKE LOWER(:search)",
          {
            search: `%${search}%`,
          }
        );
      }

      queryBuilder
        .orderBy("geoZone.createdAt", "DESC")
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
          relations: [
            "locations",
            "locations.country",
            "locations.zone",
          ],
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
    const dto = req.body as UpdateGeoZoneDto;

    const geoZoneRepository =
      AppDataSource.getRepository(GeoZone);

    const geoZoneLocationRepository =
      AppDataSource.getRepository(GeoZoneLocation);

    const countryRepository =
      AppDataSource.getRepository(Country);

    const zoneRepository =
      AppDataSource.getRepository(Zone);

    const geoZone = await geoZoneRepository.findOne({
      where: { id },
    });

    if (!geoZone) {
      res.status(404).json({
        message: "Geo Zone not found",
      });
      return;
    }

    // Check duplicate name
    if (dto.name !== undefined) {
      const name = dto.name.trim();

      const existingGeoZone =
        await geoZoneRepository.findOne({
          where: {
            name,
          },
        });

      if (
        existingGeoZone &&
        existingGeoZone.id !== id
      ) {
        res.status(409).json({
          message: "Geo Zone with this name already exists",
        });
        return;
      }

      geoZone.name = name;
    }

    // Update description
    if (dto.description !== undefined) {
      geoZone.description = dto.description.trim();
    }

    // Update Country + Zone mappings
    if (dto.locations !== undefined) {
      if (dto.locations.length === 0) {
        res.status(400).json({
          message:
            "At least one Geo Zone location is required",
        });
        return;
      }

      // Validate countries
      const countryIds = [
        ...new Set(
          dto.locations.map(
            (location) => location.countryId
          )
        ),
      ];

      const countries =
        await countryRepository.findByIds(countryIds);

      if (countries.length !== countryIds.length) {
        res.status(400).json({
          message: "One or more countries are invalid",
        });
        return;
      }

      // Validate zones
      const zoneIds = [
        ...new Set(
          dto.locations
            .map((location) => location.zoneId)
            .filter(
              (zoneId): zoneId is string =>
                Boolean(zoneId)
            )
        ),
      ];

      const zones =
        zoneIds.length > 0
          ? await zoneRepository.findByIds(zoneIds)
          : [];

      if (zones.length !== zoneIds.length) {
        res.status(400).json({
          message: "One or more zones are invalid",
        });
        return;
      }

      const zoneMap = new Map(
        zones.map((zone) => [zone.id, zone])
      );

      // Make sure selected Zone belongs to selected Country
      for (const location of dto.locations) {
        if (!location.zoneId) {
          continue;
        }

        const zone = zoneMap.get(location.zoneId);

        if (
          !zone ||
          zone.countryId !== location.countryId
        ) {
          res.status(400).json({
            message:
              "Selected zone does not belong to the selected country",
          });
          return;
        }
      }

      /*
       * Delete existing mappings first.
       *
       * Then create the new mappings from the request.
       * This is safer than trying to update the OneToMany
       * relation through GeoZone.save().
       */
      await geoZoneLocationRepository.delete({
        geoZoneId: id,
      });

      const locations =
        dto.locations.map((location) =>
          geoZoneLocationRepository.create({
            geoZoneId: id,
            countryId: location.countryId,
            zoneId: location.zoneId ?? null,
          })
        );

      await geoZoneLocationRepository.save(locations);
    }

    // Save Geo Zone itself
    await geoZoneRepository.save(geoZone);

    // Return updated Geo Zone with relations
    const result =
      await geoZoneRepository.findOne({
        where: { id },
        relations: [
          "locations",
          "locations.country",
          "locations.zone",
        ],
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