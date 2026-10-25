import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { ProductReturn } from "../entities/product-return.entity";

// Product returns keep the chosen return status / action / reason as text (the
// list item's name), so a list item is "in use" when a return stores its name.
export type ReturnListField = "returnStatus" | "returnAction" | "returnReason";

export const countReturnsUsing = (
  field: ReturnListField,
  name: string,
  manager: EntityManager = AppDataSource.manager,
) =>
  manager
    .getRepository(ProductReturn)
    .createQueryBuilder("productReturn")
    .where(`LOWER(TRIM(productReturn.${field})) = LOWER(TRIM(:name))`, { name })
    .getCount();

export const returnUsageMessage = (name: string, count: number) =>
  `${name} is used by ${count} return${count === 1 ? "" : "s"} and cannot be deleted`;
