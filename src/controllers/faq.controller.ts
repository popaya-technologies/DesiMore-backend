import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { FAQ } from "../entities/faq.entity";
import { CreateFaqDto, UpdateFaqDto } from "../dto/faq.dto";
import { validate } from "class-validator";

const faqRepository = AppDataSource.getRepository(FAQ);

export const FaqController = {
  createFaq: async (req: Request, res: Response) => {
    try {
      const faqData = new CreateFaqDto();

      Object.assign(faqData, req.body);

      const errors = await validate(faqData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const faq = faqRepository.create({
        title: faqData.title.trim(),
        description: faqData.description,
        sortOrder: faqData.sortOrder,
        isActive: faqData.isActive ?? true,
      });

      await faqRepository.save(faq);

      res.status(201).json(faq);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getFaqs: async (req: Request, res: Response) => {
    try {
      const {
        search,
        startDate,
        endDate,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(parseInt(page as string, 10) || 1, 1);

      const take = Math.max(parseInt(limit as string, 10) || 10, 1);

      const skip = (currentPage - 1) * take;

      const query = faqRepository.createQueryBuilder("faq");

      if (search && String(search).trim()) {
        query.andWhere("faq.title ILIKE :search", {
          search: `%${String(search).trim()}%`,
        });
      }

      if (startDate) {
        query.andWhere("faq.createdAt >= :startDate", {
          startDate: `${startDate} 00:00:00`,
        });
      }

      if (endDate) {
        query.andWhere("faq.createdAt <= :endDate", {
          endDate: `${endDate} 23:59:59`,
        });
      }

      query.orderBy("faq.sortOrder", "ASC").addOrderBy("faq.createdAt", "DESC");

      const [faqs, total] = await query.skip(skip).take(take).getManyAndCount();

      res.status(200).json({
        data: faqs,
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

  getFaqById: async (req: Request, res: Response) => {
    try {
      const faq = await faqRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!faq) {
        res.status(404).json({
          message: "FAQ not found",
        });
        return;
      }

      res.status(200).json(faq);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateFaq: async (req: Request, res: Response) => {
    try {
      const faq = await faqRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!faq) {
        res.status(404).json({
          message: "FAQ not found",
        });
        return;
      }

      const updateData = new UpdateFaqDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.title !== undefined) {
        faq.title = updateData.title.trim();
      }

      if (updateData.description !== undefined) {
        faq.description = updateData.description;
      }

      if (updateData.sortOrder !== undefined) {
        faq.sortOrder = updateData.sortOrder;
      }

      if (updateData.isActive !== undefined) {
        faq.isActive = updateData.isActive;
      }

      await faqRepository.save(faq);

      res.status(200).json(faq);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteFaq: async (req: Request, res: Response) => {
    try {
      const faq = await faqRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!faq) {
        res.status(404).json({
          message: "FAQ not found",
        });
        return;
      }

      await faqRepository.remove(faq);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};
