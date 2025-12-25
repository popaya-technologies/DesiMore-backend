import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entities/category.entity";
import { ParentCategory } from "../entities/parent-category.entity";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/category.dto";
import { validate } from "class-validator";

const categoryRepository = AppDataSource.getRepository(Category);
const parentCategoryRepository =
  AppDataSource.getRepository(ParentCategory);

export const CategoryController = {
  //Create Category (Admin only)
  createCategory: async (req: Request, res: Response) => {
    try {
      const categoryData = new CreateCategoryDto();
      Object.assign(categoryData, req.body);

      const errors = await validate(categoryData);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      let parentCategory: ParentCategory | null = null;
      if (categoryData.parentCategoryId) {
        parentCategory = await parentCategoryRepository.findOne({
          where: { id: categoryData.parentCategoryId },
        });

        if (!parentCategory) {
          res.status(404).json({ message: "Parent category not found" });
          return;
        }
      }

      const category = categoryRepository.create(categoryData);
      category.parentCategory = parentCategory;
      await categoryRepository.save(category);

      const createdCategory = await categoryRepository.findOne({
        where: { id: category.id },
        relations: ["parentCategory"],
      });

      res.status(201).json(createdCategory ?? category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  //Get all Categories (public)
  getCategories: async (req: Request, res: Response) => {
    try {
      const { active } = req.query;
      const query = categoryRepository
        .createQueryBuilder("category")
        .leftJoinAndSelect("category.parentCategory", "parentCategory");

      if (active === "true") {
        query.where("category.isActive = :isActive", { isActive: true });
      }

      query.orderBy("category.displayOrder", "ASC");

      const categories = await query.getMany();
      res.status(200).json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get Single Category with Products (Public)
  getCategoryBySlug: async (req: Request, res: Response) => {
    try {
      const category = await categoryRepository.findOne({
        where: { slug: req.params.slug },
        relations: ["products", "parentCategory"],
      });

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      res.status(200).json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getCategoryById: async (req: Request, res: Response) => {
    try {
      const category = await categoryRepository.findOne({
        where: { id: req.params.id },
        relations: ["products", "parentCategory"],
      });

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      res.status(200).json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update Category (Admin only)
  updateCategory: async (req: Request, res: Response) => {
    try {
      const category = await categoryRepository.findOne({
        where: { id: req.params.id },
        relations: ["parentCategory"],
      });

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      const updateData = new UpdateCategoryDto();
      Object.assign(updateData, req.body);

      const errors = await validate(updateData);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      let parentCategory = category.parentCategory;
      if (
        Object.prototype.hasOwnProperty.call(req.body, "parentCategoryId")
      ) {
        const parentId = req.body.parentCategoryId;
        if (parentId === null || parentId === undefined || parentId === "") {
          parentCategory = null;
        } else {
          parentCategory = await parentCategoryRepository.findOne({
            where: { id: parentId },
          });

          if (!parentCategory) {
            res.status(404).json({ message: "Parent category not found" });
            return;
          }
        }
      } else if (updateData.parentCategoryId) {
        parentCategory = await parentCategoryRepository.findOne({
          where: { id: updateData.parentCategoryId },
        });

        if (!parentCategory) {
          res.status(404).json({ message: "Parent category not found" });
          return;
        }
      }

      Object.assign(category, updateData);
      category.parentCategory = parentCategory;
      await categoryRepository.save(category);

      const updatedCategory = await categoryRepository.findOne({
        where: { id: category.id },
        relations: ["parentCategory"],
      });

      res.status(200).json(updatedCategory ?? category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Delete Category (Admin only)
  deleteCategory: async (req: Request, res: Response) => {
    try {
      const category = await categoryRepository.findOne({
        where: { id: req.params.id },
        relations: ["products"],
      });

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      if (category.products && category.products.length > 0) {
        res.status(400).json({
          message: "Cannot delete category with associated products",
        });
        return;
      }

      await categoryRepository.remove(category);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
