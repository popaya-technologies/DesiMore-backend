import { Request, Response } from "express";
import { isUUID } from "class-validator";
import { AppDataSource } from "../data-source";
import { MailRequest } from "../entities/mail-request.entity";
import { NewsletterSubscriber } from "../entities/newsletter-subscriber.entity";
import { MailService } from "../services/mail.service";
import { respondError } from "../utils/api-error";
export const MailController = {
  options: async (_req: Request, res: Response) => {
    try {
      const count = await AppDataSource.getRepository(NewsletterSubscriber).countBy({ isActive: true });
      res.json({
        from: [{ value: "default", label: "Default" }],
        to: [{ value: "newsletter_subscribers", label: "All Newsletter Subscribers", count }],
        maxRecipients: 500,
      });
    } catch (error) { respondError(res, error); }
  },
  send: async (req: Request, res: Response) => {
    try { res.json(await new MailService().send(req.body, req.user.id)); }
    catch (error) { respondError(res, error); }
  },
  status: async (req: Request, res: Response) => {
    try {
      const requestId = String(req.params.requestId);
      if (!isUUID(requestId)) { res.status(400).json({ message: "Invalid requestId" }); return; }
      const record = await AppDataSource.getRepository(MailRequest).findOneBy({
        requestId, createdBy: req.user.id,
      });
      if (!record) { res.status(404).json({ message: "Mail request not found" }); return; }
      res.json(record);
    } catch (error) { respondError(res, error); }
  },
};
