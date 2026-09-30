import { Request, Response } from "express";
import {
  approvalResponse,
  createCustomerApproval,
  customerApprovalQuery,
  getCustomerApproval,
  reviewCustomerApproval,
} from "../services/customer-approval.service";
import { ApiError, respondError } from "../utils/api-error";

const handle =
  (action: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      await action(req, res);
    } catch (error) {
      respondError(res, error);
    }
  };

export const CustomerApprovalController = {
  list: handle(async (req, res) => {
    const { qb, page, limit } = customerApprovalQuery(
      req.query as Record<string, unknown>,
    );

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    res.json({
      data: rows.map(approvalResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    });
  }),

  get: handle(async (req, res) => {
    const approval = await getCustomerApproval(String(req.params.id));

    res.json(approval);
  }),

  create: handle(async (req, res) => {
    const approval = await createCustomerApproval(req.body);

    res.status(201).json(approval);
  }),

  approve: handle(async (req, res) => {
    const actor = req.user?.id;

    if (!actor) {
      throw new ApiError(401, "Authenticated user not found");
    }

    const approval = await reviewCustomerApproval(
      String(req.params.id),
      "approved",
      req.body,
      actor,
    );

    res.json(approval);
  }),

  reject: handle(async (req, res) => {
    const actor = req.user?.id;

    if (!actor) {
      throw new ApiError(401, "Authenticated user not found");
    }

    const approval = await reviewCustomerApproval(
      String(req.params.id),
      "rejected",
      req.body,
      actor,
    );

    res.json(approval);
  }),
};
