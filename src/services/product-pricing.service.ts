import { Product } from "../entities/product.entity";
import { SelectedOptionDto } from "../dto/selected-option.dto";
import { ApiError } from "../utils/api-error";
import { isISO8601 } from "class-validator";

export const isWholesaler = (user: any) =>
  user?.userRole === "wholesaler" ||
  user?.roles?.some((r) => r.name === "wholesaler");
export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export const freight = (value: number) =>
  value >= 3500
    ? 0
    : value >= 3000
      ? 75
      : value >= 2500
        ? 95
        : value >= 1500
          ? 125
          : value >= 1200
            ? 150
            : value > 0
              ? 199
              : 0;
export const effectivePrice = (
  product: Product,
  quantity: number,
  wholesale = false,
  today = new Date().toISOString().slice(0, 10),
) => {
  const rules = (product.discounts || []).filter(
    (d) =>
      d.customerGroup === (wholesale ? "wholesaler" : "default") &&
      quantity >= d.quantity &&
      (!d.dateStart || d.dateStart <= today) &&
      (!d.dateEnd || d.dateEnd >= today),
  );
  // Largest applicable quantity break, then lowest priority number, then lowest price.
  rules.sort(
    (a, b) =>
      b.quantity - a.quantity ||
      a.priority - b.priority ||
      Number(a.price) - Number(b.price),
  );
  const price = rules.length
    ? Number(rules[0].price)
    : Number(
        wholesale
          ? product.wholesalePrice
          : (product.discountPrice ?? product.price),
      );
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    (wholesale && product.wholesalePrice == null)
  )
    throw new ApiError(400, "Invalid product price");
  return price;
};
export const quoteProduct = (
  product: Product,
  quantity: number,
  selected: SelectedOptionDto[] = [],
  wholesale = false,
) => {
  const today = new Date().toISOString().slice(0, 10);
  if (!product || !product.isActive)
    throw new ApiError(400, "Product is unavailable");
  const date = wholesale
    ? product.wholesaleDateAvailable
    : product.dateAvailable;
  if (date && date > today)
    throw new ApiError(400, "Product is not available yet");
  const minimum =
    (wholesale ? product.wholesaleMinimumQuantity : product.minimumQuantity) ??
    1;
  if (!Number.isInteger(quantity) || quantity < minimum)
    throw new ApiError(400, "Minimum quantity is " + minimum);
  if (!wholesale && !product.inStock)
    throw new ApiError(400, "Product is out of stock");
  const available = Number(
    wholesale ? product.wholesaleQuantity : product.quantity,
  );
  if (
    (wholesale || product.subtractStock !== false) &&
    (!Number.isFinite(available) || quantity > available)
  )
    throw new ApiError(
      400,
      "Insufficient " + (wholesale ? "wholesale " : "") + "stock",
    );
  const options = product.options || [];
  if (new Set(selected.map((s) => s.optionId)).size !== selected.length)
    throw new ApiError(400, "Duplicate option selection");
  if (selected.some((s) => !options.some((o) => o.id === s.optionId)))
    throw new ApiError(400, "Unknown product option");
  let adjustment = 0,
    points = 0,
    weight = 0;
  const snapshot = [];
  for (const option of options) {
    const selection = selected.find((s) => s.optionId === option.id);
    const choice = ["checkbox", "select", "radio"].includes(option.type);
    const ids = selection?.valueIds || [];
    const text = selection?.text?.trim();
    if (choice && text)
      throw new ApiError(400, "Choice option cannot contain text");
    if (!choice && ids.length)
      throw new ApiError(400, "Text option cannot contain value IDs");
    if (option.required && (choice ? !ids.length : !text))
      throw new ApiError(400, "Required option: " + option.name);
    if (!selection || (choice ? !ids.length : !text)) continue;
    if (
      new Set(ids).size !== ids.length ||
      (option.type !== "checkbox" && ids.length > 1)
    )
      throw new ApiError(400, "Invalid option selection");
    if (!choice && ["date", "time", "datetime"].includes(option.type)) {
      const valid =
        option.type === "time"
          ? /^([01]\d|2[0-3]):[0-5]\d$/.test(text)
          : option.type === "date"
            ? /^\d{4}-\d{2}-\d{2}$/.test(text) &&
              isISO8601(text, { strict: true })
            : isISO8601(text, { strict: true });
      if (!valid) throw new ApiError(400, "Invalid date/time option");
    }
    let priceDelta = 0,
      pointsDelta = 0,
      weightDelta = 0;
    const values = ids.map((id) => {
      const value = option.values.find((v) => v.id === id);
      if (!value) throw new ApiError(400, "Unknown option value");
      if (value.subtractStock && quantity > value.quantity)
        throw new ApiError(400, "Insufficient option stock");
      priceDelta += (value.pricePrefix === "-" ? -1 : 1) * Number(value.price);
      pointsDelta +=
        (value.pointsPrefix === "-" ? -1 : 1) * Number(value.points);
      weightDelta +=
        (value.weightPrefix === "-" ? -1 : 1) * Number(value.weight);
      return value.value;
    });
    adjustment += priceDelta;
    points += pointsDelta;
    weight += weightDelta;
    snapshot.push({
      optionId: option.id,
      name: option.name,
      ...(choice ? { valueIds: ids, values } : { text }),
      priceAdjustment: roundMoney(priceDelta),
      pointsAdjustment: pointsDelta,
      weightAdjustment: roundMoney(weightDelta),
    });
  }
  const price = roundMoney(
    effectivePrice(product, quantity, wholesale) + adjustment,
  );
  if (price < 0)
    throw new ApiError(400, "Option adjustments produce a negative price");
  return {
    price,
    selectedOptions: snapshot,
    points,
    weight: roundMoney(
      Number(wholesale ? product.wholesaleWeight || 0 : product.weight || 0) +
        weight,
    ),
    requiresShipping: wholesale
      ? product.wholesaleRequiresShipping !== false
      : product.requiresShipping !== false,
  };
};
export const selectionKey = (selections: SelectedOptionDto[] = []) =>
  JSON.stringify(
    selections
      .map((s) => ({
        optionId: s.optionId,
        valueIds: [...(s.valueIds || [])].sort(),
        text: s.text?.trim() || "",
      }))
      .sort((a, b) => a.optionId.localeCompare(b.optionId)),
  );
