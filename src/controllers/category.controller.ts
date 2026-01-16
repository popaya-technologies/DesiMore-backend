import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entities/category.entity";
import { ParentCategory } from "../entities/parent-category.entity";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/category.dto";
import { validate } from "class-validator";
import * as XLSX from "xlsx";

const categoryRepository = AppDataSource.getRepository(Category);
const parentCategoryRepository =
  AppDataSource.getRepository(ParentCategory);

type CategoryRow = Partial<{
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: string | boolean;
  displayOrder: number | string;
  metaTitle: string;
  metaDescription: string;
  metaKeyword: string;
}>;

const toBool = (val: any): boolean | undefined => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "boolean") return val;
  const normalized = String(val).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return undefined;
};

const toInt = (val: any): number | undefined => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
};

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

  // Import categories from uploaded XLSX/CSV; parentCategoryId supplied separately
  importCategories: async (req: Request, res: Response) => {
    try {
      const parentCategoryId =
        (req.body.parentCategoryId as string | undefined) ||
        (req.query.parentCategoryId as string | undefined) ||
        null;

      if (!req.file || !req.file.buffer) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      let parentCategory: ParentCategory | null = null;
      if (parentCategoryId) {
        parentCategory = await parentCategoryRepository.findOne({
          where: { id: parentCategoryId },
        });
        if (!parentCategory) {
          res.status(400).json({ message: "Invalid parentCategoryId" });
          return;
        }
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: CategoryRow[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
        blankrows: false,
      });

      if (!rows || rows.length === 0) {
        res.status(400).json({ message: "No data found in file" });
        return;
      }

      let created = 0;
      let updated = 0;
      const errors: Array<{ row: number; error: string }> = [];
      const createdCategories: Array<{ name: string; id: string }> = [];
      const updatedCategories: Array<{ name: string; id: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.name?.toString().trim();
        if (!name) {
          errors.push({ row: i + 2, error: "Missing name" }); // +2 accounts for header row
          continue;
        }

        const slug =
          row.slug?.toString().trim() ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const isActive = toBool(row.isActive);
        const displayOrder = toInt(row.displayOrder);

        const baseData: Partial<Category> = {
          name,
          slug,
          description: row.description || null,
          image: row.image || null,
          isActive: isActive !== undefined ? isActive : true,
          displayOrder: displayOrder ?? 0,
          metaTitle: row.metaTitle || null,
          metaDescription: row.metaDescription || null,
          metaKeyword: row.metaKeyword || null,
        };

        const existing = await categoryRepository.findOne({
          where: [{ slug }, { name }],
        });

        if (existing) {
          Object.assign(existing, baseData);
          existing.parentCategory = parentCategory;
          await categoryRepository.save(existing);
          updated += 1;
          updatedCategories.push({ name: existing.name, id: existing.id });
        } else {
          const newCategory = categoryRepository.create({
            ...baseData,
            parentCategory,
          });
          await categoryRepository.save(newCategory);
          created += 1;
          createdCategories.push({ name: newCategory.name, id: newCategory.id });
        }
      }

      res.status(200).json({
        message: "Import completed",
        created,
        updated,
        errors,
        createdCategories,
        updatedCategories,
      });
    } catch (error) {
      console.error("Category import error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
