import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SeoUrl } from "../entities/seo-url.entity";
import { CreateSeoUrlDto, UpdateSeoUrlDto } from "../dto/seo-url.dto";
import { validate } from "class-validator";

const seoUrlRepository = AppDataSource.getRepository(SeoUrl);

export const SeoUrlController = {
  createSeoUrl: async (req: Request, res: Response) => {
    try {
      const seoUrlData = new CreateSeoUrlDto();

      Object.assign(seoUrlData, req.body);

      const errors = await validate(seoUrlData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const seoUrl = seoUrlRepository.create({
        query: seoUrlData.query.trim(),
        keyword: seoUrlData.keyword.trim(),
        store: seoUrlData.store ?? "Default",
        language: seoUrlData.language ?? "English",
      });

      await seoUrlRepository.save(seoUrl);

      res.status(201).json(seoUrl);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getSeoUrls: async (req: Request, res: Response) => {
    try {
      const {
        search,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(
        parseInt(page as string, 10) || 1,
        1,
      );

      const take = Math.max(
        parseInt(limit as string, 10) || 10,
        1,
      );

      const skip = (currentPage - 1) * take;

      const query = seoUrlRepository.createQueryBuilder("seoUrl");

      if (search && String(search).trim()) {
        query.andWhere(
          "(seoUrl.query ILIKE :search OR seoUrl.keyword ILIKE :search)",
          {
            search: `%${String(search).trim()}%`,
          },
        );
      }

      query.orderBy("seoUrl.createdAt", "DESC");

      const [seoUrls, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      res.status(200).json({
        data: seoUrls,
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

  getSeoUrlById: async (req: Request, res: Response) => {
    try {
      const seoUrl = await seoUrlRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!seoUrl) {
        res.status(404).json({
          message: "SEO URL not found",
        });

        return;
      }

      res.status(200).json(seoUrl);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  updateSeoUrl: async (req: Request, res: Response) => {
    try {
      const seoUrl = await seoUrlRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!seoUrl) {
        res.status(404).json({
          message: "SEO URL not found",
        });

        return;
      }

      const updateData = new UpdateSeoUrlDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.query !== undefined) {
        seoUrl.query = updateData.query.trim();
      }

      if (updateData.keyword !== undefined) {
        seoUrl.keyword = updateData.keyword.trim();
      }

      if (updateData.store !== undefined) {
        seoUrl.store = updateData.store;
      }

      if (updateData.language !== undefined) {
        seoUrl.language = updateData.language;
      }

      await seoUrlRepository.save(seoUrl);

      res.status(200).json(seoUrl);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteSeoUrl: async (req: Request, res: Response) => {
    try {
      const seoUrl = await seoUrlRepository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!seoUrl) {
        res.status(404).json({
          message: "SEO URL not found",
        });

        return;
      }

      await seoUrlRepository.remove(seoUrl);

      res.status(204).send();
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};