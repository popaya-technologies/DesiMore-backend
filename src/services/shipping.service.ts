import { Cart } from "../entities/cart.entity";

/** Returns retail shipping weight in pounds. Cart option snapshots already
 * contain the signed adjustment, so it must only be added once per item. */
const pounds = (value: number, unit: string | null | undefined) => {
  const normalized = (unit || "pound").trim().toLowerCase();
  if (["kg", "kilogram", "kilograms"].includes(normalized)) return value * 2.2046226218;
  if (["g", "gram", "grams"].includes(normalized)) return value * 0.0022046226;
  if (["oz", "ounce", "ounces"].includes(normalized)) return value / 16;
  return value;
};

export const calculateRetailShippingWeight = (cart: Pick<Cart, "items">): number =>
  Number(
    (cart.items || [])
      .filter((item) => item.product?.requiresShipping !== false)
      .reduce((total, item) => {
        const optionWeight = (item.selectedOptions || []).reduce(
          (sum, option) => sum + Number(option.weightAdjustment || 0),
          0,
        );
        const unitWeight = Math.max(0, Number(item.product?.weight || 0) + optionWeight);
        return total + pounds(unitWeight, item.product?.weightClass) * Number(item.quantity || 0);
      }, 0)
      .toFixed(2),
  );

export const retailCartRequiresShipping = (cart: Pick<Cart, "items">): boolean =>
  (cart.items || []).some((item) => item.product?.requiresShipping !== false);
