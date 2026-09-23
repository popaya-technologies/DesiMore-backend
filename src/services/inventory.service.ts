import { EntityManager } from "typeorm";
import { Product } from "../entities/product.entity";
import { ProductOption } from "../entities/product-option.entity";
import { Cart } from "../entities/cart.entity";
import { repriceCart } from "./cart.service";
import { ApiError } from "../utils/api-error";
export interface InventoryReservation {
  productId: string;
  quantity: number;
  wholesale: boolean;
  productDeducted: boolean;
  optionValueIds: string[];
}
export const reserveCartInventory = async (
  manager: EntityManager,
  cart: Cart,
  wholesale: boolean,
): Promise<InventoryReservation[]> => {
  const ids = [...new Set(cart.items.map((i) => i.productId))].sort();
  const products = new Map<string, Product>();
  for (const id of ids) {
    const product = await manager
      .getRepository(Product)
      .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
    if (!product) throw new ApiError(400, "Product no longer exists");
    product.options = await manager
      .getRepository(ProductOption)
      .findBy({ productId: id });
    product.discounts = await manager
      .getRepository(Product)
      .createQueryBuilder("product")
      .relation(Product, "discounts")
      .of(id)
      .loadMany();
    products.set(id, product);
  }
  for (const item of cart.items) item.product = products.get(item.productId);
  repriceCart(cart, wholesale);
  const reservations: InventoryReservation[] = [];
  for (const item of cart.items) {
    const product = item.product;
    const productDeducted = wholesale || product.subtractStock !== false;
    if (productDeducted) {
      if (wholesale) product.wholesaleQuantity -= item.quantity;
      else product.quantity = String(Number(product.quantity) - item.quantity);
    }
    const optionValueIds: string[] = [];
    for (const selection of item.selectedOptions || []) {
      const option = product.options.find((o) => o.id === selection.optionId);
      for (const id of selection.valueIds || []) {
        const value = option.values.find((v) => v.id === id);
        if (value.subtractStock) {
          value.quantity -= item.quantity;
          optionValueIds.push(id);
        }
      }
    }
    reservations.push({
      productId: product.id,
      quantity: item.quantity,
      wholesale,
      productDeducted,
      optionValueIds,
    });
  }
  for (const product of products.values()) {
    await manager.getRepository(Product).save(product);
    if (product.options.length)
      await manager.getRepository(ProductOption).save(product.options);
  }
  return reservations;
};
export const releaseInventory = async (
  manager: EntityManager,
  reservations: InventoryReservation[],
) => {
  for (const id of [...new Set(reservations.map((r) => r.productId))].sort()) {
    const product = await manager
      .getRepository(Product)
      .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
    if (!product) continue;
    const options = await manager
      .getRepository(ProductOption)
      .findBy({ productId: id });
    for (const row of reservations.filter((r) => r.productId === id)) {
      if (row.productDeducted) {
        if (row.wholesale) product.wholesaleQuantity += row.quantity;
        else product.quantity = String(Number(product.quantity) + row.quantity);
      }
      for (const option of options)
        for (const value of option.values)
          if (row.optionValueIds.includes(value.id))
            value.quantity += row.quantity;
    }
    await manager.getRepository(Product).save(product);
    if (options.length)
      await manager.getRepository(ProductOption).save(options);
  }
};
