import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Currency } from "../entities/currency.entity";
import { Store } from "../entities/store.entity";
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from "../dto/currency.dto";

// The default currency is the main (first created) store's Currency setting, which is
// free text, so it matches a currency by title or code (e.g. "US Dollar" or "USD").
export const getDefaultStoreCurrency = async (): Promise<string | null> => {
  const [store] = await AppDataSource.getRepository(Store).find({
    select: ["id", "currency"],
    order: { createdAt: "ASC" },
    take: 1,
  });
  return store?.currency?.trim().toLowerCase() || null;
};

export const isDefaultCurrency = (
  currency: Pick<Currency, "currencyTitle" | "code">,
  defaultCurrency: string | null,
) =>
  defaultCurrency !== null &&
  [currency.currencyTitle, currency.code]
    .map((value) => value?.trim().toLowerCase())
    .includes(defaultCurrency);

const validationErrors = async (dto: object) => {
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
};

// Returns a message when the title or code is already used by another currency
// (case-insensitive), otherwise null.
const findConflict = async (
  values: { currencyTitle?: string; code?: string },
  excludeId?: string,
): Promise<string | null> => {
  const checks: Array<[string, string, string | undefined]> = [
    ["A currency with this title already exists", "LOWER(currency.currencyTitle) = LOWER(:value)", values.currencyTitle],
    ["A currency with this code already exists", "UPPER(currency.code) = :value", values.code],
  ];

  for (const [message, condition, value] of checks) {
    if (!value) continue;
    const query = AppDataSource.getRepository(Currency)
      .createQueryBuilder("currency")
      .select(["currency.id"])
      .where(condition, { value });
    if (excludeId) query.andWhere("currency.id != :excludeId", { excludeId });
    if (await query.getOne()) return message;
  }
  return null;
};

// Like OpenCart: the default currency is the base for all values, so its value is 1
// and it must stay enabled.
const defaultCurrencyRuleError = (currency: Currency) => {
  if (Number(currency.value) !== 1)
    return `${currency.currencyTitle} is the store's default currency, so its value must be 1`;
  if (!currency.status)
    return `${currency.currencyTitle} is the store's default currency and cannot be disabled`;
  return null;
};

export class CurrencyController {
  private static repository() {
    return AppDataSource.getRepository(Currency);
  }

  private static buildResponse(
    currency: Currency,
    defaultCurrency: string | null = null,
  ) {
    return {
      id: currency.id,
      currencyTitle: currency.currencyTitle,
      code: currency.code,
      symbolLeft: currency.symbolLeft,
      symbolRight: currency.symbolRight,
      decimalPlaces: currency.decimalPlaces,
      value: Number(currency.value),
      status: currency.status,
      isDefault: isDefaultCurrency(currency, defaultCurrency),
      createdAt: currency.createdAt,
      updatedAt: currency.updatedAt,
    };
  }

  static async createCurrency(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const dto = plainToInstance(CreateCurrencyDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length > 0) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const repository = CurrencyController.repository();

      const currencyTitle = dto.currencyTitle.trim();
      const code = dto.code.trim().toUpperCase();

      const conflict = await findConflict({ currencyTitle, code });

      if (conflict) {
        res.status(409).json({
          message: conflict,
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

      const defaultCurrency = await getDefaultStoreCurrency();
      const ruleError =
        isDefaultCurrency(currency, defaultCurrency) &&
        defaultCurrencyRuleError(currency);

      if (ruleError) {
        res.status(400).json({
          message: ruleError,
        });
        return;
      }

      const savedCurrency =
        await repository.save(currency);

      res.status(201).json(
        CurrencyController.buildResponse(savedCurrency, defaultCurrency),
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

      const status =
        typeof req.query.status === "string"
          ? req.query.status.trim().toLowerCase()
          : "";

      // Column sorting from the admin list; default is title A-Z.
      const sortColumns: Record<string, string> = {
        currencyTitle: "currency.currencyTitle",
        code: "currency.code",
        value: "currency.value",
        updatedAt: "currency.updatedAt",
      };
      const sortBy =
        typeof req.query.sortBy === "string" &&
        sortColumns[req.query.sortBy]
          ? sortColumns[req.query.sortBy]
          : sortColumns.currencyTitle;
      const sortOrder =
        String(req.query.sortOrder).toUpperCase() === "DESC"
          ? "DESC"
          : "ASC";

      const queryBuilder = repository
        .createQueryBuilder("currency")
        .orderBy(sortBy, sortOrder)
        .addOrderBy("currency.currencyTitle", "ASC")
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.andWhere(
          `(
            currency.currencyTitle ILIKE :search
            OR currency.code ILIKE :search
          )`,
          {
            search: `%${search}%`,
          },
        );
      }

      if (status === "enabled" || status === "true") {
        queryBuilder.andWhere("currency.status = :status", { status: true });
      } else if (status === "disabled" || status === "false") {
        queryBuilder.andWhere("currency.status = :status", { status: false });
      }

      const [[currencies, total], defaultCurrency] = await Promise.all([
        queryBuilder.getManyAndCount(),
        getDefaultStoreCurrency(),
      ]);

      res.status(200).json({
        data: currencies.map((currency) =>
          CurrencyController.buildResponse(currency, defaultCurrency),
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

  // Storefront: the store's default currency, used to format every price. Prices are
  // stored in this currency, so no conversion is applied.
  static async getDefaultCurrency(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const defaultCurrency = await getDefaultStoreCurrency();
      const currencies = await CurrencyController.repository().find({
        where: { status: true },
      });
      const currency = currencies.find((item) =>
        isDefaultCurrency(item, defaultCurrency),
      );

      res.status(200).json({
        data: currency
          ? {
              code: currency.code,
              currencyTitle: currency.currencyTitle,
              symbolLeft: currency.symbolLeft ?? "",
              symbolRight: currency.symbolRight ?? "",
              decimalPlaces: currency.decimalPlaces,
            }
          : null,
      });
    } catch (error) {
      console.error(
        "Error getting default currency:",
        error,
      );

      res.status(500).json({
        message: "Failed to get default currency",
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
        CurrencyController.buildResponse(
          currency,
          await getDefaultStoreCurrency(),
        ),
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
      const dto = plainToInstance(UpdateCurrencyDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length > 0) {
        res.status(400).json({
          message: errors[0],
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

      const code = dto.code?.trim().toUpperCase();

      const conflict = await findConflict(
        { currencyTitle, code },
        currency.id,
      );

      if (conflict) {
        res.status(409).json({
          message: conflict,
        });
        return;
      }

      const defaultCurrency = await getDefaultStoreCurrency();
      const wasDefault = isDefaultCurrency(currency, defaultCurrency);

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

      const isDefault = isDefaultCurrency(currency, defaultCurrency);

      // Renaming the default currency would leave the store without one.
      if (wasDefault && !isDefault) {
        res.status(409).json({
          message: `${currency.currencyTitle} is the store's default currency. Change the store's Currency setting before changing its title and code.`,
        });
        return;
      }

      const ruleError = isDefault && defaultCurrencyRuleError(currency);

      if (ruleError) {
        res.status(400).json({
          message: ruleError,
        });
        return;
      }

      const updatedCurrency =
        await repository.save(currency);

      res.status(200).json(
        CurrencyController.buildResponse(
          updatedCurrency,
          defaultCurrency,
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

      if (isDefaultCurrency(currency, await getDefaultStoreCurrency())) {
        res.status(409).json({
          message: `${currency.currencyTitle} is the store's default currency and cannot be deleted. Change the store's Currency setting first.`,
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