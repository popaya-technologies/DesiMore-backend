import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { TaxClass, TaxRate } from "../entities/tax-class.entity";
import { createTaxRate } from "../services/tax-class.service";
import {
  TaxClassService,
  taxClassQuery,
} from "../services/tax-class.service";
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
export const TaxClassController = {
  createRate: handle(async (req, res) => { res.status(201).json(await createTaxRate(req.body)); }),
  rates: handle(async (req, res) => {
    if (Object.keys(req.query).length) throw new ApiError(400, "Tax rate dropdown does not accept query parameters");
    const data = await AppDataSource.getRepository(TaxRate).find({ order: { name: "ASC", id: "ASC" }, take: 10001 });
    if (data.length > 10000) throw new ApiError(400, "Tax rate catalog exceeds dropdown limit");
    res.json({ data });
  }),
  bulk: handle(async (req, res) => { res.json(await new TaxClassService().removeMany(req.body)); }),
  create: handle(async (req, res) => {
    res.status(201).json(await new TaxClassService().save(req.body));
  }),
  update: handle(async (req, res) => {
    res.json(
      await new TaxClassService().save(req.body, String(req.params.id)),
    );
  }),
  remove: handle(async (req, res) => {
    res.json(await new TaxClassService().remove(String(req.params.id)));
  }),
  get: handle(async (req, res) => {
    const row = await AppDataSource.getRepository(TaxClass).findOne({
      where: { id: String(req.params.id) }, relations: ["rules", "rules.taxRate"], order: { rules: { priority: "ASC", id: "ASC" } },
    });
    if (!row) throw new ApiError(404, "Tax class not found");
    res.json(row);
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = taxClassQuery(req.query);
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    res.json({
      data: data.map((row, index) => ({ ...row, no: (page - 1) * limit + index + 1 })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!["csv", "xlsx"].includes(String(format)))
      throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = taxClassQuery(req.query);
    const groups = await qb.take(10001).getMany();
    if (groups.length > 10000)
      throw new ApiError(400, "Narrow filters to export at most 10000 groups");
    const safe = (value: string) =>
      /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const sheet = XLSX.utils.json_to_sheet(
      groups.map((g) => ({
        "Tax Class Title": safe(g.title),
      })),
      { header: ["Tax Class Title"] },
    );
    res.attachment("tax-classes." + format);
    if (format === "csv")
      res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Tax Classes");
      res
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
