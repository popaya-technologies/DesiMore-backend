import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { LanguageTranslation } from "../entities/language-translation.entity";
import { LanguageEditorService, translationQuery } from "../services/language-editor.service";
import { ApiError, respondError } from "../utils/api-error";

const repo = () => AppDataSource.getRepository(LanguageTranslation);
const handle = (action: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try { await action(req, res); } catch (error) { respondError(res, error); }
  };
export const LanguageEditorController = {
  create: handle(async (req, res) => {
    res.status(201).json(await new LanguageEditorService().save(req.body));
  }),
  update: handle(async (req, res) => {
    res.json(await new LanguageEditorService().save(req.body, String(req.params.id)));
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = translationQuery(req.query);
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }),
  get: handle(async (req, res) => {
    const row = await repo().findOneBy({ id: String(req.params.id) });
    if (!row) throw new ApiError(404, "Translation not found");
    res.json(row);
  }),
  remove: handle(async (req, res) => {
    const result = await repo().delete(String(req.params.id));
    if (!result.affected) throw new ApiError(404, "Translation not found");
    res.json({ message: "Translation deleted successfully" });
  }),
  bulkDelete: handle(async (req, res) => {
    res.json(await new LanguageEditorService().deleteMany(req.body));
  }),
  options: handle(async (_req, res) => {
    const [stores, languages] = await Promise.all([
      repo().createQueryBuilder("t").select("t.store", "value").distinct(true).orderBy("t.store", "ASC").getRawMany(),
      repo().createQueryBuilder("t").select("t.language", "value").distinct(true).orderBy("t.language", "ASC").getRawMany(),
    ]);
    res.json({ stores: [...new Set(["Default", ...stores.map(s => s.value)])],
      languages: [...new Set(["English", ...languages.map(l => l.value)])],
      defaults: { store: "Default", language: "English" } });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!["csv", "xlsx"].includes(String(format))) throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = translationQuery(req.query);
    const translations = await qb.take(10001).getMany();
    if (translations.length > 10000) throw new ApiError(400, "Narrow filters to export at most 10000 translations");
    const safe = (value: string) => /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
    const rows = translations.map(t => ({ Store: safe(t.store), Language: safe(t.language),
      Route: safe(t.route), Key: safe(t.key), Value: safe(t.value) }));
    const sheet = XLSX.utils.json_to_sheet(rows, { header: ["Store", "Language", "Route", "Key", "Value"] });
    res.attachment("language-translations." + format);
    if (format === "csv") res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Translations");
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
