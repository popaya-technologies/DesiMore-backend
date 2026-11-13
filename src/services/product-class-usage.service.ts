import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Product } from "../entities/product.entity";

// Products keep their weight / length class as text (e.g. "pound", "inch"), for the
// retail and the wholesale data, so a class is "in use" when a product stores its
// title or unit.
export const countProductsUsingClass = (
  kind: "weight" | "length",
  values: Array<string | null | undefined>,
  manager: EntityManager = AppDataSource.manager,
) => {
  const names = values
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());
  if (!names.length) return Promise.resolve(0);

  const field = kind === "weight" ? "weightClass" : "lengthClass";
  const wholesaleField = kind === "weight" ? "wholesaleWeightClass" : "wholesaleLengthClass";
  return manager
    .getRepository(Product)
    .createQueryBuilder("product")
    .where(
      `(LOWER(TRIM(product.${field})) IN (:...names) OR LOWER(TRIM(product.${wholesaleField})) IN (:...names))`,
      { names },
    )
    .getCount();
};

export const classUsageMessage = (title: string, count: number) =>
  `${title} is used by ${count} product${count === 1 ? "" : "s"} and cannot be deleted`;
