import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { Attribute } from "../entities/attribute.entity";
import { AttributeGroup, DEFAULT_ATTRIBUTE_GROUP_ID } from "../entities/attribute-group.entity";
import { AttributeService, attributeQuery } from "../services/attribute.service";
import { ApiError, respondError } from "../utils/api-error";

const repo = () => AppDataSource.getRepository(Attribute);
const handle = (action: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try { await action(req, res); } catch (error) { respondError(res, error); }
  };
export const AttributeController = {
  create: handle(async (req, res) => { res.status(201).json(await new AttributeService().save(req.body)); }),
  update: handle(async (req, res) => { res.json(await new AttributeService().save(req.body, String(req.params.id))); }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = attributeQuery(req.query);
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }),
  get: handle(async (req, res) => {
    const row = await repo().findOne({ where: { id: String(req.params.id) }, relations: ["attributeGroup"] });
    if (!row) throw new ApiError(404, "Attribute not found");
    res.json(row);
  }),
  remove: handle(async (req, res) => {
    const result = await repo().delete(String(req.params.id));
    if (!result.affected) throw new ApiError(404, "Attribute not found");
    res.json({ message: "Attribute deleted successfully" });
  }),
  options: handle(async (_req, res) => {
    const attributeGroups = await AppDataSource.getRepository(AttributeGroup).find({
      order: { sortOrder: "ASC", name: "ASC", id: "ASC" },
    });
    res.json({ attributeGroups, defaults: { attributeGroupId: DEFAULT_ATTRIBUTE_GROUP_ID, sortOrder: 0 } });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!["csv", "xlsx"].includes(String(format))) throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = attributeQuery(req.query);
    const attributes = await qb.take(10001).getMany();
    if (attributes.length > 10000) throw new ApiError(400, "Narrow filters to export at most 10000 attributes");
    const safe = (value: string) => /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const rows = attributes.map(a => ({ "Attribute Name": safe(a.name),
      "Attribute Group": safe(a.attributeGroup.name), "Sort Order": a.sortOrder }));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: ["Attribute Name", "Attribute Group", "Sort Order"] });
    res.attachment("attributes." + format);
    if (format === "csv") res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Attributes");
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
