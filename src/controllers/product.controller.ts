import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Product } from "../entities/product.entity";
import { Brackets, In } from "typeorm";
import { Category } from "../entities/category.entity";
import * as XLSX from "xlsx";
import {
  saveProduct,
  productResponse,
  PRODUCT_RELATIONS,
} from "../services/product.service";
import { respondError } from "../utils/api-error";
import {
  LENGTH_CLASSES,
  WEIGHT_CLASSES,
  STOCK_STATUSES,
  OPTION_TYPES,
  CUSTOMER_GROUPS,
} from "../dto/product.dto";

const productRepository = AppDataSource.getRepository(Product);
const categoryRepository = AppDataSource.getRepository(Category);

const splitIds = (val: any): string[] => {
  if (!val) return [];
  return val
    .toString()
    .split(",")
    .map((s: string) => s.trim())
    .filter(
      (s: string) =>
        s && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined",
    );
};

export const formatProductResponse = productResponse;

export const ProductController = {
  // Create Product (Admin only) or Users with access
  createProduct: async (req: Request, res: Response) => {
    try {
      res.status(201).json(await saveProduct(req.body));
    } catch (error) {
      respondError(res, error);
    }
  },

  getProductForEdit: async (req: Request, res: Response) => {
    try {
      const product = await productRepository.findOne({
        where: { id: req.params.id },
        relations: PRODUCT_RELATIONS,
      });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.json(productResponse(product, true));
    } catch (error) {
      respondError(res, error);
    }
  },

  getFormOptions: async (_req: Request, res: Response) => {
    res.json({
      lengthClasses: LENGTH_CLASSES,
      weightClasses: WEIGHT_CLASSES,
      outOfStockStatuses: STOCK_STATUSES,
      optionTypes: OPTION_TYPES,
      customerGroups: CUSTOMER_GROUPS,
      manufacturerEndpoint: "/api/brands",
      categoryEndpoint: "/api/categories/all",
      downloadEndpoint: "/api/downloads",
      wholesalePriceUnit: "box",
      wholesaleStockUnit: "box",
    });
  },

  // Get All Products (Public)

  getProducts: async (req: Request, res: Response) => {
    try {
      const {
        category,
        active,
        page = "1",
        limit = "10",
        minPrice,
        maxPrice,
        sort,
      } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

      // 1. First get the product IDs that match our filters
      const baseQuery = productRepository
        .createQueryBuilder("product")
        .select("product.id", "id");

      const min =
        minPrice !== undefined ? parseFloat(minPrice as string) : undefined;
      const max =
        maxPrice !== undefined ? parseFloat(maxPrice as string) : undefined;

      if (category) {
        baseQuery
          .innerJoin("product.categories", "category")
          .andWhere("category.id = :categoryId", { categoryId: category });
      }

      if (active === "true") {
        baseQuery.andWhere("product.isActive = :isActive", {
          isActive: true,
        });
      }

      if (!isNaN(min as any)) {
        baseQuery.andWhere("product.price >= :minPrice", { minPrice: min });
      }
      if (!isNaN(max as any)) {
        baseQuery.andWhere("product.price <= :maxPrice", { maxPrice: max });
      }

      if (sort === "price_asc" || sort === "price_desc")
        baseQuery.orderBy(
          "product.price",
          sort === "price_asc" ? "ASC" : "DESC",
        );
      else
        baseQuery
          .orderBy("product.sortOrder", "ASC")
          .addOrderBy("product.createdAt", "DESC");
      baseQuery.addOrderBy("product.id", "ASC");
      const total = await baseQuery.getCount();

      const productIds = (
        await baseQuery.clone().offset(skip).limit(take).getRawMany()
      ).map((p) => p.id);

      // 2. If no products found, return empty array
      if (productIds.length === 0) {
        res.status(200).json({
          data: [],
          meta: {
            total,
            page: Math.max(parseInt(page as string, 10) || 1, 1),
            limit: take,
            totalPages: Math.ceil(total / take),
          },
        });
        return;
      }

      // 3. Get complete product data with category IDs
      const qb = productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.categories", "category")
        .leftJoinAndSelect("product.brand", "brand")
        .where("product.id IN (:...productIds)", { productIds });

      if (sort === "price_asc") {
        qb.orderBy("product.price", "ASC");
      } else if (sort === "price_desc") {
        qb.orderBy("product.price", "DESC");
      } else {
        qb.orderBy("product.sortOrder", "ASC").addOrderBy(
          "product.createdAt",
          "DESC",
        );
      }

      const products = await qb.getMany();

      // 4. Transform response to include only categoryIds
      const response = products.map((product) =>
        formatProductResponse(product),
      );

      res.status(200).json({
        data: response,
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  //Get Single Product (Public) by category slug
  getProductById: async (req: Request, res: Response) => {
    try {
      const product = await productRepository.findOne({
        where: { id: req.params.id },
        relations: PRODUCT_RELATIONS,
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      res.status(200).json(formatProductResponse(product));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // Related products (by shared categories or brand)
  getRelatedProducts: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limitParam = req.query.limit as string | undefined;
      const take = limitParam ? parseInt(limitParam, 10) : 10;

      const product = await productRepository.findOne({
        where: { id },
        relations: PRODUCT_RELATIONS,
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      if (product.relatedProducts?.length) {
        const related = await productRepository.find({
          where: {
            id: In(product.relatedProducts.map((p) => p.id)),
            isActive: true,
          },
          relations: ["categories", "brand"],
          take: Math.min(Math.max(take || 10, 1), 100),
        });
        res.json(
          related
            .filter(
              (p) =>
                !p.dateAvailable ||
                p.dateAvailable <= new Date().toISOString().slice(0, 10),
            )
            .map((p) => productResponse(p)),
        );
        return;
      }
      const categoryIds = (product.categories || []).map((c) => c.id);
      const brandId = product.brand?.id;

      const qb = productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.categories", "category")
        .leftJoinAndSelect("product.brand", "brand")
        .where("product.id != :id", { id })
        .andWhere("product.isActive = :active", { active: true })
        .andWhere(
          new Brackets((qb) => {
            if (categoryIds.length > 0) {
              qb.orWhere("category.id IN (:...categoryIds)", { categoryIds });
            }
            if (brandId) {
              qb.orWhere("brand.id = :brandId", { brandId });
            }
          }),
        )
        .distinct(true)
        .orderBy("product.createdAt", "DESC");

      if (take && !isNaN(take) && take > 0) {
        qb.take(take);
      }

      const related = await qb.getMany();
      res.status(200).json(related.map((p) => formatProductResponse(p)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // Search products (title/summary/model/tag), paginated
  searchProducts: async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      const { page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

      if (!q.trim()) {
        res.status(400).json({ message: "Query parameter q is required" });
        return;
      }

      const qb = productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.categories", "category")
        .leftJoinAndSelect("product.brand", "brand")
        .where(
          new Brackets((qb) => {
            qb.where("product.title ILIKE :q", { q: `%${q}%` }).orWhere(
              "product.model ILIKE :q",
              { q: `%${q}%` },
            );
          }),
        )
        .andWhere("product.isActive = :active", { active: true });

      const [products, total] = await qb
        .orderBy("product.createdAt", "DESC")
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: products.map((p) => formatProductResponse(p)),
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // Import products from XLSX/CSV (upsert by model if provided, else title)
  importProducts: async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file?.buffer) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        { raw: false, blankrows: false },
      );
      if (!rows.length || rows.length > 5000) {
        res.status(400).json({ message: "Import must contain 1 to 5000 rows" });
        return;
      }
      const numeric = new Set([
        "price",
        "discountPrice",
        "wholesalePrice",
        "wholesaleQuantity",
        "boxQuantity",
        "unitsPerCarton",
        "minimumQuantity",
        "wholesaleMinimumQuantity",
        "sortOrder",
        "length",
        "width",
        "height",
        "weight",
        "wholesaleLength",
        "wholesaleWidth",
        "wholesaleHeight",
        "wholesaleWeight",
      ]);
      const boolean = new Set([
        "isActive",
        "inStock",
        "subtractStock",
        "requiresShipping",
        "wholesaleRequiresShipping",
      ]);
      const json = new Set([
        "attributes",
        "options",
        "discounts",
        "imageDetails",
        "package",
      ]);
      const errors: any[] = [],
        createdProducts: any[] = [],
        updatedProducts: any[] = [];
      for (let index = 0; index < rows.length; index++) {
        try {
          const body: any = {};
          for (const [key, value] of Object.entries(rows[index])) {
            if (value === undefined || value === null || value === "") continue;
            if (numeric.has(key)) body[key] = Number(value);
            else if (boolean.has(key)) {
              const normalized = String(value).trim().toLowerCase();
              if (
                !["true", "false", "yes", "no", "1", "0"].includes(normalized)
              )
                throw new Error("Invalid boolean: " + key);
              body[key] = ["true", "yes", "1"].includes(normalized);
            } else if (json.has(key)) body[key] = JSON.parse(String(value));
            else if (
              ["categoryIds", "downloadIds", "relatedProductIds"].includes(key)
            )
              body[key] = String(value).trim().startsWith("[")
                ? JSON.parse(String(value))
                : splitIds(value);
            else if (key === "images")
              body.images = String(value).trim().startsWith("[")
                ? JSON.parse(String(value))
                : [String(value)];
            else body[key] = String(value).trim();
          }
          const title = body.title || body.productName;
          if (!title) throw new Error("Missing title");
          const existing = await productRepository.findOne({
            where: body.model
              ? [{ model: body.model }, { title }]
              : [{ title }],
          });
          const result = await saveProduct(body, existing?.id, true);
          (existing ? updatedProducts : createdProducts).push({
            id: result.id,
            title: result.title,
          });
        } catch (error) {
          errors.push({
            row: index + 2,
            error: error.message,
            ...(error.errors ? { details: error.errors } : {}),
          });
        }
      }
      res.json({
        message: "Import completed",
        created: createdProducts.length,
        updated: updatedProducts.length,
        errors,
        createdProducts,
        updatedProducts,
      });
    } catch (error) {
      res.status(400).json({ message: "Unable to read import file" });
    }
  },

  //Update product (Admin only)
  updateProduct: async (req: Request, res: Response) => {
    try {
      res.json(await saveProduct(req.body, req.params.id));
    } catch (error) {
      respondError(res, error);
    }
  },

  //Delete Product (Admin only)
  deleteProduct: async (req: Request, res: Response) => {
    try {
      const product = await productRepository.findOne({
        where: { id: req.params.id },
      });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      await productRepository.remove(product);
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Sever Error" });
    }
  },

  getProductsByCategory: async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { limit = "10", page = "1" } = req.query;

      const take = parseInt(limit as string);
      const skip = (parseInt(page as string) - 1) * take;

      const category = await categoryRepository.findOne({
        where: { slug },
      });

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      const [products, total] = await productRepository.findAndCount({
        where: {
          categories: { id: category.id },
          isActive: true,
        },
        relations: PRODUCT_RELATIONS,
        take,
        skip,
        order: { createdAt: "DESC" },
      });

      const formattedProducts = products.map((product) =>
        formatProductResponse(product),
      );

      res.status(200).json({
        data: formattedProducts,
        meta: {
          total,
          page: parseInt(page as string),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getProductsByCategoryId: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = "10", page = "1" } = req.query;

      const take = parseInt(limit as string);
      const skip = (parseInt(page as string) - 1) * take;

      const category = await categoryRepository.findOne({
        where: { id },
      });

      if (!category) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      const [products, total] = await productRepository.findAndCount({
        where: {
          categories: { id: category.id },
          isActive: true,
        },
        relations: PRODUCT_RELATIONS,
        take,
        skip,
        order: { createdAt: "DESC" },
      });

      const formattedProducts = products.map((product) =>
        formatProductResponse(product),
      );

      res.status(200).json({
        data: formattedProducts,
        meta: {
          total,
          page: parseInt(page as string),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
