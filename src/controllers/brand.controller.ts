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

      const brand = brandRepository.create(brandData);
      await brandRepository.save(brand);

      res.status(201).json(brand);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getBrands: async (_req: Request, res: Response) => {
    try {
      const brands = await brandRepository.find();
      res.status(200).json(brands);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getBrandById: async (req: Request, res: Response) => {
    try {
      const brand = await brandRepository.findOne({
        where: { id: req.params.id },
      });

      if (!brand) {
        res.status(404).json({ message: "Brand not found" });
        return;
      }

      res.status(200).json(brand);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateBrand: async (req: Request, res: Response) => {
    try {
      const brand = await brandRepository.findOne({
        where: { id: req.params.id },
      });

      if (!brand) {
        res.status(404).json({ message: "Brand not found" });
        return;
      }

      const updateData = new UpdateBrandDto();
      Object.assign(updateData, req.body);

      const errors = await validate(updateData);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      Object.assign(brand, updateData);
      await brandRepository.save(brand);

      res.status(200).json(brand);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteBrand: async (req: Request, res: Response) => {
    try {
      const brand = await brandRepository.findOne({
        where: { id: req.params.id },
      });

      if (!brand) {
        res.status(404).json({ message: "Brand not found" });
        return;
      }

      await brandRepository.remove(brand);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

