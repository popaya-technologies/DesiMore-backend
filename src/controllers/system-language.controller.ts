import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { SystemLanguage } from "../entities/system-language.entity";
import {
  CreateSystemLanguageDto,
  UpdateSystemLanguageDto,
} from "../dto/system-language.dto";
import { Store } from "../entities/store.entity";
import { SeoUrl } from "../entities/seo-url.entity";
import { LanguageTranslation } from "../entities/language-translation.entity";

export class SystemLanguageController {
  private static repository() {
    return AppDataSource.getRepository(SystemLanguage);
  }

  private static buildResponse(language: SystemLanguage) {
    return {
      id: language.id,
      languageName: language.languageName,
      code: language.code,
      locale: language.locale,
      sortOrder: language.sortOrder,
      status: language.status,
      isDefault: language.isDefault,
      createdAt: language.createdAt,
      updatedAt: language.updatedAt,
    };
  }

  static async createSystemLanguage(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const dto = Object.assign(
        new CreateSystemLanguageDto(),
        req.body,
      );

      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          message: "Validation failed",
          errors,
        });
        return;
      }

      const repository =
        SystemLanguageController.repository();

      const languageName = dto.languageName.trim();
      const code = dto.code.trim();
      const locale = dto.locale.trim();

      if (dto.isDefault && dto.status === false) {
        res.status(400).json({
          message: "The default language must be enabled",
        });
        return;
      }

      const existingLanguage = await repository
        .createQueryBuilder("language")
        .where("LOWER(language.languageName) = LOWER(:languageName)", {
          languageName,
        })
        .orWhere("LOWER(language.code) = LOWER(:code)", { code })
        .orWhere("LOWER(language.locale) = LOWER(:locale)", { locale })
        .getOne();

      if (existingLanguage) {
        res.status(409).json({
          message:
            "A language with the same name, code, or locale already exists",
        });
        return;
      }

      const languageCount = await repository.count();
      const shouldBeDefault = languageCount === 0 || dto.isDefault === true;
      const language = repository.create({
        languageName,
        code,
        locale,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? true,
        isDefault: shouldBeDefault,
      });

      const savedLanguage = await AppDataSource.transaction(async (manager) => {
        if (shouldBeDefault) {
          await manager
            .getRepository(SystemLanguage)
            .createQueryBuilder()
            .update(SystemLanguage)
            .set({ isDefault: false })
            .execute();
        }

        return manager.getRepository(SystemLanguage).save(language);
      });

      res.status(201).json(
        SystemLanguageController.buildResponse(
          savedLanguage,
        ),
      );
    } catch (error) {
      console.error(
        "Error creating system language:",
        error,
      );

      res.status(500).json({
        message: "Failed to create system language",
      });
    }
  }

  static async getSystemLanguages(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        SystemLanguageController.repository();

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.min(
        Math.max(Number(req.query.limit) || 10, 1),
        100,
      );

      const skip = (page - 1) * limit;

      const queryBuilder = repository
        .createQueryBuilder("language")
        .orderBy("language.sortOrder", "ASC")
        .addOrderBy("language.createdAt", "DESC")
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.where(
          `(
            language.languageName ILIKE :search
            OR language.code ILIKE :search
            OR language.locale ILIKE :search
          )`,
          {
            search: `%${search}%`,
          },
        );
      }

      const [languages, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: languages.map(
          SystemLanguageController.buildResponse,
        ),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error(
        "Error getting system languages:",
        error,
      );

      res.status(500).json({
        message: "Failed to get system languages",
      });
    }
  }

  static async getEnabledLanguages(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const languages = await SystemLanguageController.repository().find({
        where: { status: true },
        order: {
          sortOrder: "ASC",
          languageName: "ASC",
        },
      });

      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      res.status(200).json(
        languages.map((language) => ({
          id: language.id,
          name: language.languageName,
          code: language.code,
          locale: language.locale,
          isDefault: language.isDefault,
        })),
      );
    } catch (error) {
      console.error("Error getting enabled languages:", error);
      res.status(500).json({
        message: "Failed to get enabled languages",
      });
    }
  }

  static async getSystemLanguageById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        SystemLanguageController.repository();

      const language = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!language) {
        res.status(404).json({
          message: "System language not found",
        });
        return;
      }

      res.status(200).json(
        SystemLanguageController.buildResponse(language),
      );
    } catch (error) {
      console.error(
        "Error getting system language:",
        error,
      );

      res.status(500).json({
        message: "Failed to get system language",
      });
    }
  }

  static async updateSystemLanguage(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const dto = Object.assign(
        new UpdateSystemLanguageDto(),
        req.body,
      );

      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          message: "Validation failed",
          errors,
        });
        return;
      }

      const repository =
        SystemLanguageController.repository();

      const language = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!language) {
        res.status(404).json({
          message: "System language not found",
        });
        return;
      }

      const previousLanguageName = language.languageName;

      const languageName =
        dto.languageName?.trim();

      const code = dto.code?.trim();

      const locale = dto.locale?.trim();

      if (
        languageName !== undefined ||
        code !== undefined ||
        locale !== undefined
      ) {
        const duplicateQuery =
          repository
            .createQueryBuilder("language")
            .where("language.id != :id", {
              id: language.id,
            });

        const conditions: string[] = [];

        const parameters: Record<
          string,
          string
        > = {
          id: language.id,
        };

        if (languageName !== undefined) {
          conditions.push(
            "LOWER(language.languageName) = LOWER(:languageName)",
          );

          parameters.languageName = languageName;
        }

        if (code !== undefined) {
          conditions.push(
            "LOWER(language.code) = LOWER(:code)",
          );

          parameters.code = code;
        }

        if (locale !== undefined) {
          conditions.push(
            "LOWER(language.locale) = LOWER(:locale)",
          );

          parameters.locale = locale;
        }

        duplicateQuery.andWhere(
          `(${conditions.join(" OR ")})`,
          parameters,
        );

        const duplicate =
          await duplicateQuery.getOne();

        if (duplicate) {
          res.status(409).json({
            message:
              "A language with the same name, code, or locale already exists",
          });
          return;
        }
      }

      if (languageName !== undefined) {
        language.languageName = languageName;
      }

      if (code !== undefined) {
        language.code = code;
      }

      if (locale !== undefined) {
        language.locale = locale;
      }

      if (dto.sortOrder !== undefined) {
        language.sortOrder = dto.sortOrder;
      }

      if (dto.status !== undefined) {
        if (language.isDefault && !dto.status) {
          res.status(400).json({
            message: "The default language cannot be disabled",
          });
          return;
        }
        language.status = dto.status;
      }

      if (dto.isDefault === false && language.isDefault) {
        res.status(400).json({
          message: "Choose another default language before removing this default",
        });
        return;
      }

      if (dto.isDefault === true) {
        language.isDefault = true;
        language.status = true;
      }

      const updatedLanguage = await AppDataSource.transaction(async (manager) => {
        if (dto.isDefault === true) {
          await manager
            .getRepository(SystemLanguage)
            .createQueryBuilder()
            .update(SystemLanguage)
            .set({ isDefault: false })
            .where("id != :id", { id: language.id })
            .execute();
        }

        const savedLanguage = await manager.getRepository(SystemLanguage).save(language);

        if (savedLanguage.languageName !== previousLanguageName) {
          await manager.getRepository(Store).update(
            { languageId: savedLanguage.id },
            { language: savedLanguage.languageName },
          );
          await manager.getRepository(SeoUrl).update(
            { languageId: savedLanguage.id },
            { language: savedLanguage.languageName },
          );
          await manager.getRepository(LanguageTranslation).update(
            { languageId: savedLanguage.id },
            { language: savedLanguage.languageName },
          );
        }

        return savedLanguage;
      });

      res.status(200).json(
        SystemLanguageController.buildResponse(
          updatedLanguage,
        ),
      );
    } catch (error) {
      console.error(
        "Error updating system language:",
        error,
      );

      res.status(500).json({
        message: "Failed to update system language",
      });
    }
  }

  static async deleteSystemLanguage(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        SystemLanguageController.repository();

      const language = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!language) {
        res.status(404).json({
          message: "System language not found",
        });
        return;
      }

      if (language.isDefault) {
        res.status(409).json({
          message: "The default language cannot be deleted",
        });
        return;
      }

      const storesUsingLanguage = await AppDataSource.getRepository(Store).count({
        where: { languageId: language.id },
      });

      if (storesUsingLanguage > 0) {
        res.status(409).json({
          message: `This language is assigned to ${storesUsingLanguage} store${storesUsingLanguage === 1 ? "" : "s"}`,
        });
        return;
      }

      const seoUrlsUsingLanguage = await AppDataSource.getRepository(SeoUrl).count({
        where: { languageId: language.id },
      });

      if (seoUrlsUsingLanguage > 0) {
        res.status(409).json({
          message: `This language is assigned to ${seoUrlsUsingLanguage} SEO URL${seoUrlsUsingLanguage === 1 ? "" : "s"}`,
        });
        return;
      }

      const translationsUsingLanguage = await AppDataSource.getRepository(LanguageTranslation).count({
        where: { languageId: language.id },
      });

      if (translationsUsingLanguage > 0) {
        res.status(409).json({
          message: `This language is assigned to ${translationsUsingLanguage} translation${translationsUsingLanguage === 1 ? "" : "s"}`,
        });
        return;
      }

      await repository.remove(language);

      res.status(200).json({
        message: "System language deleted successfully",
      });
    } catch (error) {
      console.error(
        "Error deleting system language:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete system language",
      });
    }
  }
}
