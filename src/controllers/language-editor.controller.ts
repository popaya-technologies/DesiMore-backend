import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../data-source";
import { LanguageTranslation } from "../entities/language-translation.entity";
import { LanguageEditorService, translationQuery } from "../services/language-editor.service";
import { ApiError, respondError } from "../utils/api-error";
import { SystemLanguage } from "../entities/system-language.entity";
import { In } from "typeorm";

const repo = () => AppDataSource.getRepository(LanguageTranslation);
const handle = (action: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try { await action(req, res); } catch (error) { respondError(res, error); }
  };
export const LanguageEditorController = {
  publicTranslations: handle(async (req, res) => {
    const allowedQuery = ["languageId", "store"];
    if (Object.keys(req.query).some(key => !allowedQuery.includes(key))) {
      throw new ApiError(400, "Unknown query parameter");
    }

    const languageId = String(req.query.languageId ?? "").trim();
    const store = String(req.query.store ?? "Default").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(languageId)) {
      throw new ApiError(400, "A valid languageId is required");
    }
    if (!store || store.length > 100 || /[\u0000-\u001f\u007f]/.test(store)) {
      throw new ApiError(400, "Invalid store");
    }

    const languageRepo = AppDataSource.getRepository(SystemLanguage);
    const selectedLanguage = await languageRepo.findOne({
      where: { id: languageId, status: true },
    });
    if (!selectedLanguage) throw new ApiError(404, "Enabled language not found");

    const defaultLanguage = await languageRepo.findOne({
      where: { isDefault: true, status: true },
    });
    const languageIds = [...new Set([
      defaultLanguage?.id,
      selectedLanguage.id,
    ].filter((id): id is string => Boolean(id)))];
    const rows = await repo().find({
      where: { store, languageId: In(languageIds) },
      order: { route: "ASC", key: "ASC" },
    });

    const translations: Record<string, string> = {};
    const addRows = (id: string | undefined) => {
      if (!id) return;
      for (const row of rows.filter(item => item.languageId === id)) {
        const route = row.route.trim().replace(/^\.+|\.+$/g, "");
        const key = row.key.trim().replace(/^\.+|\.+$/g, "");
        if (route && key) {
          // Admins may enter either `title` or the fully-qualified
          // `about.title`. Avoid producing `about.about.title`.
          const fullKey = key === route || key.startsWith(`${route}.`)
            ? key
            : `${route}.${key}`;
          translations[fullKey] = row.value;
        }
      }
    };

    addRows(defaultLanguage?.id);
    addRows(selectedLanguage.id);

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({
      language: {
        id: selectedLanguage.id,
        name: selectedLanguage.languageName,
        code: selectedLanguage.code,
        locale: selectedLanguage.locale,
        isDefault: selectedLanguage.isDefault,
      },
      defaultLanguageId: defaultLanguage?.id ?? null,
      translations,
    });
  }),
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
    const row = await repo().findOne({
      where: { id: String(req.params.id) },
      relations: { systemLanguage: true },
    });
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
      AppDataSource.getRepository(SystemLanguage).find({
        order: { sortOrder: "ASC", languageName: "ASC" },
      }),
    ]);
    res.json({ stores: [...new Set(["Default", ...stores.map(s => s.value)])],
      languages,
      defaults: {
        store: "Default",
        languageId: languages.find(language => language.isDefault)?.id ?? "",
      } });
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
