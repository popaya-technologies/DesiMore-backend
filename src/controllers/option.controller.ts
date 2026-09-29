import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { CatalogOption } from "../entities/option.entity";
import { CATALOG_OPTION_TYPES } from "../dto/option.dto";
import { OptionService, optionQuery, optionResponse } from "../services/option.service";
import { ApiError, respondError } from "../utils/api-error";
const handle = (action: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try { await action(req, res); } catch (error) { respondError(res, error); }
  };
export const OptionController = {
  create: handle(async (req, res) => { res.status(201).json(await new OptionService().save(req.body)); }),
  update: handle(async (req, res) => { res.json(await new OptionService().save(req.body, String(req.params.id))); }),
  remove: handle(async (req, res) => {
    const result = await AppDataSource.getRepository(CatalogOption).delete(String(req.params.id));
    if (!result.affected) throw new ApiError(404, "Option not found");
    res.json({ message: "Option deleted successfully" });
  }),
  get: handle(async (req, res) => {
    const row = await AppDataSource.getRepository(CatalogOption).findOneBy({ id: String(req.params.id) });
    if (!row) throw new ApiError(404, "Option not found");
    res.json(optionResponse(row));
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = optionQuery(req.query);
    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    res.json({ data: rows.map(optionResponse), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }),
  options: handle(async (_req, res) => {
    res.json({ types: CATALOG_OPTION_TYPES.map(value => ({ value,
      label: value === "datetime" ? "Date & Time" : value.charAt(0).toUpperCase() + value.slice(1) })),
      defaults: { type: "select", sortOrder: 0 } });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!["csv", "xlsx"].includes(String(format))) throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = optionQuery(req.query);
    const options = await qb.take(10001).getMany();
    if (options.length > 10000) throw new ApiError(400, "Narrow filters to export at most 10000 options");
    const safe = (value: string) => /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const sheet = XLSX.utils.json_to_sheet(options.map(o => ({
      "Option Name": safe(o.name), "Sort Order": o.sortOrder,
    })), { header: ["Option Name", "Sort Order"] });
    res.attachment("options." + format);
    if (format === "csv") res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Options");
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
