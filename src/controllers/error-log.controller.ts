import { Request, Response } from "express";
import { errorLogService } from "../services/error-log.service";
import { ApiError } from "../utils/api-error";

// Do not log log-storage failures through the logger itself.
function failure(res: Response, error: unknown) {
  res.status(error instanceof ApiError ? error.status : 500).json({ message: error instanceof ApiError ? error.message : "Could not access the error log" });
}

export const ErrorLogController = {
  read: async (_req: Request, res: Response) => {
    try { res.json(await errorLogService.read()); } catch (error) { failure(res, error); }
  },
  download: async (_req: Request, res: Response) => {
    try {
      const content = await errorLogService.download();
      res.attachment(`error-log-${new Date().toISOString().slice(0, 10)}.log`);
      res.type("text/plain").send(content);
    } catch (error) { failure(res, error); }
  },
  clear: async (req: Request, res: Response) => {
    try {
      if (req.body?.confirm !== "CLEAR") throw new ApiError(400, "Confirm clearing the error log");
      res.json(await errorLogService.clear());
    } catch (error) { failure(res, error); }
  },
};
