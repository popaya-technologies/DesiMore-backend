import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import sanitizeHtml from "sanitize-html";

import { AppDataSource } from "../data-source";
import {
  CreateRecipeCategoryDto,
  UpdateRecipeCategoryDto,
} from "../dto/recipe-category.dto";
import { RecipeCategory } from "../entities/recipe-category.entity";
import { ApiError } from "../utils/api-error";

function cleanText(value: string, label: string): string {
  const cleaned = value.trim();

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(cleaned)) {
    throw new ApiError(
      400,
      `${label} contains invalid characters`,
    );
  }

  return cleaned;
}

function cleanImage(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim() === "") {
    return null;
  }

  const image = value.trim();

  if (image.length > 2048) {
    throw new ApiError(400, "Image URL is too long");
  }

  if (
    !image.startsWith("http://") &&
    !image.startsWith("https://") &&
    !image.startsWith("/uploads/") &&
    !image.startsWith("/catalog/")
  ) {
    throw new ApiError(400, "Invalid image URL");
  }

  if (/^https?:\/\/[^/]*@/i.test(image)) {
    throw new ApiError(400, "Invalid image URL");
  }

  return image;
}

function cleanSeoKeyword(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value.trim() === "") {
    return null;
  }

  const keyword = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(keyword)) {
    throw new ApiError(
      400,
      "SEO keyword may contain only letters, numbers and hyphens",
    );
  }

  return keyword;
}

type RecipeCategoryDto =
  | CreateRecipeCategoryDto
  | UpdateRecipeCategoryDto;

async function validateRecipeCategory(
  input: unknown,
  creating: boolean,
): Promise<RecipeCategoryDto> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new ApiError(
      400,
      "Request body must be an object",
    );
  }

  const dto: RecipeCategoryDto = creating
    ? plainToInstance(CreateRecipeCategoryDto, input)
    : plainToInstance(UpdateRecipeCategoryDto, input);

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );

    throw new ApiError(
      400,
      messages.join(", ") ||
        "Invalid recipe category data",
    );
  }

  if (dto.name !== undefined) {
    dto.name = cleanText(
      dto.name,
      "Recipe category name",
    );
  }

  if (dto.metaTitle !== undefined) {
    dto.metaTitle = cleanText(
      dto.metaTitle,
      "Meta tag title",
    );
  }

  if (dto.description !== undefined) {
    dto.description = sanitizeHtml(
      dto.description,
      {
        allowedTags: [
          "p",
          "br",
          "strong",
          "b",
          "em",
          "i",
          "u",
          "ul",
          "ol",
          "li",
          "a",
          "h1",
          "h2",
          "h3",
          "blockquote",
        ],
        allowedAttributes: {
          a: ["href", "target", "rel"],
        },
        allowedSchemes: ["http", "https"],
      },
    );
  }

  if (dto.metaDescription !== undefined) {
    dto.metaDescription = cleanText(
      dto.metaDescription,
      "Meta tag description",
    );
  }

  if (dto.metaKeywords !== undefined) {
    dto.metaKeywords = cleanText(
      dto.metaKeywords,
      "Meta tag keywords",
    );
  }

  if (dto.image !== undefined) {
    dto.image = cleanImage(dto.image);
  }

  if (dto.seoKeyword !== undefined) {
    dto.seoKeyword = cleanSeoKeyword(
      dto.seoKeyword,
    );
  }

  if (
    dto.columns !== undefined &&
    dto.columns < 1
  ) {
    throw new ApiError(
      400,
      "Columns must be at least 1",
    );
  }

  if (
    dto.sortOrder !== undefined &&
    dto.sortOrder < 0
  ) {
    throw new ApiError(
      400,
      "Sort order cannot be negative",
    );
  }

  return dto;
}

export class RecipeCategoryService {
  async save(
    input: unknown,
    id?: string,
  ): Promise<RecipeCategory> {
    const dto = await validateRecipeCategory(
      input,
      !id,
    );

    return AppDataSource.transaction(
      async (manager) => {
        const repository =
          manager.getRepository(RecipeCategory);

        let category: RecipeCategory;

        if (id) {
          const existing = await repository.findOne({
            where: { id },
            lock: {
              mode: "pessimistic_write",
            },
          });

          if (!existing) {
            throw new ApiError(
              404,
              "Recipe category not found",
            );
          }

          category = existing;
        } else {
          category = repository.create({
            name: "",
            metaTitle: "",
          });
        }

        if (dto.parent !== undefined) {
          if (dto.parent === id) {
            throw new ApiError(
              400,
              "A recipe category cannot be its own parent",
            );
          }

          if (dto.parent) {
            const parent =
              await repository.findOne({
                where: {
                  id: dto.parent,
                },
              });

            if (!parent) {
              throw new ApiError(
                400,
                "Parent recipe category not found",
              );
            }
          }
        }

        Object.assign(category, dto);

        try {
          return await repository.save(category);
        } catch (error: unknown) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code ===
              "23505"
          ) {
            throw new ApiError(
              409,
              "Recipe category name or SEO keyword already exists",
            );
          }

          throw error;
        }
      },
    );
  }
}