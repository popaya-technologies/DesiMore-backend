import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Product } from "../entities/product.entity";
import { CreateProductDto, UpdateProductDto } from "../dto/product.dto";
import { validate } from "class-validator";
import { Brackets, In } from "typeorm";
import { Category } from "../entities/category.entity";
import { Brand } from "../entities/brand.entity";

const productRepository = AppDataSource.getRepository(Product);
const categoryRepository = AppDataSource.getRepository(Category);
const brandRepository = AppDataSource.getRepository(Brand);

const formatProductResponse = (product: Product) => {
  if (!product) {
    return null;
  }

  const { categories = [], brand, ...productData } = product;
  const normalizedProduct = {
    ...productData,
    discountPrice: productData.discountPrice ?? productData.price,
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
      Object.assign(productData, req.body);

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
        images: productData.images,
        price: productData.price,
        discountPrice: productData.discountPrice ?? productData.price,
        wholesalePrice: productData.wholesalePrice ?? null,
        summary: productData.summary,
        quantity: productData.quantity || "0",
        wholesaleOrderQuantity: productData.wholesaleOrderQuantity ?? null,
        unitsPerCarton: productData.unitsPerCarton ?? null,
        inStock: productData.inStock ?? true,
        isActive: productData.isActive ?? true,
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
      const { category, active } = req.query;

      // 1. First get the product IDs that match our filters
      const productIdsQuery = productRepository
        .createQueryBuilder("product")
        .select("product.id", "id");

      if (category) {
        productIdsQuery
          .innerJoin("product.categories", "category")
          .andWhere("category.id = :categoryId", { categoryId: category });
      }

      if (active === "true") {
        productIdsQuery.andWhere("product.isActive = :isActive", {
          isActive: true,
        });
      }

      const productIds = (await productIdsQuery.getRawMany()).map((p) => p.id);

      // 2. If no products found, return empty array
      if (productIds.length === 0) {
        res.status(200).json([]);
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

      res.status(200).json(response);
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
      Object.assign(product, rest);
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
