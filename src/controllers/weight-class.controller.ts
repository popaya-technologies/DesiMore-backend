import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { WeightClass } from "../entities/weight-class.entity";
import {
  WeightClassService,
  weightClassQuery,
} from "../services/weight-class.service";
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
export const WeightClassController = {
  bulk: handle(async (req, res) => { res.json(await new WeightClassService().removeMany(req.body)); }),
  create: handle(async (req, res) => {
    res.status(201).json(await new WeightClassService().save(req.body));
  }),
  update: handle(async (req, res) => {
    res.json(
      await new WeightClassService().save(req.body, String(req.params.id)),
    );
  }),
  remove: handle(async (req, res) => {
    res.json(await new WeightClassService().remove(String(req.params.id)));
  }),
  get: handle(async (req, res) => {
    const row = await AppDataSource.getRepository(WeightClass).findOneBy({
      id: String(req.params.id),
    });
    if (!row) throw new ApiError(404, "Weight class not found");
    res.json(row);
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = weightClassQuery(req.query);
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
    const { qb } = weightClassQuery(req.query);
    const groups = await qb.take(10001).getMany();
    if (groups.length > 10000)
      throw new ApiError(400, "Narrow filters to export at most 10000 weight classes");
    const safe = (value: string) =>
      /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const sheet = XLSX.utils.json_to_sheet(
      groups.map((g) => ({
        "Weight Title": safe(g.weightTitle),
        "Weight Unit": safe(g.weightUnit),
        "Value": g.value,
      })),
      { header: ["Weight Title", "Weight Unit", "Value"] },
    );
    res.attachment("weight-classes." + format);
    if (format === "csv")
      res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Weight Classes");
      res
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
