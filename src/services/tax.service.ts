import { EntityManager, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { Cart } from "../entities/cart.entity";
import { GeoZone } from "../entities/geo_zone.entity";
import { Store } from "../entities/store.entity";
import { TaxClassRule, TaxRate } from "../entities/tax-class.entity";

// Tax calculation in the OpenCart way:
//   product tax class -> its rules (ordered by priority)
//   -> each rule picks an address by "based on" (shipping / payment / store)
//   -> the rule's tax rate applies when that address is inside the rate's geo zone
//   -> percentage = % of the line price, fixed = amount per unit
//   -> results are grouped per tax rate (e.g. "Sales Tax").
// Tax rate customer groups are not matched yet: customers have no customer group
// until the Customers module, so every rate applies to all customers.

export interface TaxAddress {
  country?: string | null;
  state?: string | null;
}

export interface TaxableItem {
  taxClassId?: string | null;
  // Unit price the customer pays for the item.
  price: number;
  quantity: number;
}

export interface TaxLine {
  taxRateId: string;
  name: string;
  rate: number;
  type: string;
  amount: number;
}

export interface TaxResult {
  lines: TaxLine[];
  total: number;
}

const normalize = (value?: string | null) =>
  String(value ?? "").trim().toLowerCase();

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

// Addresses keep country as an ISO-2 code or name and state as a zone code or name,
// so a geo zone location matches on any of those.
const isInGeoZone = (address: TaxAddress, geoZone: GeoZone) => {
  const country = normalize(address.country);
  const state = normalize(address.state);
  if (!country) return false;

  return (geoZone.locations ?? []).some((location) => {
    const countryValues = [
      location.country?.name,
      location.country?.isoCode2,
      location.country?.isoCode3,
    ].map(normalize);
    if (!countryValues.includes(country)) return false;

    // No zone on the location means "All Zones" of the country.
    if (!location.zoneId) return true;
    return [location.zone?.name, location.zone?.code]
      .map(normalize)
      .filter(Boolean)
      .includes(state);
  });
};

// The store address is the main (first created) store's country and region/state.
const loadStoreAddress = async (manager: EntityManager): Promise<TaxAddress> => {
  const [store] = await manager.getRepository(Store).find({
    select: ["id", "country", "regionState"],
    order: { createdAt: "ASC" },
    take: 1,
  });
  return { country: store?.country, state: store?.regionState };
};

export const calculateTax = async (
  items: TaxableItem[],
  addresses: { shipping?: TaxAddress | null; payment?: TaxAddress | null },
  manager: EntityManager = AppDataSource.manager,
): Promise<TaxResult> => {
  const taxClassIds = [
    ...new Set(
      items
        .map((item) => item.taxClassId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!taxClassIds.length) return { lines: [], total: 0 };

  const rules = await manager.getRepository(TaxClassRule).find({
    where: { taxClassId: In(taxClassIds) },
    relations: {
      taxRate: {
        geoZone: { locations: { country: true, zone: true } },
      },
    },
    order: { priority: "ASC", id: "ASC" },
  });

  const shipping = addresses.shipping ?? null;
  // The billing address falls back to the shipping address.
  const payment = addresses.payment ?? shipping;
  const store = rules.some((rule) => rule.basedOn === "store")
    ? await loadStoreAddress(manager)
    : null;

  // Rates that apply to each tax class for these addresses (each rate once per class).
  const ratesByClass = new Map<string, Map<string, TaxRate>>();
  for (const rule of rules) {
    const address =
      rule.basedOn === "payment"
        ? payment
        : rule.basedOn === "store"
          ? store
          : shipping;
    const rate = rule.taxRate;
    // Like OpenCart, a rate without a geo zone applies nowhere.
    if (!address || !rate?.geoZone || !isInGeoZone(address, rate.geoZone)) continue;

    const classRates = ratesByClass.get(rule.taxClassId) ?? new Map<string, TaxRate>();
    classRates.set(rate.id, rate);
    ratesByClass.set(rule.taxClassId, classRates);
  }

  const totals = new Map<string, TaxLine>();
  for (const item of items) {
    const classRates = item.taxClassId ? ratesByClass.get(item.taxClassId) : null;
    if (!classRates) continue;

    const quantity = Math.max(Number(item.quantity) || 0, 0);
    const lineTotal = (Number(item.price) || 0) * quantity;

    for (const rate of classRates.values()) {
      const value = Number(rate.rate) || 0;
      const amount =
        rate.type === "fixed" ? value * quantity : (lineTotal * value) / 100;

      const line = totals.get(rate.id) ?? {
        taxRateId: rate.id,
        name: rate.name,
        rate: value,
        type: rate.type,
        amount: 0,
      };
      line.amount += amount;
      totals.set(rate.id, line);
    }
  }

  const lines = [...totals.values()]
    .map((line) => ({ ...line, amount: roundMoney(line.amount) }))
    .filter((line) => line.amount > 0);

  return {
    lines,
    total: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
  };
};

// Taxable items of a cart loaded with its items and their products.
export const cartTaxItems = (cart: Cart): TaxableItem[] =>
  (cart.items ?? []).map((item) => ({
    taxClassId: item.product?.taxClassId ?? null,
    price: Number(item.price),
    quantity: item.quantity,
  }));
