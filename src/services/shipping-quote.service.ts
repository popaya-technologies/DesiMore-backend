import { ApiError } from "../utils/api-error";
import { UpsShippingCode } from "../shipping.constants";
import { roundMoney } from "./product-pricing.service";

export type ShippingQuote = {
  shippingCode: UpsShippingCode;
  name: string;
  price: number;
};

// Temporary mock rates expressed per pound. They reproduce the legacy site's
// 30 lb examples and keep all client-visible and order pricing in one service.
const MOCK_UPS_METHODS: ReadonlyArray<Omit<ShippingQuote, "price"> & { ratePerPound: number }> = [
  { shippingCode: "ups.03", name: "UPS Ground", ratePerPound: 8.216 },
  { shippingCode: "ups.12", name: "UPS 3 Day Select", ratePerPound: 22.197 },
  { shippingCode: "ups.02", name: "UPS 2nd Day Air", ratePerPound: 28.6883333333 },
  { shippingCode: "ups.01", name: "UPS Next Day Air", ratePerPound: 36.0813333333 },
];

export const getMockShippingQuotes = (weightPounds: number): ShippingQuote[] => {
  if (!Number.isFinite(weightPounds) || weightPounds < 0)
    throw new ApiError(400, "Invalid shipping weight");
  if (weightPounds === 0) return [];
  return MOCK_UPS_METHODS.map(({ ratePerPound, ...method }) => ({
    ...method,
    price: roundMoney(weightPounds * ratePerPound),
  }));
};

export const getMockShippingQuote = (
  weightPounds: number,
  shippingCode: string,
): ShippingQuote => {
  const quote = getMockShippingQuotes(weightPounds).find(
    (method) => method.shippingCode === shippingCode,
  );
  if (!quote) throw new ApiError(400, "Invalid or unavailable shipping method");
  return quote;
};
