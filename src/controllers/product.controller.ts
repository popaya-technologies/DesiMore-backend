import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Product } from "../entities/product.entity";
import { CreateProductDto, UpdateProductDto } from "../dto/product.dto";
import { validate } from "class-validator";
import { Brackets, In } from "typeorm";
import { Category } from "../entities/category.entity";
import { Brand } from "../entities/brand.entity";
import * as XLSX from "xlsx";

const productRepository = AppDataSource.getRepository(Product);
const categoryRepository = AppDataSource.getRepository(Category);
const brandRepository = AppDataSource.getRepository(Brand);

type ProductRow = Partial<{
  model: string;
  quantity: string | number;
  price: string | number;
  weight: string | number;
  length: string | number;
  width: string | number;
  height: string | number;
  title: string;
  summary: string;
  tag: string;
  metaTitle: string;
  metaDescription: string;
  metaKeyword: string;
  categoryIds: string;
  images: any;
}>;

const toNum = (val: any): number | null => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

const splitIds = (val: any): string[] => {
  if (!val) return [];
  return val
    .toString()
    .split(",")
    .map((s: string) => s.trim())
    .filter(
      (s: string) =>
        s &&
        s.toLowerCase() !== "null" &&
        s.toLowerCase() !== "undefined"
    );
};

const normalizeImages = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object" && item.url) return item.url.toString();
        return null;
      })
      .filter(Boolean) as string[];
  }
  if (typeof val === "object" && val.url) return [val.url.toString()];
  if (typeof val === "string") return [val];
  return [];
};

const normalizePackage = (val: any) => {
  if (!val || typeof val !== "object") return undefined;
  const length =
    val.length !== undefined && val.length !== null
      ? Number(val.length)
      : undefined;
  const width =
    val.width !== undefined && val.width !== null
      ? Number(val.width)
      : undefined;
  const height =
    val.height !== undefined && val.height !== null
      ? Number(val.height)
      : undefined;
  const pkg = {
    length: Number.isFinite(length) ? length : undefined,
    width: Number.isFinite(width) ? width : undefined,
    height: Number.isFinite(height) ? height : undefined,
  };
  if (
    pkg.length === undefined &&
    pkg.width === undefined &&
    pkg.height === undefined
  ) {
    return undefined;
  }
  return pkg;
};

const formatProductResponse = (product: Product) => {
  if (!product) {
    return null;
  }

  const { categories = [], brand, ...productData } = product;
  const normalizedProduct = {
    ...productData,
    discountPrice: productData.discountPrice ?? productData.price,
    tag: productData.tag ?? null,
  };

  return {
    ...normalizedProduct,
    categoryIds: categories.map((c) => c.id),
    brandId: brand ? brand.id : null,
  };
};

export const ProductController = {
  // Create Product (Admin only) or Users with access
  createProduct: async (req: Request, res: Response) => {
    try {
      // Create and validate DTO
      const productData = new CreateProductDto();
      const body = { ...req.body };
      if (body.images) {
        body.images = normalizeImages(body.images);
      }
      if (body.package) {
        body.package = normalizePackage(body.package);
      }
      Object.assign(productData, body);

      const errors = await validate(productData);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Validate categories
      const categories = await categoryRepository.find({
        where: { id: In(productData.categoryIds) },
      });

      if (categories.length !== productData.categoryIds.length) {
        res.status(400).json({
          message: "One or more category IDs are invalid",
          invalidIds: productData.categoryIds.filter(
            (id) => !categories.some((c) => c.id === id)
          ),
        });
        return;
      }

      // Validate brand if provided
      let brand: Brand | null = null;
      if (productData.brandId) {
        brand = await brandRepository.findOne({
          where: { id: productData.brandId },
        });

        if (!brand) {
          res.status(400).json({ message: "Invalid brand ID" });
          return;
        }
      }

      // Create and save product
      const product = productRepository.create({
        title: productData.title,
        model: productData.model ?? null,
        images: productData.images,
        price: productData.price,
        discountPrice: productData.discountPrice ?? productData.price,
        wholesalePrice: productData.wholesalePrice ?? null,
        summary: productData.summary,
        quantity: productData.quantity || "0",
        wholesaleOrderQuantity: productData.wholesaleOrderQuantity ?? null,
        unitsPerCarton: productData.unitsPerCarton ?? null,
        weight: productData.weight ?? null,
        length: productData.length ?? null,
        width: productData.width ?? null,
        height: productData.height ?? null,
        inStock: productData.inStock ?? true,
        isActive: productData.isActive ?? true,
        tag: productData.tag ?? null,
        package: normalizePackage(productData.package) ?? null,
        metaTitle: productData.metaTitle ?? null,
        metaDescription: productData.metaDescription ?? null,
        metaKeyword: productData.metaKeyword ?? null,
        brand: brand ?? null,
        categories,
      });

      await productRepository.save(product);

      // Return the created product with relations
      const createdProduct = await productRepository.findOne({
        where: { id: product.id },
        relations: ["categories", "brand"],
      });

      res.status(201).json(formatProductResponse(createdProduct));
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Get All Products (Public)

  getProducts: async (req: Request, res: Response) => {
    try {
      const { category, active, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

      // 1. First get the product IDs that match our filters
      const baseQuery = productRepository
        .createQueryBuilder("product")
        .select("product.id", "id");

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

      const total = await baseQuery.getCount();

      const productIds = (await baseQuery.clone().offset(skip).limit(take).getRawMany()).map(
        (p) => p.id
      );

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
      const products = await productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.categories", "category")
        .leftJoinAndSelect("product.brand", "brand")
        .where("product.id IN (:...productIds)", { productIds })
        .getMany();

      // 4. Transform response to include only categoryIds
      const response = products.map((product) => formatProductResponse(product));

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
        relations: ["categories", "brand"],
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
        relations: ["categories", "brand"],
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
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
          })
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
            qb.where("product.title ILIKE :q", { q: `%${q}%` })
              .orWhere("product.summary ILIKE :q", { q: `%${q}%` })
              .orWhere("product.model ILIKE :q", { q: `%${q}%` })
              .orWhere("product.tag ILIKE :q", { q: `%${q}%` });
          })
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
      const uploadedFile = (req as any).file as { buffer: Buffer } | undefined;
      if (!uploadedFile || !uploadedFile.buffer) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const workbook = XLSX.read(uploadedFile.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: ProductRow[] = XLSX.utils.sheet_to_json(sheet, {
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
      const createdProducts: Array<{ title: string; id: string }> = [];
      const updatedProducts: Array<{ title: string; id: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const title = row.title?.toString().trim();
        if (!title) {
          errors.push({ row: i + 2, error: "Missing title" });
          continue;
        }

        const model = row.model?.toString().trim() || null;
        const price = toNum(row.price);
        if (price === null) {
          errors.push({ row: i + 2, error: "Invalid price" });
          continue;
        }

        const quantityStr = row.quantity?.toString().trim() ?? "0";
        const categoryIds = splitIds(row.categoryIds);
        let categories: Category[] | null = null;
        if (categoryIds.length > 0) {
          categories = await categoryRepository.find({ where: { id: In(categoryIds) } });
          if (categories.length !== categoryIds.length) {
            errors.push({ row: i + 2, error: "Invalid categoryIds" });
            continue;
          }
        }

        const weight = toNum(row.weight);
        const length = toNum(row.length);
        const width = toNum(row.width);
        const height = toNum(row.height);
        const images = normalizeImages(row.images);

        // Upsert by model if provided, else by title
        const existing = await productRepository.findOne({
          where: model ? [{ model }, { title }] : [{ title }],
          relations: ["categories", "brand"],
        });

        const baseData: Partial<Product> = {
          model,
          title,
          summary: row.summary || "",
          price,
          discountPrice: price,
          wholesalePrice: null,
          quantity: quantityStr,
          wholesaleOrderQuantity: null,
          unitsPerCarton: null,
          weight,
          length,
          width,
          height,
          inStock: true,
          isActive: true,
          tag: row.tag ? row.tag.toString().trim() : null,
          metaTitle: row.metaTitle || null,
          metaDescription: row.metaDescription || null,
          metaKeyword: row.metaKeyword || null,
        };

        if (images.length) {
          (baseData as any).images = images;
        }

        if (existing) {
          Object.assign(existing, baseData);
          if (categories !== null) {
            existing.categories = categories;
          }
          if (!images.length) {
            // preserve existing images when none provided
            existing.images = existing.images;
          }
          await productRepository.save(existing);
          updated += 1;
          updatedProducts.push({ title: existing.title, id: existing.id });
        } else {
          const newProduct = productRepository.create({
            ...baseData,
            images: images.length ? images : [],
            categories: categories ?? [],
            brand: null,
          });
          await productRepository.save(newProduct);
          created += 1;
          createdProducts.push({ title: newProduct.title, id: newProduct.id });
        }
      }

      res.status(200).json({
        message: "Import completed",
        created,
        updated,
        errors,
        createdProducts,
        updatedProducts,
      });
    } catch (error) {
      console.error("Product import error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  //Update product (Admin only)
  updateProduct: async (req: Request, res: Response) => {
    try {
      const product = await productRepository.findOne({
        where: { id: req.params.id },
        relations: ["categories", "brand"], // This ensures relations are loaded
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      const updateData = new UpdateProductDto();
      Object.assign(updateData, req.body);

      const errors = await validate(updateData);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Update categories if provided
      if (updateData.categoryIds) {
        // Find categories with proper typing
        const categories = (await categoryRepository.find({
          where: { id: In(updateData.categoryIds) },
        })) as Category[]; // Explicit type assertion

        if (categories.length !== updateData.categoryIds.length) {
          res
            .status(400)
            .json({ message: "One or more category IDs are invalid" });
          return;
        }

        // Clear existing categories and set new ones
        product.categories = categories;
      }

      if (updateData.brandId) {
        const brand = await brandRepository.findOne({
          where: { id: updateData.brandId },
        });

        if (!brand) {
          res.status(400).json({ message: "Invalid brand ID" });
          return;
        }

        product.brand = brand;
      }

      // Update other fields (excluding categories which we handled above)
      const { categoryIds, brandId, ...rest } = updateData;
      Object.assign(product, {
        ...rest,
        images: rest.images ? normalizeImages(rest.images) : product.images,
        package:
          rest.package !== undefined
            ? normalizePackage(rest.package) ?? null
            : product.package,
      });
      product.discountPrice = product.discountPrice ?? product.price;

      await productRepository.save(product);

      // Return the updated product with categories
      const updatedProduct = await productRepository.findOne({
        where: { id: product.id },
        relations: ["categories", "brand"],
      });

      res.status(200).json(formatProductResponse(updatedProduct));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
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

  // Upload Product Image (Admin only)
  //under work
  // uploadImage: async (req: Request, res: Response) => {
  //   try {
  //     if (!req.file) {
  //       return res.status(400).json({ message: "No file uploaded" });
  //     }

  //     // In production, you would upload to S3/Cloudinary/etc.
  //     const imagePath = `/uploads/${req.file.filename}`;

  //     return res.status(200).json({
  //       message: "Image uploaded successfully",
  //       imagePath,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // },

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
      }

      const [products, total] = await productRepository.findAndCount({
        where: {
          categories: { id: category.id },
          isActive: true,
        },
        relations: ["categories", "brand"],
        take,
        skip,
        order: { createdAt: "DESC" },
      });

      const formattedProducts = products.map((product) =>
        formatProductResponse(product)
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
        relations: ["categories", "brand"],
        take,
        skip,
        order: { createdAt: "DESC" },
      });

      const formattedProducts = products.map((product) =>
        formatProductResponse(product)
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
