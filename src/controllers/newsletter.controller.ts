import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  SubscribeNewsletterDto,
  UpdateNewsletterPreferenceDto,
} from "../dto/newsletter.dto";
import { NewsletterService } from "../services/newsletter.service";
import { ApiError, respondError } from "../utils/api-error";

const validated = async <T extends object>(type: new () => T, body: unknown) => {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  if (errors.length) throw new ApiError(400, "Invalid newsletter data", errors);
  return dto;
};

export const NewsletterController = {
  subscribe: async (req: Request, res: Response) => {
    try {
      const dto = await validated(SubscribeNewsletterDto, req.body);
      const preference = await new NewsletterService().setPreference(dto.email, true);
      res.status(200).json({
        ...preference,
        message: "You have been subscribed to the newsletter.",
      });
    } catch (error) {
      respondError(res, error);
    }
  },

  getMyPreference: async (req: Request, res: Response) => {
    try {
      res.json(await new NewsletterService().getPreference(req.user.email));
    } catch (error) {
      respondError(res, error);
    }
  },

  updateMyPreference: async (req: Request, res: Response) => {
    try {
      const dto = await validated(UpdateNewsletterPreferenceDto, req.body);
      const preference = await new NewsletterService().setPreference(
        req.user.email,
        dto.subscribed,
      );
      res.json({
        ...preference,
        message: dto.subscribed
          ? "Your newsletter subscription has been enabled."
          : "Your newsletter subscription has been disabled.",
      });
    } catch (error) {
      respondError(res, error);
    }
  },
};
