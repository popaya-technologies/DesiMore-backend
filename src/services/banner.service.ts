import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Banner } from "../entities/banner.entity";
import { CreateBannerDto, UpdateBannerDto } from "../dto/banner.dto";
import { ApiError } from "../utils/api-error";

function safeUrl(value: string, image: boolean): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//"))
    return !image || value.startsWith("/uploads/") || value.startsWith("/catalog/");
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export async function validateBannerInput(input: any, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Banner must be a nonempty object");
  const dto = creating ? plainToInstance(CreateBannerDto, input) : plainToInstance(UpdateBannerDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid banner data", errors);
  if (dto.name !== undefined) dto.name = dto.name.trim();
  if (dto.slides !== undefined) {
    dto.slides = dto.slides.map(slide => {
      const image = slide.image.trim();
      const link = (slide.link ?? "").trim();
      if (!safeUrl(image, true)) throw new ApiError(400, "Slide image must be HTTP(S), /uploads/ or /catalog/");
      if (link && !safeUrl(link, false)) throw new ApiError(400, "Slide link must be HTTP(S) or a site-relative path");
      return { title: (slide.title ?? "").trim(), link, image, sortOrder: slide.sortOrder ?? 0 };
    });
  }
  return dto;
}

export function bannerResponse(banner: Banner) {
  return { ...banner, slides: [...banner.slides].sort((a, b) => a.sortOrder - b.sortOrder),
    slideCount: banner.slides.length };
}

function integer(value: unknown, fallback: number, max: number, key: string) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
    throw new ApiError(400, "Invalid " + key);
  return Number(value);
}

export function bannerQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "isActive", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key)))
    throw new ApiError(400, "Unknown banner query parameter");
  const page = integer(query.page, 1, 1000000, "page");
  const limit = integer(query.limit, 10, 100, "limit");
  const qb = AppDataSource.getRepository(Banner).createQueryBuilder("banner");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    // Literal search: SQL LIKE wildcards in user input do not broaden the match.
    qb.andWhere("banner.name ILIKE :search", {
      search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%",
    });
  }
  if (query.isActive !== undefined) {
    if (!["true", "false"].includes(query.isActive)) throw new ApiError(400, "Invalid isActive");
    qb.andWhere("banner.isActive = :active", { active: query.isActive === "true" });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('banner."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('banner."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "createdAt", sortOrder = query.sortOrder ?? "DESC";
  if (!["name", "isActive", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
    throw new ApiError(400, "Invalid banner sorting");
  qb.orderBy("banner." + sortBy, sortOrder).addOrderBy("banner.id", "ASC");
  return { qb, page, limit };
}
