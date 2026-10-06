import { Request, Response } from "express";
import { uploadManagementService } from "../services/upload-management.service";
import { respondError } from "../utils/api-error";

export const UploadManagementController = {
  list: async (req: Request, res: Response) => {
    try {
      res.json(await uploadManagementService.list(req.query));
    } catch (error) {
      respondError(res, error);
    }
  },
  remove: async (req: Request, res: Response) => {
    try {
      res.json(await uploadManagementService.remove(req.body));
    } catch (error) {
      respondError(res, error);
    }
  },
};
