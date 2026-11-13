export const UPS_SHIPPING_CODES = ["ups.03", "ups.12", "ups.02", "ups.01"] as const;
export type UpsShippingCode = (typeof UPS_SHIPPING_CODES)[number];
