import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entities/category.entity";
import { ParentCategory } from "../entities/parent-category.entity";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/category.dto";
import { validate } from "class-validator";
import * as XLSX from "xlsx";

const categoryRepository = AppDataSource.getRepository(Category);
const parentCategoryRepository = AppDataSource.getRepository(ParentCategory);

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

const toMaybeString = (val: any): string | undefined => {
  if (val === undefined || val === null) return undefined;
  const t = val.toString().trim();
  return t ? t : undefined;
};

export const CategoryController = {
  //Create Category (Admin only)
  createCategory: async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryRepository = AppDataSource.getRepository(Category);

      const parentCategoryRepository =
        AppDataSource.getRepository(ParentCategory);

      const categoryDto = new CreateCategoryDto();

      Object.assign(categoryDto, req.body);

      const errors = await validate(categoryDto);

      if (errors.length > 0) {
        res.status(400).json({
          message: "Validation failed",
          errors,
        });
        return;
      }

      const existingName = await categoryRepository.findOne({
        where: {
          name: categoryDto.name,
        },
      });

      if (existingName) {
        res.status(409).json({
          message: "Category with this name already exists",
        });
        return;
      }

      const existingKeyword = await categoryRepository.findOne({
        where: {
          keyword: categoryDto.keyword,
        },
      });

      if (existingKeyword) {
        res.status(409).json({
          message: "Category with this SEO keyword already exists",
        });
        return;
      }

      let parentCategory: ParentCategory | null = null;

      if (categoryDto.parentCategoryId) {
        parentCategory = await parentCategoryRepository.findOne({
          where: {
            id: categoryDto.parentCategoryId,
          },
        });

        if (!parentCategory) {
          res.status(400).json({
            message: "Parent category not found",
          });
          return;
        }
      }

      const category = categoryRepository.create({
        name: categoryDto.name,
        description: categoryDto.description ?? null,
        image: categoryDto.image ?? null,
        isActive: categoryDto.isActive ?? true,
        displayOrder: categoryDto.displayOrder ?? 0,
        parentCategoryId: categoryDto.parentCategoryId ?? null,

        metaTitle: categoryDto.metaTitle,
        metaDescription: categoryDto.metaDescription ?? null,
        metaKeywords: categoryDto.metaKeywords ?? null,
        keyword: categoryDto.keyword,

        parentCategory,
      });

      const savedCategory = await categoryRepository.save(category);

      const result = await categoryRepository.findOne({
        where: {
          id: savedCategory.id,
        },
        relations: {
          parentCategory: true,
        },
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Create category error:", error);

      res.status(500).json({
        message: "Failed to create category",
      });
    }
  },

  //Get all Categories (public)
  getCategories: async (req: Request, res: Response) => {
    try {
      const { active, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

      const qb = categoryRepository
        .createQueryBuilder("category")
        .innerJoin("category.products", "product")
        .leftJoinAndSelect("category.parentCategory", "parentCategory");

      if (active === "true") {
        qb.where("category.isActive = :isActive", { isActive: true });
      }

      const [categories, total] = await qb
        .distinct(true)
        .orderBy("category.displayOrder", "ASC")
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: categories,
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  //Get all Categories (admin - includes empty categories)
  getAllCategoriesAdmin: async (req: Request, res: Response) => {
    try {
      const { active, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

      const qb = categoryRepository
        .createQueryBuilder("category")
        .leftJoinAndSelect("category.parentCategory", "parentCategory");

      if (active === "true") {
        qb.where("category.isActive = :isActive", { isActive: true });
      }

      const [categories, total] = await qb
        .orderBy("category.displayOrder", "ASC")
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: categories,
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get all category names with ids (public)
  getCategoryNames: async (_req: Request, res: Response) => {
    try {
      const categories = await categoryRepository.find({
        select: ["id", "name"],
        order: { name: "ASC" },
      });
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
  updateCategory: async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryRepository = AppDataSource.getRepository(Category);

      const parentCategoryRepository =
        AppDataSource.getRepository(ParentCategory);

      const category = await categoryRepository.findOne({
        where: {
          id: req.params.id,
        },
        relations: {
          parentCategory: true,
        },
      });

      if (!category) {
        res.status(404).json({
          message: "Category not found",
        });
        return;
      }

      const categoryDto = new UpdateCategoryDto();

      Object.assign(categoryDto, req.body);

      const errors = await validate(categoryDto);

      if (errors.length > 0) {
        res.status(400).json({
          message: "Validation failed",
          errors,
        });
        return;
      }

      // Check duplicate category name
      if (categoryDto.name !== undefined) {
        const existingName = await categoryRepository.findOne({
          where: {
            name: categoryDto.name,
          },
        });

        if (existingName && existingName.id !== category.id) {
          res.status(409).json({
            message: "Category with this name already exists",
          });
          return;
        }
      }

      // Check duplicate SEO keyword
      if (categoryDto.keyword !== undefined) {
        const existingKeyword = await categoryRepository.findOne({
          where: {
            keyword: categoryDto.keyword,
          },
        });

        if (existingKeyword && existingKeyword.id !== category.id) {
          res.status(409).json({
            message: "Category with this SEO keyword already exists",
          });
          return;
        }
      }

      // Parent category
      if (categoryDto.parentCategoryId !== undefined) {
        if (categoryDto.parentCategoryId === null) {
          category.parentCategory = null;
          category.parentCategoryId = null;
        } else {
          const parentCategory = await parentCategoryRepository.findOne({
            where: {
              id: categoryDto.parentCategoryId,
            },
          });

          if (!parentCategory) {
            res.status(400).json({
              message: "Parent category not found",
            });
            return;
          }

          category.parentCategory = parentCategory;
          category.parentCategoryId = categoryDto.parentCategoryId;
        }
      }

      // General fields
      if (categoryDto.name !== undefined) {
        category.name = categoryDto.name;
      }

      if (categoryDto.description !== undefined) {
        category.description = categoryDto.description || null;
      }

      if (categoryDto.image !== undefined) {
        category.image = categoryDto.image || null;
      }

      if (categoryDto.isActive !== undefined) {
        category.isActive = categoryDto.isActive;
      }

      if (categoryDto.displayOrder !== undefined) {
        category.displayOrder = categoryDto.displayOrder;
      }

      // SEO fields
      if (categoryDto.metaTitle !== undefined) {
        category.metaTitle = categoryDto.metaTitle;
      }

      if (categoryDto.metaDescription !== undefined) {
        category.metaDescription = categoryDto.metaDescription || null;
      }

      if (categoryDto.metaKeywords !== undefined) {
        category.metaKeywords = categoryDto.metaKeywords || null;
      }

      if (categoryDto.keyword !== undefined) {
        category.keyword = categoryDto.keyword;
      }

      const updatedCategory = await categoryRepository.save(category);

      const result = await categoryRepository.findOne({
        where: {
          id: updatedCategory.id,
        },
        relations: {
          parentCategory: true,
        },
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("Update category error:", error);

      res.status(500).json({
        message: "Failed to update category",
      });
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

      const uploadedFile = (req as any).file as { buffer: Buffer } | undefined;

      if (!uploadedFile || !uploadedFile.buffer) {
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

      const workbook = XLSX.read(uploadedFile.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: CategoryRow[] = XLSX.utils.sheet_to_json(sheet, {
        defval: undefined,
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
        const name = toMaybeString(row.name);
        if (!name) {
          errors.push({ row: i + 2, error: "Missing name" }); // +2 accounts for header row
          continue;
        }

        const slug =
          toMaybeString(row.slug) ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const isActive = row.hasOwnProperty("isActive")
          ? toBool(row.isActive)
          : undefined;
        const displayOrder = row.hasOwnProperty("displayOrder")
          ? toInt(row.displayOrder)
          : undefined;

        const description = toMaybeString(row.description);
        const image = toMaybeString(row.image);
        const metaTitle = toMaybeString(row.metaTitle);
        const metaDescription = toMaybeString(row.metaDescription);
        const metaKeyword = toMaybeString(row.metaKeyword);

        const existing = await categoryRepository.findOne({
          where: [{ slug }, { name }],
        });

        if (existing) {
          existing.name = name;
          existing.slug = slug;
          if (description !== undefined)
            existing.description = description || null;
          if (image !== undefined) existing.image = image || null;
          if (isActive !== undefined) existing.isActive = isActive;
          if (displayOrder !== undefined) existing.displayOrder = displayOrder;
          if (metaTitle !== undefined) existing.metaTitle = metaTitle || null;
          if (metaDescription !== undefined)
            existing.metaDescription = metaDescription || null;
          if (metaKeyword !== undefined) {
            existing.metaKeywords = metaKeyword || null;
          }
          if (parentCategoryId !== null) {
            existing.parentCategory = parentCategory;
          }
          await categoryRepository.save(existing);
          updated += 1;
          updatedCategories.push({ name: existing.name, id: existing.id });
        } else {
          const newCategory = categoryRepository.create({
            name,
            slug,
            description: description || null,
            image: image || null,
            isActive: isActive !== undefined ? isActive : true,
            displayOrder: displayOrder ?? 0,
            metaTitle: metaTitle || null,
            metaDescription: metaDescription || null,
            metaKeywords: metaKeyword,
            parentCategory,
          });
          await categoryRepository.save(newCategory);
          created += 1;
          createdCategories.push({
            name: newCategory.name,
            id: newCategory.id,
          });
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
