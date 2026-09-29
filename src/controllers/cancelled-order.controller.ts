import { Request, Response } from "express";
import { respondError } from "../utils/api-error";
import { listCancelledOrders, getCancelledOrder, addCancelledHistory, archiveCancelledOrders } from "../services/cancelled-order.service";
const handle = (action: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { res.json(await action(req)); } catch (error) { respondError(res, error); }
};
export const CancelledOrderController = {
  list: handle(req => listCancelledOrders(req.query)),
  detail: handle(req => getCancelledOrder(req.params.id)),
  history: handle(req => addCancelledHistory(req.params.id, req.body, req.user.id)),
  bulk: handle(req => archiveCancelledOrders(req.body, req.user.id)),
};
