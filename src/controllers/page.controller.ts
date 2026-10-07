import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { Page } from "../entities/page.entity";
import {
  pageQuery,
  pageResponse,
  validatePageInput,
} from "../services/page.service";
import { ApiError, respondError } from "../utils/api-error";

const safeCell = (value: string) => /^[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
const repository = () => AppDataSource.getRepository(Page);
export const PageController = {
  create: async (req: Request, res: Response) => {
    try {
      const dto = await validatePageInput(req.body, true);
      const saved = await repository().save(
        repository().create(dto as Partial<Page>),
      );
      res.status(201).json(pageResponse(saved));
    } catch (error) {
      respondError(res, error);
    }
  },
  list: async (req: Request, res: Response) => {
    try {
      const { qb, page, limit } = pageQuery(req.query);
      const [rows, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      res.json({
        data: rows.map(pageResponse),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      respondError(res, error);
    }
  },
  get: async (req: Request, res: Response) => {
    try {
      const page = await repository().findOneBy({
        id: String(req.params.id),
      });
      if (!page) throw new ApiError(404, "Page not found");
      res.json(pageResponse(page));
    } catch (error) {
      respondError(res, error);
    }
  },
  update: async (req: Request, res: Response) => {
    try {
      const dto = await validatePageInput(req.body, false);
      // Update only supplied fields; media replacement is atomic.
      const result = await repository().update(
        String(req.params.id),
        dto as Partial<Page>,
      );
      if (!result.affected) throw new ApiError(404, "Page not found");
      const page = await repository().findOneBy({
        id: String(req.params.id),
      });
      if (!page) throw new ApiError(404, "Page not found");
      res.json(pageResponse(page));
    } catch (error) {
      respondError(res, error);
    }
  },
  remove: async (req: Request, res: Response) => {
    try {
      const result = await repository().delete(String(req.params.id));
      if (!result.affected) throw new ApiError(404, "Page not found");
      res.json({ message: "Page deleted successfully" });
    } catch (error) {
      respondError(res, error);
    }
  },
  export: async (req: Request, res: Response) => {
    try {
      const format = req.query.format ?? "csv";
      if (!["csv", "xlsx"].includes(String(format)))
        throw new ApiError(400, "Export format must be csv or xlsx");
      const { qb } = pageQuery(req.query);
      const pages = await qb.take(10001).getMany();
      if (pages.length > 10000)
        throw new ApiError(
          400,
          "Narrow filters to export at most 10000 pages",
        );
      const rows = pages.map((b) => ({
        "Page Title": safeCell(b.title),
        Slug: safeCell(b.slug),
        Placement: b.bottom,
        "Sort Order": b.sortOrder,
        Status: b.isActive ? "Enabled" : "Disabled",
        "Created At": b.createdAt.toISOString(),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows, {
        header: ["Page Title", "Slug", "Placement", "Sort Order", "Status", "Created At"],
      });
      res.attachment("pages." + format);
      if (format === "csv")
        res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
      else {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Pages");
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
