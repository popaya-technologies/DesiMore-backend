import { plainToInstance } from "class-transformer";
import { isDateString, isUUID, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { CustomerApproval } from "../entities/customer-approval.entity";
import { CustomerGroup } from "../entities/customer-group.entity";
import { User } from "../entities/user.entity";
import {
  CreateCustomerApprovalDto,
  ReviewCustomerApprovalDto,
} from "../dto/customer-approval.dto";
import { ApiError } from "../utils/api-error";

async function inputDto<T extends object>(type: new () => T, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Invalid request body");
  }

  const dto = plainToInstance(type, input);

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: {
      target: false,
      value: false,
    },
  });

  if (
    errors.length ||
    Object.values(dto).some(
      (value) => typeof value === "string" && value.includes("\u0000"),
    )
  ) {
    throw new ApiError(400, "Invalid customer approval data", errors);
  }

  return dto;
}

export function approvalBaseQuery() {
  return AppDataSource.getRepository(CustomerApproval)
    .createQueryBuilder("approval")
    .leftJoin("approval.user", "customer")
    .addSelect([
      "customer.id",
      "customer.firstname",
      "customer.lastname",
      "customer.fullname",
      "customer.email",
    ])
    .leftJoin("approval.customerGroup", "customerGroup")
    .addSelect(["customerGroup.id", "customerGroup.name"]);
}

export function approvalResponse(row: CustomerApproval) {
  const customerName =
    row.user?.fullname ||
    [row.user?.firstname, row.user?.lastname].filter(Boolean).join(" ");

  return {
    id: row.id,
    userId: row.userId,

    customerName,
    email: row.user?.email ?? null,

    customerGroupId: row.customerGroupId,
    customerGroup: row.customerGroup?.name ?? null,

    type: row.type,
    status: row.status,

    comment: row.comment,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,

    createdAt: row.createdAt,

    // Frontend currently uses dateAdded.
    dateAdded: row.createdAt,

    updatedAt: row.updatedAt,
  };
}

export function customerApprovalQuery(input: Record<string, unknown>) {
  const allowed = [
    "search",
    "email",
    "customerGroup",
    "customerGroupId",
    "type",
    "status",
    "date",
    "startDate",
    "endDate",
    "page",
    "limit",
    "sortBy",
    "sortOrder",
    "format",
  ];

  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key) || typeof value !== "string") {
      throw new ApiError(400, `Invalid query parameter: ${key}`);
    }
  }

  const q = input as Record<string, string>;

  const integer = (key: string, fallback: number, max: number) => {
    if (q[key] === undefined) {
      return fallback;
    }

    if (!/^[1-9]\d*$/.test(q[key]) || Number(q[key]) > max) {
      throw new ApiError(400, `Invalid ${key}`);
    }

    return Number(q[key]);
  };

  const page = integer("page", 1, 1000000);
  const limit = integer("limit", 10, 100);

  const qb = approvalBaseQuery();

  const status = q.status ?? "pending";

  if (!["pending", "approved", "rejected", "all"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  if (status !== "all") {
    qb.andWhere("approval.status = :status", {
      status,
    });
  }

  const searchFilters: Array<[string, string]> = [
    ["search", "customer.fullname"],
    ["email", "customer.email"],
    ["customerGroup", "customerGroup.name"],
  ];

  for (const [key, column] of searchFilters) {
    if (q[key] !== undefined) {
      if (q[key].length > 255) {
        throw new ApiError(400, `Invalid ${key}`);
      }

      const searchValue = q[key].trim().replace(/[\\%_]/g, "\\$&");

      qb.andWhere(`${column} ILIKE :${key} ESCAPE '\\'`, {
        [key]: `%${searchValue}%`,
      });
    }
  }

  if (q.customerGroupId !== undefined) {
    if (!isUUID(q.customerGroupId)) {
      throw new ApiError(400, "Invalid customerGroupId");
    }

    qb.andWhere("approval.customerGroupId = :groupId", {
      groupId: q.customerGroupId,
    });
  }

  if (q.type !== undefined) {
    if (!["customer", "wholesaler"].includes(q.type)) {
      throw new ApiError(400, "type must be customer or wholesaler");
    }

    qb.andWhere("approval.type = :type", {
      type: q.type,
    });
  }

  if (
    q.date !== undefined &&
    (q.startDate !== undefined || q.endDate !== undefined)
  ) {
    throw new ApiError(400, "Use date or startDate/endDate");
  }

  const start = q.date ?? q.startDate;

  const end = q.date ?? q.endDate;

  for (const date of [start, end]) {
    if (
      date !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !isDateString(date, {
          strict: true,
        }))
    ) {
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
    }
  }

  if (start && end && start > end) {
    throw new ApiError(400, "Invalid date range");
  }

  if (start) {
    qb.andWhere("approval.createdAt >= CAST(:start AS date)", { start });
  }

  if (end) {
    qb.andWhere("approval.createdAt < CAST(:end AS date) + INTERVAL '1 day'", {
      end,
    });
  }

  const sorts: Record<string, string> = {
    customerName: "customer.fullname",
    email: "customer.email",
    customerGroup: "customerGroup.name",
    type: "approval.type",
    createdAt: "approval.createdAt",
  };

  const sortBy = q.sortBy ?? "createdAt";
  const direction = q.sortOrder ?? "DESC";

  if (
    !Object.prototype.hasOwnProperty.call(sorts, sortBy) ||
    !["ASC", "DESC"].includes(direction)
  ) {
    throw new ApiError(400, "Invalid sorting");
  }

  qb.orderBy(sorts[sortBy], direction as "ASC" | "DESC");

  qb.addOrderBy("approval.id", "ASC");

  return {
    qb,
    page,
    limit,
  };
}

export async function getCustomerApproval(id: string) {
  if (!isUUID(id)) {
    throw new ApiError(400, "Invalid customer approval ID");
  }

  const row = await approvalBaseQuery()
    .where("approval.id = :id", { id })
    .getOne();

  if (!row) {
    throw new ApiError(404, "Customer approval not found");
  }

  return approvalResponse(row);
}

export async function createCustomerApproval(input: unknown) {
  const dto = await inputDto(CreateCustomerApprovalDto, input);

  try {
    const id = await AppDataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: {
          id: dto.userId,
        },
        lock: {
          mode: "pessimistic_write",
        },
      });

      if (!user) {
        throw new ApiError(404, "Customer not found");
      }

      // The project seed uses these role names.
      if (!["customer", "wholesaler"].includes(user.userRole)) {
        throw new ApiError(
          409,
          "Only customer accounts can be submitted for approval",
        );
      }

      const group = await manager.getRepository(CustomerGroup).findOneBy({
        id: dto.customerGroupId,
      });

      if (!group) {
        throw new ApiError(404, "Customer group not found");
      }

      if (!group.approveNewCustomers) {
        throw new ApiError(
          409,
          "This customer group does not require approval",
        );
      }

      const repo = manager.getRepository(CustomerApproval);

      const existing = await repo.findOneBy({
        userId: user.id,
      });

      if (existing) {
        throw new ApiError(409, "Customer already has an approval record");
      }

      const type = user.userRole === "wholesaler" ? "wholesaler" : "customer";

      const saved = await repo.save(
        repo.create({
          userId: user.id,
          customerGroupId: group.id,
          type,
          status: "pending",
          comment: "",
          reviewedBy: null,
          reviewedAt: null,
        }),
      );

      return saved.id;
    });

    return getCustomerApproval(id);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new ApiError(409, "Customer already has an approval record");
    }

    throw error;
  }
}

export async function reviewCustomerApproval(
  id: string,
  status: "approved" | "rejected",
  input: unknown,
  actor: string,
) {
  if (!isUUID(id)) {
    throw new ApiError(400, "Invalid customer approval ID");
  }

  if (!isUUID(actor)) {
    throw new ApiError(400, "Invalid reviewer ID");
  }

  const dto = await inputDto(ReviewCustomerApprovalDto, input ?? {});

  await AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(CustomerApproval);

    const row = await repo.findOne({
      where: { id },
      lock: {
        mode: "pessimistic_write",
      },
    });

    if (!row) {
      throw new ApiError(404, "Customer approval not found");
    }

    if (row.status !== "pending") {
      throw new ApiError(
        409,
        "This customer approval has already been reviewed",
      );
    }

    if (row.userId === actor) {
      throw new ApiError(403, "You cannot review your own approval");
    }

    row.status = status;
    row.comment = dto.comment ?? "";
    row.reviewedBy = actor;
    row.reviewedAt = new Date();

    await repo.save(row);
  });

  return getCustomerApproval(id);
}
