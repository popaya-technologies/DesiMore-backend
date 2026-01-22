import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { ParentCategory } from "../entities/parent-category.entity";
import { Category } from "../entities/category.entity";
import {
  CreateParentCategoryDto,
  UpdateParentCategoryDto,
} from "../dto/parent-category.dto";

const parentCategoryRepository = AppDataSource.getRepository(ParentCategory);
const categoryRepository = AppDataSource.getRepository(Category);

export const ParentCategoryController = {
  createParentCategory: async (req: Request, res: Response) => {
    try {
      const dto = new CreateParentCategoryDto();
      Object.assign(dto, req.body);

      const errors = await validate(dto);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const parentCategory = parentCategoryRepository.create(dto);
      await parentCategoryRepository.save(parentCategory);

      res.status(201).json(parentCategory);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getParentCategories: async (_req: Request, res: Response) => {
    try {
      const parentCategories = await parentCategoryRepository.find({
        order: { name: "ASC" },
      });

      res.status(200).json(parentCategories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getParentCategoryById: async (req: Request, res: Response) => {
    try {
      const parentCategory = await parentCategoryRepository.findOne({
        where: { id: req.params.id },
        relations: ["categories"],
      });

      if (!parentCategory) {
        res.status(404).json({ message: "Parent category not found" });
        return;
      }

      res.status(200).json(parentCategory);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getCategoriesByParent: async (req: Request, res: Response) => {
    try {
      const parentCategory = await parentCategoryRepository.findOne({
        where: { id: req.params.id },
      });

      if (!parentCategory) {
        res.status(404).json({ message: "Parent category not found" });
        return;
      }

      const categories = await categoryRepository
        .createQueryBuilder("category")
        .innerJoin("category.products", "product")
        .leftJoinAndSelect("category.parentCategory", "parentCategory")
        .where("category.parentCategoryId = :parentId", {
          parentId: parentCategory.id,
        })
        .distinct(true)
        .orderBy("category.displayOrder", "ASC")
        .addOrderBy("category.name", "ASC")
        .getMany();

      res.status(200).json({
        parentCategory,
        categories,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Includes categories even if they have no products (admin)
  getCategoriesByParentAll: async (req: Request, res: Response) => {
    try {
      const parentCategory = await parentCategoryRepository.findOne({
        where: { id: req.params.id },
      });

      if (!parentCategory) {
        res.status(404).json({ message: "Parent category not found" });
        return;
      }

      const categories = await categoryRepository.find({
        where: { parentCategoryId: parentCategory.id },
        relations: ["parentCategory"],
        order: { displayOrder: "ASC", name: "ASC" },
      });

      res.status(200).json({
        parentCategory,
        categories,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateParentCategory: async (req: Request, res: Response) => {
    try {
      const parentCategory = await parentCategoryRepository.findOne({
        where: { id: req.params.id },
      });

      if (!parentCategory) {
        res.status(404).json({ message: "Parent category not found" });
        return;
      }

      const dto = new UpdateParentCategoryDto();
      Object.assign(dto, req.body);

      const errors = await validate(dto);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      Object.assign(parentCategory, dto);
      await parentCategoryRepository.save(parentCategory);

      res.status(200).json(parentCategory);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteParentCategory: async (req: Request, res: Response) => {
    try {
      const parentCategory = await parentCategoryRepository.findOne({
        where: { id: req.params.id },
        relations: ["categories"],
      });

      if (!parentCategory) {
        res.status(404).json({ message: "Parent category not found" });
        return;
      }

      if (parentCategory.categories?.length) {
        res.status(400).json({
          message: "Cannot delete parent category with associated categories",
        });
        return;
      }

      await parentCategoryRepository.remove(parentCategory);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
