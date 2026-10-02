import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Currency } from "../entities/currency.entity";
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from "../dto/currency.dto";

export class CurrencyController {
  private static repository() {
    return AppDataSource.getRepository(Currency);
  }

  private static buildResponse(currency: Currency) {
    return {
      id: currency.id,
      currencyTitle: currency.currencyTitle,
      code: currency.code,
      symbolLeft: currency.symbolLeft,
      symbolRight: currency.symbolRight,
      decimalPlaces: currency.decimalPlaces,
      value: Number(currency.value),
      status: currency.status,
      createdAt: currency.createdAt,
      updatedAt: currency.updatedAt,
    };
  }

  static async createCurrency(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const dto = Object.assign(
        new CreateCurrencyDto(),
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

      const repository = CurrencyController.repository();

      const currencyTitle = dto.currencyTitle.trim();
      const code = dto.code.trim();

      const existingCurrency = await repository.findOne({
        where: [
          { currencyTitle },
          { code },
        ],
      });

      if (existingCurrency) {
        res.status(409).json({
          message:
            "A currency with the same title or code already exists",
        });
        return;
      }

      const currency = repository.create({
        currencyTitle,
        code,
        symbolLeft:
          dto.symbolLeft?.trim() || null,
        symbolRight:
          dto.symbolRight?.trim() || null,
        decimalPlaces: dto.decimalPlaces ?? 2,
        value: dto.value ?? 1,
        status: dto.status ?? true,
      });

      const savedCurrency =
        await repository.save(currency);

      res.status(201).json(
        CurrencyController.buildResponse(savedCurrency),
      );
    } catch (error) {
      console.error(
        "Error creating currency:",
        error,
      );

      res.status(500).json({
        message: "Failed to create currency",
      });
    }
  }

  static async getCurrencies(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = CurrencyController.repository();

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 10,
          1,
        ),
        100,
      );

      const skip = (page - 1) * limit;

      const queryBuilder = repository
        .createQueryBuilder("currency")
        .orderBy("currency.currencyTitle", "ASC")
        .addOrderBy("currency.createdAt", "DESC")
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.where(
          `(
            currency.currencyTitle ILIKE :search
            OR currency.code ILIKE :search
          )`,
          {
            search: `%${search}%`,
          },
        );
      }

      const [currencies, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: currencies.map(
          CurrencyController.buildResponse,
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
        "Error getting currencies:",
        error,
      );

      res.status(500).json({
        message: "Failed to get currencies",
      });
    }
  }

  static async getCurrencyById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = CurrencyController.repository();

      const currency = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!currency) {
        res.status(404).json({
          message: "Currency not found",
        });
        return;
      }

      res.status(200).json(
        CurrencyController.buildResponse(currency),
      );
    } catch (error) {
      console.error(
        "Error getting currency:",
        error,
      );

      res.status(500).json({
        message: "Failed to get currency",
      });
    }
  }

  static async updateCurrency(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const dto = Object.assign(
        new UpdateCurrencyDto(),
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

      const repository = CurrencyController.repository();

      const currency = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!currency) {
        res.status(404).json({
          message: "Currency not found",
        });
        return;
      }

      const currencyTitle =
        dto.currencyTitle?.trim();

      const code = dto.code?.trim();

      if (
        currencyTitle !== undefined ||
        code !== undefined
      ) {
        const duplicateQuery = repository
          .createQueryBuilder("currency")
          .where("currency.id != :id", {
            id: currency.id,
          });

        const conditions: string[] = [];

        const parameters: Record<
          string,
          string
        > = {
          id: currency.id,
        };

        if (currencyTitle !== undefined) {
          conditions.push(
            "currency.currencyTitle = :currencyTitle",
          );

          parameters.currencyTitle =
            currencyTitle;
        }

        if (code !== undefined) {
          conditions.push(
            "currency.code = :code",
          );

          parameters.code = code;
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
              "A currency with the same title or code already exists",
          });
          return;
        }
      }

      if (currencyTitle !== undefined) {
        currency.currencyTitle = currencyTitle;
      }

      if (code !== undefined) {
        currency.code = code;
      }

      if (dto.symbolLeft !== undefined) {
        currency.symbolLeft =
          dto.symbolLeft.trim() || null;
      }

      if (dto.symbolRight !== undefined) {
        currency.symbolRight =
          dto.symbolRight.trim() || null;
      }

      if (dto.decimalPlaces !== undefined) {
        currency.decimalPlaces =
          dto.decimalPlaces;
      }

      if (dto.value !== undefined) {
        currency.value = dto.value;
      }

      if (dto.status !== undefined) {
        currency.status = dto.status;
      }

      const updatedCurrency =
        await repository.save(currency);

      res.status(200).json(
        CurrencyController.buildResponse(
          updatedCurrency,
        ),
      );
    } catch (error) {
      console.error(
        "Error updating currency:",
        error,
      );

      res.status(500).json({
        message: "Failed to update currency",
      });
    }
  }

  static async deleteCurrency(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = CurrencyController.repository();

      const currency = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!currency) {
        res.status(404).json({
          message: "Currency not found",
        });
        return;
      }

      await repository.remove(currency);

      res.status(200).json({
        message: "Currency deleted successfully",
      });
    } catch (error) {
      console.error(
        "Error deleting currency:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete currency",
      });
    }
  }
}