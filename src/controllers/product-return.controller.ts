import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { ProductReturn } from "../entities/product-return.entity";
import {
  CreateProductReturnDto,
  UpdateProductReturnDto,
} from "../dto/product-return.dto";

const productReturnRepository = AppDataSource.getRepository(ProductReturn);

export const ProductReturnController = {
  createProductReturn: async (req: Request, res: Response) => {
    try {
      const productReturnData = new CreateProductReturnDto();

      Object.assign(productReturnData, req.body);

      const errors = await validate(productReturnData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const productReturn = productReturnRepository.create({
        orderId: productReturnData.orderId.trim(),
        orderDate: productReturnData.orderDate
          ? new Date(productReturnData.orderDate)
          : null,
        customer: productReturnData.customer?.trim() || null,
        firstName: productReturnData.firstName.trim(),
        lastName: productReturnData.lastName.trim(),
        email: productReturnData.email.trim(),
        telephone: productReturnData.telephone?.trim() || null,
        product: productReturnData.product.trim(),
        model: productReturnData.model.trim(),
        quantity: productReturnData.quantity,
        returnReason: productReturnData.returnReason?.trim() || null,
        opened: productReturnData.opened,
        comment: productReturnData.comment?.trim() || null,
        returnAction: productReturnData.returnAction?.trim() || null,
        returnStatus: productReturnData.returnStatus?.trim() || null,
      });

      await productReturnRepository.save(productReturn);

      res.status(201).json(productReturn);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getProductReturns: async (req: Request, res: Response) => {
    try {
      const {
        search,
        returnId,
        orderId,
        customer,
        product,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(parseInt(page as string, 10) || 1, 1);

      const take = Math.max(parseInt(limit as string, 10) || 10, 1);

      const skip = (currentPage - 1) * take;

      const query = productReturnRepository.createQueryBuilder("productReturn");

      if (search && String(search).trim()) {
        const searchValue = `%${String(search).trim()}%`;

        query.andWhere(
          `(
            productReturn.orderId ILIKE :search
            OR productReturn.customer ILIKE :search
            OR productReturn.product ILIKE :search
            OR productReturn.model ILIKE :search
            OR productReturn.firstName ILIKE :search
            OR productReturn.lastName ILIKE :search
            OR productReturn.email ILIKE :search
          )`,
          { search: searchValue },
        );
      }

      if (returnId && String(returnId).trim()) {
        query.andWhere("productReturn.id::text ILIKE :returnId", {
          returnId: `%${String(returnId).trim()}%`,
        });
      }

      if (orderId && String(orderId).trim()) {
        query.andWhere("productReturn.orderId ILIKE :orderId", {
          orderId: `%${String(orderId).trim()}%`,
        });
      }

      if (customer && String(customer).trim()) {
        query.andWhere("productReturn.customer ILIKE :customer", {
          customer: `%${String(customer).trim()}%`,
        });
      }

      if (product && String(product).trim()) {
        query.andWhere("productReturn.product ILIKE :product", {
          product: `%${String(product).trim()}%`,
        });
      }

      query.orderBy("productReturn.createdAt", "DESC");

      const [productReturns, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: productReturns,
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getProductReturnById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const productReturn = await productReturnRepository.findOne({
        where: { id },
      });

      if (!productReturn) {
        res.status(404).json({
          message: "Product return not found",
        });
        return;
      }

      res.status(200).json(productReturn);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateProductReturn: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const productReturn = await productReturnRepository.findOne({
        where: { id },
      });

      if (!productReturn) {
        res.status(404).json({
          message: "Product return not found",
        });
        return;
      }

      const productReturnData = new UpdateProductReturnDto();

      Object.assign(productReturnData, req.body);

      const errors = await validate(productReturnData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (productReturnData.orderId !== undefined) {
        productReturn.orderId = productReturnData.orderId.trim();
      }

      if (productReturnData.orderDate !== undefined) {
        productReturn.orderDate = productReturnData.orderDate
          ? new Date(productReturnData.orderDate)
          : null;
      }

      if (productReturnData.customer !== undefined) {
        productReturn.customer = productReturnData.customer.trim() || null;
      }

      if (productReturnData.firstName !== undefined) {
        productReturn.firstName = productReturnData.firstName.trim();
      }

      if (productReturnData.lastName !== undefined) {
        productReturn.lastName = productReturnData.lastName.trim();
      }

      if (productReturnData.email !== undefined) {
        productReturn.email = productReturnData.email.trim();
      }

      if (productReturnData.telephone !== undefined) {
        productReturn.telephone = productReturnData.telephone.trim() || null;
      }

      if (productReturnData.product !== undefined) {
        productReturn.product = productReturnData.product.trim();
      }

      if (productReturnData.model !== undefined) {
        productReturn.model = productReturnData.model.trim();
      }

      if (productReturnData.quantity !== undefined) {
        productReturn.quantity = productReturnData.quantity;
      }

      if (productReturnData.returnReason !== undefined) {
        productReturn.returnReason =
          productReturnData.returnReason.trim() || null;
      }

      if (productReturnData.opened !== undefined) {
        productReturn.opened = productReturnData.opened;
      }

      if (productReturnData.comment !== undefined) {
        productReturn.comment = productReturnData.comment.trim() || null;
      }

      if (productReturnData.returnAction !== undefined) {
        productReturn.returnAction =
          productReturnData.returnAction.trim() || null;
      }

      if (productReturnData.returnStatus !== undefined) {
        productReturn.returnStatus =
          productReturnData.returnStatus.trim() || null;
      }

      await productReturnRepository.save(productReturn);

      res.status(200).json(productReturn);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteProductReturn: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const productReturn = await productReturnRepository.findOne({
        where: { id },
      });

      if (!productReturn) {
        res.status(404).json({
          message: "Product return not found",
        });
        return;
      }

      await productReturnRepository.remove(productReturn);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};
