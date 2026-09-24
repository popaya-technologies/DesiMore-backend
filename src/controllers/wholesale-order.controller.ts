import { Request, Response } from "express";
import {
  createWholesaleRequest,
  changeWholesaleStatus,
} from "../services/wholesale-order.service";
import { respondError } from "../utils/api-error";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { WholesaleOrderRequest } from "../entities/wholesale-order-request.entity";
import { UpdateWholesaleOrderRequestStatusDto } from "../dto/wholesale-order.dto";
import { Between } from "typeorm";

const wholesaleOrderRequestRepository = AppDataSource.getRepository(
  WholesaleOrderRequest,
);

const buildDateRange = (from?: any, to?: any) => {
  if (!from && !to) return undefined;
  const fromStr = Array.isArray(from) ? from[0] : from;
  const toStr = Array.isArray(to) ? to[0] : to;

  let fromDate = fromStr ? new Date(fromStr) : undefined;
  let toDate = toStr ? new Date(toStr) : undefined;

  if (fromDate && isNaN(fromDate.getTime())) fromDate = undefined;
  if (toDate && isNaN(toDate.getTime())) toDate = undefined;

  if (!fromDate && !toDate) return undefined;

  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return Between(fromDate ?? new Date(0), toDate ?? new Date());
};

const toNumber = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

const getPermission = (req: Request, action: string) =>
  req.user?.permissions?.some(
    (permission) =>
      permission.resource === "wholesale-order-request" &&
      permission.action === action,
  );

const formatWholesaleRequestResponse = (
  request: WholesaleOrderRequest | null,
) => {
  if (!request) {
    return null;
  }

  const { items = [], ...rest } = request;
  const normalizedItems = items.map((item) => ({
    ...item,
    wholesalePrice: toNumber(item.wholesalePrice),
    // effectivePricePerCarton is no longer exposed
    total: toNumber(item.total),
  }));

  return {
    ...rest,
    subtotal: toNumber(rest.subtotal),
    tax: toNumber(rest.tax),
    shipping: toNumber(rest.shipping),
    discount: toNumber((rest as any).discount),
    total: toNumber(rest.total),
    items: normalizedItems,
  };
};

export const WholesaleOrderController = {
  createWholesaleOrderRequest: async (req: Request, res: Response) => {
    try {
      res
        .status(201)
        .json(
          formatWholesaleRequestResponse(
            await createWholesaleRequest(req.user.id, req.body),
          ),
        );
    } catch (error) {
      respondError(res, error);
    }
  },

  getMyRequests: async (req: Request, res: Response) => {
    try {
      const { status, from, to, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;
      const where: any = { userId: req.user.id };
      if (status) {
        where.status = status as any;
      }
      const dateRange = buildDateRange(from, to);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      const [requests, total] =
        await wholesaleOrderRequestRepository.findAndCount({
          where,
          relations: ["items"],
          order: { createdAt: "DESC" },
          skip,
          take,
        });

      res.status(200).json({
        data: requests.map((request) =>
          formatWholesaleRequestResponse(request),
        ),
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error("Get wholesale requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllRequests: async (req: Request, res: Response) => {
    try {
      const { status, from, to, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;
      const where: any = {};
      if (status) {
        where.status = status as any;
      }
      const dateRange = buildDateRange(from, to);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      const [requests, total] =
        await wholesaleOrderRequestRepository.findAndCount({
          where,
          relations: ["items", "user"],
          order: { createdAt: "DESC" },
          skip,
          take,
        });

      res.status(200).json({
        data: requests.map((request) =>
          formatWholesaleRequestResponse(request),
        ),
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error("Get all wholesale requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getRequestById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await wholesaleOrderRequestRepository.findOne({
        where: { id },
        relations: ["items", "user"],
      });

      if (!request) {
        res.status(404).json({ message: "Wholesale order request not found" });
        return;
      }

      const canReadAll =
        req.user.userRole === "su" || !!getPermission(req, "read-all");
      const canReadOwn =
        !!getPermission(req, "read") && request.userId === req.user.id;

      if (!canReadAll && !canReadOwn) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      res.status(200).json(formatWholesaleRequestResponse(request));
    } catch (error) {
      console.error("Get wholesale request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateRequestStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateDto = plainToInstance(
        UpdateWholesaleOrderRequestStatusDto,
        req.body,
      );

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const request = await changeWholesaleStatus(
        id,
        updateDto.status,
        updateDto.adminNotes,
      );
      res.json(formatWholesaleRequestResponse(request));
    } catch (error) {
      respondError(res, error);
    }
  },
};
