import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Brand } from "../entities/brand.entity";
import { CreateBrandDto, UpdateBrandDto } from "../dto/brand.dto";
import { validate } from "class-validator";

const brandRepository = AppDataSource.getRepository(Brand);

export const BrandController = {
  createBrand: async (req: Request, res: Response) => {
    try {
      const brandData = new CreateBrandDto();

      Object.assign(brandData, req.body);

      const errors = await validate(brandData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const existingName = await brandRepository.findOne({
        where: {
          name: brandData.name.trim(),
        },
      });

      if (existingName) {
        res.status(409).json({
          message: "Brand name already exists",
        });
        return;
      }

      const existingKeyword = await brandRepository.findOne({
        where: {
          keyword: brandData.keyword,
        },
      });

      if (existingKeyword) {
        res.status(409).json({
          message: "SEO keyword already exists",
        });
        return;
      }

      const brand = brandRepository.create({
        name: brandData.name.trim(),
        description: brandData.description?.trim() || null,
        image: brandData.image || null,
        sortOrder: brandData.sortOrder,
        keyword: brandData.keyword,
      });

      await brandRepository.save(brand);

      res.status(201).json(brand);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getBrands: async (_req: Request, res: Response) => {
    try {
      const brands = await brandRepository.find({
        order: {
          sortOrder: "ASC",
          createdAt: "DESC",
        },
      });

      res.status(200).json(brands);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getBrandById: async (req: Request, res: Response) => {
    try {
      const brand = await brandRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!brand) {
        res.status(404).json({
          message: "Brand not found",
        });
        return;
      }

      res.status(200).json(brand);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateBrand: async (req: Request, res: Response) => {
    try {
      const brand = await brandRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!brand) {
        res.status(404).json({
          message: "Brand not found",
        });
        return;
      }

      const updateData = new UpdateBrandDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.name !== undefined) {
        const existingName = await brandRepository.findOne({
          where: {
            name: updateData.name.trim(),
          },
        });

        if (existingName && existingName.id !== brand.id) {
          res.status(409).json({
            message: "Brand name already exists",
          });
          return;
        }

        brand.name = updateData.name.trim();
      }

      if (updateData.description !== undefined) {
        brand.description = updateData.description.trim() || null;
      }

      if (updateData.image !== undefined) {
        brand.image = updateData.image || null;
      }

      if (updateData.sortOrder !== undefined) {
        brand.sortOrder = updateData.sortOrder;
      }

      if (updateData.keyword !== undefined) {
        const existingKeyword = await brandRepository.findOne({
          where: {
            keyword: updateData.keyword,
          },
        });

        if (existingKeyword && existingKeyword.id !== brand.id) {
          res.status(409).json({
            message: "SEO keyword already exists",
          });
          return;
        }

        brand.keyword = updateData.keyword;
      }

      await brandRepository.save(brand);

      res.status(200).json(brand);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteBrand: async (req: Request, res: Response) => {
    try {
      const brand = await brandRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!brand) {
        res.status(404).json({
          message: "Brand not found",
        });
        return;
      }

      await brandRepository.remove(brand);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};
