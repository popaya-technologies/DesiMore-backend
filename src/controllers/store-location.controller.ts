import { Request, Response } from "express";
import { validate } from "class-validator";

import { AppDataSource } from "../data-source";
import { StoreLocation } from "../entities/store-location.entity";
import {
  CreateStoreLocationDto,
  UpdateStoreLocationDto,
} from "../dto/store-location.dto";

const storeLocationRepository =
  AppDataSource.getRepository(StoreLocation);

const buildResponse = (storeLocation: StoreLocation) => {
  return {
    id: storeLocation.id,
    storeName: storeLocation.storeName,
    address: storeLocation.address,
    geocode: storeLocation.geocode,
    telephone: storeLocation.telephone,
    fax: storeLocation.fax,
    image: storeLocation.image,
    openingTimes: storeLocation.openingTimes,
    comment: storeLocation.comment,
    createdAt: storeLocation.createdAt,
    updatedAt: storeLocation.updatedAt,
  };
};

export const StoreLocationController = {
  // Create Store Location
  createStoreLocation: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const storeLocationData =
        new CreateStoreLocationDto();

      Object.assign(storeLocationData, req.body);

      const errors = await validate(
        storeLocationData,
      );

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const storeLocation =
        storeLocationRepository.create({
          storeName:
            storeLocationData.storeName.trim(),

          address:
            storeLocationData.address.trim(),

          geocode:
            storeLocationData.geocode?.trim() || null,

          telephone:
            storeLocationData.telephone.trim(),

          fax:
            storeLocationData.fax?.trim() || null,

          image:
            storeLocationData.image?.trim() || null,

          openingTimes:
            storeLocationData.openingTimes?.trim() ||
            null,

          comment:
            storeLocationData.comment?.trim() ||
            null,
        });

      await storeLocationRepository.save(
        storeLocation,
      );

      res
        .status(201)
        .json(buildResponse(storeLocation));
    } catch (error) {
      console.error(
        "Create store location error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get Store Locations
  getStoreLocations: async (
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
        parseInt(String(page), 10) || 1,
        1,
      );

      const take = Math.min(
        Math.max(
          parseInt(String(limit), 10) || 10,
          1,
        ),
        100,
      );

      const skip = (currentPage - 1) * take;

      const query =
        storeLocationRepository.createQueryBuilder(
          "storeLocation",
        );

      if (search && String(search).trim()) {
        query.andWhere(
          `(
            storeLocation.storeName ILIKE :search
            OR storeLocation.address ILIKE :search
          )`,
          {
            search: `%${String(search).trim()}%`,
          },
        );
      }

      query
        .orderBy(
          "storeLocation.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(take);

      const [storeLocations, total] =
        await query.getManyAndCount();

      res.status(200).json({
        data: storeLocations.map(buildResponse),
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(
            total / take,
          ),
        },
      });
    } catch (error) {
      console.error(
        "Get store locations error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get Store Location By ID
  getStoreLocationById: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const storeLocation =
        await storeLocationRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!storeLocation) {
        res.status(404).json({
          message: "Store Location not found.",
        });
        return;
      }

      res.status(200).json(
        buildResponse(storeLocation),
      );
    } catch (error) {
      console.error(
        "Get store location error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Update Store Location
  updateStoreLocation: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const storeLocation =
        await storeLocationRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!storeLocation) {
        res.status(404).json({
          message: "Store Location not found.",
        });
        return;
      }

      const updateData =
        new UpdateStoreLocationDto();

      Object.assign(updateData, req.body);

      const errors = await validate(
        updateData,
      );

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.storeName !== undefined) {
        storeLocation.storeName =
          updateData.storeName.trim();
      }

      if (updateData.address !== undefined) {
        storeLocation.address =
          updateData.address.trim();
      }

      if (updateData.geocode !== undefined) {
        storeLocation.geocode =
          updateData.geocode.trim() || null;
      }

      if (updateData.telephone !== undefined) {
        storeLocation.telephone =
          updateData.telephone.trim();
      }

      if (updateData.fax !== undefined) {
        storeLocation.fax =
          updateData.fax.trim() || null;
      }

      if (updateData.image !== undefined) {
        storeLocation.image =
          updateData.image.trim() || null;
      }

      if (updateData.openingTimes !== undefined) {
        storeLocation.openingTimes =
          updateData.openingTimes.trim() || null;
      }

      if (updateData.comment !== undefined) {
        storeLocation.comment =
          updateData.comment.trim() || null;
      }

      await storeLocationRepository.save(
        storeLocation,
      );

      res.status(200).json(
        buildResponse(storeLocation),
      );
    } catch (error) {
      console.error(
        "Update store location error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Delete Store Location
  deleteStoreLocation: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const storeLocation =
        await storeLocationRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!storeLocation) {
        res.status(404).json({
          message: "Store Location not found.",
        });
        return;
      }

      await storeLocationRepository.remove(
        storeLocation,
      );

      res.status(200).json({
        message:
          "Store Location deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete store location error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};