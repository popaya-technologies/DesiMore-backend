import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { countReturnsUsing, returnUsageMessage } from "../services/return-usage.service";
import { ReturnReason } from "../entities/return-reason.entity";
import {
  CreateReturnReasonDto,
  UpdateReturnReasonDto,
} from "../dto/return-reason.dto";

const validationErrors = async (dto: object) => {
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
};

// Names are unique regardless of upper/lower case.
const isNameTaken = async (name: string, excludeId?: string) => {
  const query = AppDataSource.getRepository(ReturnReason)
    .createQueryBuilder("returnReason")
    .select(["returnReason.id"])
    .where("LOWER(returnReason.name) = LOWER(:name)", { name });
  if (excludeId) query.andWhere("returnReason.id != :excludeId", { excludeId });
  return Boolean(await query.getOne());
};

export class ReturnReasonController {
  static async createReturnReason(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnReason);

      const dto = plainToInstance(CreateReturnReasonDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const name = dto.name.trim();

      if (await isNameTaken(name)) {
        res.status(409).json({
          message: "Return reason already exists",
        });
        return;
      }

      const returnReason = repository.create({
        name,
      });

      const savedReturnReason =
        await repository.save(returnReason);

      res.status(201).json(savedReturnReason);
    } catch (error) {
      console.error(
        "Create return reason error:",
        error,
      );

      res.status(500).json({
        message: "Failed to create return reason",
      });
    }
  }

  static async getReturnReasons(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnReason);

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

      // Column sorting from the admin list; default is name A-Z.
      const sortOrder =
        String(req.query.sortOrder).toUpperCase() === "DESC"
          ? "DESC"
          : "ASC";

      const queryBuilder = repository
        .createQueryBuilder("returnReason")
        .orderBy("returnReason.name", sortOrder)
        .addOrderBy(
          "returnReason.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.where(
          "returnReason.name ILIKE :search",
          {
            search: `%${search}%`,
          },
        );
      }

      const [returnReasons, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: returnReasons,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(
            total / limit,
          ),
        },
      });
    } catch (error) {
      console.error(
        "Get return reasons error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get return reasons",
      });
    }
  }

  static async getReturnReasonById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnReason);

      const { id } = req.params;

      const returnReason = await repository.findOne({
        where: { id },
      });

      if (!returnReason) {
        res.status(404).json({
          message: "Return reason not found",
        });
        return;
      }

      res.status(200).json(returnReason);
    } catch (error) {
      console.error(
        "Get return reason error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get return reason",
      });
    }
  }

  static async updateReturnReason(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnReason);

      const { id } = req.params;

      const dto = plainToInstance(UpdateReturnReasonDto, req.body);
      const errors = await validationErrors(dto);

      if (errors.length) {
        res.status(400).json({
          message: errors[0],
          errors,
        });
        return;
      }

      const returnReason = await repository.findOne({
        where: { id },
      });

      if (!returnReason) {
        res.status(404).json({
          message: "Return reason not found",
        });
        return;
      }

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        if (await isNameTaken(name, returnReason.id)) {
          res.status(409).json({
            message: "Return reason already exists",
          });
          return;
        }

        returnReason.name = name;
      }

      const updatedReturnReason =
        await repository.save(returnReason);

      res.status(200).json(updatedReturnReason);
    } catch (error) {
      console.error(
        "Update return reason error:",
        error,
      );

      res.status(500).json({
        message: "Failed to update return reason",
      });
    }
  }

  static async deleteReturnReason(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnReason);

      const { id } = req.params;

      const returnReason = await repository.findOne({
        where: { id },
      });

      if (!returnReason) {
        res.status(404).json({
          message: "Return reason not found",
        });
        return;
      }

      const used = await countReturnsUsing("returnReason", returnReason.name);

      if (used) {
        res.status(409).json({
          message: returnUsageMessage(returnReason.name, used),
        });
        return;
      }

      await repository.remove(returnReason);

      res.status(200).json({
        message: "Return reason deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete return reason error:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete return reason",
      });
    }
  }
}
