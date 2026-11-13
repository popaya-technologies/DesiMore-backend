import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Cart } from "../entities/cart.entity";
import { WeightClass } from "../entities/weight-class.entity";

/** Weight class values from Localisation, keyed by lowercase title and unit
 * (e.g. "kilogram" and "kg" -> 1, "pound" and "lb" -> 2.2046). Like OpenCart, a
 * value says how many of that unit equal one unit of the default class. */
export type WeightClassValues = Map<string, number>;

export const loadWeightClassValues = async (
  manager: EntityManager = AppDataSource.manager,
): Promise<WeightClassValues> => {
  const values: WeightClassValues = new Map();
  for (const row of await manager.getRepository(WeightClass).find()) {
    const value = Number(row.value);
    if (!(value > 0)) continue;
    values.set(row.weightTitle.trim().toLowerCase(), value);
    values.set(row.weightUnit.trim().toLowerCase(), value);
  }
  return values;
};

/** Returns retail shipping weight in pounds. Cart option snapshots already
 * contain the signed adjustment, so it must only be added once per item. */
const pounds = (
  value: number,
  unit: string | null | undefined,
  classes?: WeightClassValues,
) => {
  const normalized = (unit || "pound").trim().toLowerCase();
  // Convert with the admin values when both the product's class and Pound exist.
  const classValue = classes?.get(normalized);
  const poundValue = classes?.get("pound") ?? classes?.get("lb");
  if (classValue && poundValue) return (value * poundValue) / classValue;
  if (["kg", "kilogram", "kilograms"].includes(normalized)) return value * 2.2046226218;
  if (["g", "gram", "grams"].includes(normalized)) return value * 0.0022046226;
  if (["oz", "ounce", "ounces"].includes(normalized)) return value / 16;
  return value;
};

export const calculateRetailShippingWeight = (
  cart: Pick<Cart, "items">,
  classes?: WeightClassValues,
): number =>
  Number(
    (cart.items || [])
      .filter((item) => item.product?.requiresShipping !== false)
      .reduce((total, item) => {
        const optionWeight = (item.selectedOptions || []).reduce(
          (sum, option) => sum + Number(option.weightAdjustment || 0),
          0,
        );
        const unitWeight = Math.max(0, Number(item.product?.weight || 0) + optionWeight);
        return total + pounds(unitWeight, item.product?.weightClass, classes) * Number(item.quantity || 0);
      }, 0)
      .toFixed(2),
  );

export const retailCartRequiresShipping = (cart: Pick<Cart, "items">): boolean =>
  (cart.items || []).some((item) => item.product?.requiresShipping !== false);
