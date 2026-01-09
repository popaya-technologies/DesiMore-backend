import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Message } from "../entities/message.entity";
import { UpsertMessageDto } from "../dto/message.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const messageRepository = AppDataSource.getRepository(Message);

export const MessageController = {
  upsertMessage: async (req: Request, res: Response) => {
    try {
      const dto = plainToInstance(UpsertMessageDto, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
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
};
