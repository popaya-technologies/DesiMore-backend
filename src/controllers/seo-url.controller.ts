import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SeoUrl } from "../entities/seo-url.entity";
import { CreateSeoUrlDto, UpdateSeoUrlDto } from "../dto/seo-url.dto";
import { validate } from "class-validator";
import { isUUID } from "class-validator";

const seoUrlRepository = AppDataSource.getRepository(SeoUrl);

const duplicateMessage = (error: any) => {
  if (error?.code !== "23505") return null;
  return error?.constraint === "UQ_seo_url_query_scope"
    ? "This target already has an SEO URL for the selected store and language"
    : "This SEO keyword already exists for the selected store and language";
};

const cleanScope = (value: string | undefined, fallback: string) =>
  value === undefined ? fallback : value.trim();

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
        store: cleanScope(seoUrlData.store, "Default"),
        language: cleanScope(seoUrlData.language, "English"),
      });

      await seoUrlRepository.save(seoUrl);

      res.status(201).json(seoUrl);
    } catch (error: any) {
      const message = duplicateMessage(error);
      if (message) {
        res.status(409).json({ message });
        return;
      }
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

      if (!/^\d+$/.test(String(page)) || !/^\d+$/.test(String(limit))) {
        res.status(400).json({ message: "Page and limit must be positive integers" });
        return;
      }
      const currentPage = Number(page);
      const take = Number(limit);
      if (currentPage < 1 || take < 1 || take > 100) {
        res.status(400).json({ message: "Page must be positive and limit must be between 1 and 100" });
        return;
      }

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

  resolveSeoUrl: async (req: Request, res: Response) => {
    try {
      const keyword = String(req.params.keyword ?? "").trim().toLowerCase();
      const store = cleanScope(typeof req.query.store === "string" ? req.query.store : undefined, "Default");
      const language = cleanScope(typeof req.query.language === "string" ? req.query.language : undefined, "English");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(keyword) || keyword.length > 500 || !store || !language) {
        res.status(400).json({ message: "Invalid SEO URL lookup" });
        return;
      }
      const seoUrl = await seoUrlRepository.findOne({ where: { keyword, store, language } });
      if (!seoUrl) {
        res.status(404).json({ message: "SEO URL not found" });
        return;
      }
      const target = /^([a-z_]+)_id=(.+)$/.exec(seoUrl.query);
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      res.status(200).json({
        keyword: seoUrl.keyword,
        query: seoUrl.query,
        store: seoUrl.store,
        language: seoUrl.language,
        target: target ? { type: target[1], id: target[2] } : null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getSeoUrlById: async (req: Request, res: Response) => {
    try {
      if (!isUUID(req.params.id)) {
        res.status(400).json({ message: "Invalid SEO URL ID" });
        return;
      }
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
      if (!isUUID(req.params.id)) {
        res.status(400).json({ message: "Invalid SEO URL ID" });
        return;
      }
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
        seoUrl.store = updateData.store.trim();
      }

      if (updateData.language !== undefined) {
        seoUrl.language = updateData.language.trim();
      }

      await seoUrlRepository.save(seoUrl);

      res.status(200).json(seoUrl);
    } catch (error: any) {
      const message = duplicateMessage(error);
      if (message) {
        res.status(409).json({ message });
        return;
      }
      console.error(error);

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteSeoUrl: async (req: Request, res: Response) => {
    try {
      if (!isUUID(req.params.id)) {
        res.status(400).json({ message: "Invalid SEO URL ID" });
        return;
      }
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
