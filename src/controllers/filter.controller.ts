import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { FilterGroup } from "../entities/filter.entity";
import {
  FilterService,
  filterQuery,
  filterResponse,
} from "../services/filter.service";
import { ApiError, respondError } from "../utils/api-error";
const handle =
  (action: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try {
      await action(req, res);
    } catch (error) {
      respondError(res, error);
    }
  };
export const FilterController = {
  create: handle(async (req, res) => {
    res.status(201).json(await new FilterService().save(req.body));
  }),
  update: handle(async (req, res) => {
    res.json(await new FilterService().save(req.body, String(req.params.id)));
  }),
  remove: handle(async (req, res) => {
    const result = await AppDataSource.getRepository(FilterGroup).delete(
      String(req.params.id),
    );
    if (!result.affected) throw new ApiError(404, "Filter not found");
    res.json({ message: "Filter deleted successfully" });
  }),
  get: handle(async (req, res) => {
    const row = await AppDataSource.getRepository(FilterGroup).findOneBy({
      id: String(req.params.id),
    });
    if (!row) throw new ApiError(404, "Filter not found");
    res.json(filterResponse(row));
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = filterQuery(req.query);
    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    res.json({
      data: rows.map(filterResponse),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!["csv", "xlsx"].includes(String(format)))
      throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = filterQuery(req.query);
    const filters = await qb.take(10001).getMany();
    if (filters.length > 10000)
      throw new ApiError(400, "Narrow filters to export at most 10000 filters");
    const safe = (value: string) =>
      /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const sheet = XLSX.utils.json_to_sheet(
      filters.map((o) => ({
        "Filter Group": safe(o.name),
        "Sort Order": o.sortOrder,
      })),
      { header: ["Filter Group", "Sort Order"] },
    );
    res.attachment("filters." + format);
    if (format === "csv")
      res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Filters");
      res
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
