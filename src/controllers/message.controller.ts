import { Request, Response } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { Message } from "../entities/message.entity";
import { Product } from "../entities/product.entity";
import {
  LinkProductsDto,
  SetProductsDto,
  UpsertMessageDto,
} from "../dto/message.dto";
import { formatProductResponse } from "./product.controller";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const messageRepository = AppDataSource.getRepository(Message);
const productRepository = AppDataSource.getRepository(Product);

const VALIDATION_OPTIONS = {
  whitelist: true,
  forbidUnknownValues: true,
  validationError: { target: false },
};

// Resolves products for a set of ids and reports any id that does not exist,
// so a bad payload comes back as a 400 instead of a raw FK violation.
const resolveProducts = async (productIds: string[]) => {
  const unique = Array.from(new Set(productIds));

  if (unique.length === 0) {
    return { products: [] as Product[], missing: [] as string[] };
  }

  const products = await productRepository.find({
    where: { id: In(unique) },
  });

  const found = new Set(products.map((p) => p.id));
  const missing = unique.filter((id) => !found.has(id));

  return { products, missing };
};

export const MessageController = {
  upsertMessage: async (req: Request, res: Response) => {
    try {
      const dto = plainToInstance(UpsertMessageDto, req.body);
      const errors = await validate(dto, VALIDATION_OPTIONS);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const existing = await messageRepository.findOne({
        where: { key: dto.key },
      });

      if (existing) {
        existing.message = dto.message;
        await messageRepository.save(existing);
        res.status(200).json(existing);
        return;
      }

      const created = messageRepository.create({
        key: dto.key,
        message: dto.message,
      });
      await messageRepository.save(created);
      res.status(201).json(created);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getMessageByKey: async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const existing = await messageRepository.findOne({
        where: { key },
      });

      if (!existing) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      res.status(200).json(existing);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get all messages (public)
  getAllMessages: async (_req: Request, res: Response) => {
    try {
      const messages = await messageRepository.find({
        order: { createdAt: "DESC" },
      });
      res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Products linked to a ticker/tipper message key (public)
  getMessageProducts: async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { limit = "10", page = "1" } = req.query;

      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const currentPage = Math.max(parseInt(page as string, 10) || 1, 1);
      const skip = (currentPage - 1) * take;

      const message = await messageRepository.findOne({ where: { key } });

      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const [products, total] = await productRepository.findAndCount({
        where: {
          messages: { id: message.id },
          isActive: true,
        },
        relations: ["categories", "brand"],
        take,
        skip,
        order: { createdAt: "DESC" },
      });

      res.status(200).json({
        data: products.map((product) => formatProductResponse(product)),
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Attach products to a message key without dropping the existing ones
  addProductsToMessage: async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const dto = plainToInstance(LinkProductsDto, req.body);
      const errors = await validate(dto, VALIDATION_OPTIONS);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const message = await messageRepository.findOne({
        where: { key },
        relations: ["products"],
      });

      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const { products, missing } = await resolveProducts(dto.productIds);
      if (missing.length > 0) {
        res.status(400).json({
          message: "Some products were not found",
          productIds: missing,
        });
        return;
      }

      const existingIds = new Set((message.products || []).map((p) => p.id));
      const additions = products.filter((p) => !existingIds.has(p.id));

      if (additions.length > 0) {
        message.products = [...(message.products || []), ...additions];
        await messageRepository.save(message);
      }

      res.status(200).json({
        key: message.key,
        added: additions.map((p) => p.id),
        productIds: (message.products || []).map((p) => p.id),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Replace the full product set for a message key
  setMessageProducts: async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const dto = plainToInstance(SetProductsDto, req.body);
      const errors = await validate(dto, VALIDATION_OPTIONS);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const message = await messageRepository.findOne({
        where: { key },
        relations: ["products"],
      });

      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const { products, missing } = await resolveProducts(dto.productIds);
      if (missing.length > 0) {
        res.status(400).json({
          message: "Some products were not found",
          productIds: missing,
        });
        return;
      }

      message.products = products;
      await messageRepository.save(message);

      res.status(200).json({
        key: message.key,
        productIds: products.map((p) => p.id),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Detach a single product from a message key
  removeProductFromMessage: async (req: Request, res: Response) => {
    try {
      const { key, productId } = req.params;

      const message = await messageRepository.findOne({
        where: { key },
        relations: ["products"],
      });

      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      const linked = message.products || [];
      if (!linked.some((p) => p.id === productId)) {
        res
          .status(404)
          .json({ message: "Product is not linked to this message" });
        return;
      }

      message.products = linked.filter((p) => p.id !== productId);
      await messageRepository.save(message);

      res.status(200).json({
        key: message.key,
        productIds: message.products.map((p) => p.id),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
