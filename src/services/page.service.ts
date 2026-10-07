import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import sanitizeHtml from "sanitize-html";
import { AppDataSource } from "../data-source";
import { Page, PAGE_PLACEMENTS } from "../entities/page.entity";
import { UpdatePageDto } from "../dto/page.dto";
import { ApiError } from "../utils/api-error";

export async function validatePageInput(input: any, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Page must be a nonempty object");
  const dto = plainToInstance(UpdatePageDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid page data", errors);
  if (creating && (!dto.title || !dto.slug)) throw new ApiError(400, "title and slug are required");
  if (dto.title !== undefined) dto.title = dto.title.trim();
  if (dto.description !== undefined) dto.description = sanitizeHtml(dto.description, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ["src", "alt", "width", "height"] },
    allowedSchemes: ["http", "https", "mailto"], allowProtocolRelative: false,
  });
  if (dto.media !== undefined) dto.media = dto.media.map(value => {
    const url = value.trim();
    let valid = false;
    if (!/[\s\\\u0000-\u001f\u007f]/.test(url)) {
      valid = url.startsWith("/uploads/") || url.startsWith("/catalog/");
      try { const parsed = new URL(url); valid = ["http:", "https:"].includes(parsed.protocol) && !!parsed.hostname && !parsed.username && !parsed.password; } catch {}
    }
    if (!valid) throw new ApiError(400, "Media must be HTTP(S), /uploads/ or /catalog/ image URLs");
    return url;
  });
  return dto;
}
export const pageResponse = (page: Page) => ({ ...page });

function integer(value: unknown, fallback: number, max: number, key: string) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
    throw new ApiError(400, "Invalid " + key);
  return Number(value);
}

export function pageQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "isActive", "page", "limit", "sortBy", "sortOrder", "format", "bottom"];
  if (Object.keys(query).some(key => !allowed.includes(key)))
    throw new ApiError(400, "Unknown page query parameter");
  const page = integer(query.page, 1, 1000000, "page");
  const limit = integer(query.limit, 10, 100, "limit");
  const qb = AppDataSource.getRepository(Page).createQueryBuilder("page");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    // Literal search: SQL LIKE wildcards in user input do not broaden the match.
    qb.andWhere("(page.title ILIKE :search OR page.slug ILIKE :search)", {
      search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%",
    });
  }
  if (query.bottom !== undefined) {
    if (!PAGE_PLACEMENTS.includes(query.bottom)) throw new ApiError(400, "Invalid bottom");
    qb.andWhere("page.bottom = :bottom", { bottom: query.bottom });
  }
  if (query.isActive !== undefined) {
    if (!["true", "false"].includes(query.isActive)) throw new ApiError(400, "Invalid isActive");
    qb.andWhere("page.isActive = :active", { active: query.isActive === "true" });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('page."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('page."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "createdAt", sortOrder = query.sortOrder ?? "DESC";
  if (!["title", "slug", "sortOrder", "isActive", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
    throw new ApiError(400, "Invalid page sorting");
  qb.orderBy("page." + sortBy, sortOrder).addOrderBy("page.id", "ASC");
  return { qb, page, limit };
}
