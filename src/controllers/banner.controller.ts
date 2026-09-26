import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { Banner } from "../entities/banner.entity";
import {
  bannerQuery,
  bannerResponse,
  validateBannerInput,
} from "../services/banner.service";
import { ApiError, respondError } from "../utils/api-error";

const repository = () => AppDataSource.getRepository(Banner);
export const BannerController = {
  create: async (req: Request, res: Response) => {
    try {
      const dto = await validateBannerInput(req.body, true);
      const saved = await repository().save(
        repository().create(dto as Partial<Banner>),
      );
      res.status(201).json(bannerResponse(saved));
    } catch (error) {
      respondError(res, error);
    }
  },
  list: async (req: Request, res: Response) => {
    try {
      const { qb, page, limit } = bannerQuery(req.query);
      const [rows, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      res.json({
        data: rows.map(bannerResponse),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      respondError(res, error);
    }
  },
  get: async (req: Request, res: Response) => {
    try {
      const banner = await repository().findOneBy({
        id: String(req.params.id),
      });
      if (!banner) throw new ApiError(404, "Banner not found");
      res.json(bannerResponse(banner));
    } catch (error) {
      respondError(res, error);
    }
  },
  update: async (req: Request, res: Response) => {
    try {
      const dto = await validateBannerInput(req.body, false);
      // Update only supplied columns; slide replacement is one atomic JSONB write.
      const result = await repository().update(
        String(req.params.id),
        dto as Partial<Banner>,
      );
      if (!result.affected) throw new ApiError(404, "Banner not found");
      const banner = await repository().findOneBy({
        id: String(req.params.id),
      });
      if (!banner) throw new ApiError(404, "Banner not found");
      res.json(bannerResponse(banner));
    } catch (error) {
      respondError(res, error);
    }
  },
  remove: async (req: Request, res: Response) => {
    try {
      const result = await repository().delete(String(req.params.id));
      if (!result.affected) throw new ApiError(404, "Banner not found");
      res.json({ message: "Banner deleted successfully" });
    } catch (error) {
      respondError(res, error);
    }
  },
  export: async (req: Request, res: Response) => {
    try {
      const format = req.query.format ?? "csv";
      if (!["csv", "xlsx"].includes(String(format)))
        throw new ApiError(400, "Export format must be csv or xlsx");
      const { qb } = bannerQuery(req.query);
      const banners = await qb.take(10001).getMany();
      if (banners.length > 10000)
        throw new ApiError(
          400,
          "Narrow filters to export at most 10000 banners",
        );
      const rows = banners.map((b) => ({
        "Banner Name": /^[=+\-@\t\r\n]/.test(b.name) ? "'" + b.name : b.name,
        Slides: b.slides.length,
        Status: b.isActive ? "Enabled" : "Disabled",
        "Created At": b.createdAt.toISOString(),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows, {
        header: ["Banner Name", "Slides", "Status", "Created At"],
      });
      res.attachment("banners." + format);
      if (format === "csv")
        res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
      else {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Banners");
        res
          .type(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          )
          .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
      }
    } catch (error) {
      respondError(res, error);
    }
  },
};
