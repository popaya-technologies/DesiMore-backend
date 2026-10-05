import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { TaxRate } from "../entities/tax-class.entity";
import { GeoZone } from "../entities/geo_zone.entity";
import { CustomerGroup } from "../entities/customer-group.entity";
import { taxRateResponse, taxRateRelations } from "../services/tax-rate.service";
import {
  TaxRateService,
  taxRateQuery,
} from "../services/tax-rate.service";
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
export const TaxRateController = {
  options: handle(async (req, res) => {
    if (Object.keys(req.query).length) throw new ApiError(400, "Unknown query parameter");
    const [geoZones, customerGroups] = await Promise.all([
      AppDataSource.getRepository(GeoZone).find({ select: ["id", "name"], order: { name: "ASC", id: "ASC" }, take: 10001 }),
      AppDataSource.getRepository(CustomerGroup).find({ select: ["id", "name"], order: { sortOrder: "ASC", id: "ASC" }, take: 10001 }),
    ]);
    if (geoZones.length > 10000 || customerGroups.length > 10000) throw new ApiError(400, "Form options exceed 10000 records");
    res.json({ geoZones, customerGroups, types: ["percentage", "fixed"] });
  }),
  bulk: handle(async (req, res) => { res.json(await new TaxRateService().removeMany(req.body)); }),
  create: handle(async (req, res) => {
    res.status(201).json(await new TaxRateService().save(req.body));
  }),
  update: handle(async (req, res) => {
    res.json(
      await new TaxRateService().save(req.body, String(req.params.id)),
    );
  }),
  remove: handle(async (req, res) => {
    res.json(await new TaxRateService().remove(String(req.params.id)));
  }),
  get: handle(async (req, res) => {
    const row = await AppDataSource.getRepository(TaxRate).findOne({
      where: { id: String(req.params.id) }, relations: taxRateRelations,
    });
    if (!row) throw new ApiError(404, "Tax rate not found");
    res.json(taxRateResponse(row));
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = taxRateQuery(req.query);
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    res.json({
      data: data.map((row, index) => ({ ...taxRateResponse(row), no: (page - 1) * limit + index + 1 })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!["csv", "xlsx"].includes(String(format)))
      throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = taxRateQuery(req.query);
    const groups = await qb.take(10001).getMany();
    if (groups.length > 10000)
      throw new ApiError(400, "Narrow filters to export at most 10000 groups");
    const safe = (value: string) =>
      /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const sheet = XLSX.utils.json_to_sheet(
      groups.map((g) => ({
        "Tax Name": safe(g.name),
        "Tax Rate": g.rate, "Type": g.type, "Geo Zone": safe(g.geoZone?.name ?? ""),
        "Date Added": g.createdAt?.toISOString(), "Date Modified": g.updatedAt?.toISOString(),
      })),
      { header: ["Tax Name", "Tax Rate", "Type", "Geo Zone", "Date Added", "Date Modified"] },
    );
    res.attachment("tax-rates." + format);
    if (format === "csv")
      res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Tax Rates");
      res
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
