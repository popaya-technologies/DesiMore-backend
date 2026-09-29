import { plainToInstance } from "class-transformer";
import { validate, isUUID } from "class-validator";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus } from "../entities/order.entity";
import { OrderHistory, CancelledOrderArchive } from "../entities/cancelled-order.entity";
import { CancelledOrderHistoryDto, CancelledOrderBulkDto } from "../dto/cancelled-order.dto";
import { ApiError } from "../utils/api-error";
import { sendEmail } from "../utils/email";

export function cancelledOrderId(id: string) {
  if (!isUUID(id)) throw new ApiError(400, "Invalid order ID");
  return id.toLowerCase();
}
export async function validateCancelledInput<T extends object>(type: new () => T, input: unknown): Promise<T> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid request body");
  const dto = plainToInstance(type, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid cancelled order data", errors);
  return dto;
}
export function cancelledOrderQuery(input: Record<string, unknown>) {
  const allowed = ["orderId", "customer", "total", "dateAdded", "dateModified", "page", "limit", "sortBy", "sortOrder"];
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key) || typeof value !== "string") throw new ApiError(400, `Invalid query parameter: ${key}`);
  }
  const q = input as Record<string, string>;
  const integer = (key: string, fallback: number, max: number) => {
    if (q[key] === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(q[key]) || !Number.isSafeInteger(Number(q[key])) || Number(q[key]) > max) throw new ApiError(400, `Invalid ${key}`);
    return Number(q[key]);
  };
  const page = integer("page", 1, Number.MAX_SAFE_INTEGER), limit = integer("limit", 10, 100);
  if (!Number.isSafeInteger((page - 1) * limit)) throw new ApiError(400, "Invalid page");
  for (const key of ["dateAdded", "dateModified"]) {
    if (q[key] !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(q[key]) || !Number.isFinite(Date.parse(q[key])) || new Date(q[key]).toISOString().slice(0, 10) !== q[key])) throw new ApiError(400, `Invalid ${key}; use YYYY-MM-DD`);
  }
  if (q.total !== undefined && !/^\d{1,10}(\.\d{1,2})?$/.test(q.total)) throw new ApiError(400, "Invalid total");
  for (const key of ["orderId", "customer"]) if (q[key]?.length > 255) throw new ApiError(400, `${key} is too long`);
  const sortBy = q.sortBy ?? "createdAt", sortOrder = q.sortOrder ?? "DESC";
  if (!["orderNumber", "customer", "total", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder)) throw new ApiError(400, "Invalid sort");
  return { orderId: q.orderId, customer: q.customer, total: q.total, dateAdded: q.dateAdded, dateModified: q.dateModified, page, limit, sortBy, sortOrder: sortOrder as "ASC" | "DESC" };
}
function activeQuery(manager?: EntityManager) {
  return (manager ?? AppDataSource).getRepository(Order).createQueryBuilder("o")
    .where("o.status = :cancelled", { cancelled: OrderStatus.CANCELLED })
    .andWhere('NOT EXISTS (SELECT 1 FROM "cancelled_order_archives" a WHERE a."orderId" = o.id)');
}
const userFields = ["firstname", "lastname", "fullname", "email", "phone", "userRole"];
function withCustomer(qb: ReturnType<typeof activeQuery>) {
  return qb.leftJoin("o.user", "customer").addSelect(["customer.id", ...userFields.map(f => `customer.${f}`)]);
}
function summary(order: Order) {
  const fields = ["id", "orderNumber", "userId", "status", "paymentStatus", "paymentMethod", "subtotal", "tax", "shipping", "total", "createdAt", "updatedAt", "billingAddress", "shippingAddress"];
  return { ...Object.fromEntries(fields.map(f => [f, order[f]])), user: order.user ? Object.fromEntries(userFields.map(f => [f, order.user[f] ?? null])) : null };
}
const literalSearch = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;
export function buildCancelledListQuery(input: Record<string, unknown>) {
  const q = cancelledOrderQuery(input), qb = withCustomer(activeQuery());
  if (q.orderId) qb.andWhere("o.orderNumber ILIKE :orderId", { orderId: literalSearch(q.orderId) });
  if (q.customer) qb.andWhere("(customer.fullname ILIKE :customer OR CONCAT_WS(' ', customer.firstname, customer.lastname) ILIKE :customer OR customer.email ILIKE :customer)", { customer: literalSearch(q.customer) });
  if (q.total !== undefined) qb.andWhere("o.total = :total", { total: q.total });
  for (const [key, column] of [["dateAdded", "createdAt"], ["dateModified", "updatedAt"]]) {
    if (q[key]) qb.andWhere(`o.${column} >= CAST(:${key} AS date) AND o.${column} < CAST(:${key} AS date) + INTERVAL '1 day'`, { [key]: q[key] });
  }
  qb.orderBy(q.sortBy === "customer" ? "customer.fullname" : `o.${q.sortBy}`, q.sortOrder).addOrderBy("o.id", q.sortOrder).skip((q.page - 1) * q.limit).take(q.limit);
  return { qb, q };
}
export async function listCancelledOrders(input: Record<string, unknown>) {
  const { qb, q } = buildCancelledListQuery(input);
  const [rows, total] = await qb.getManyAndCount();
  return { data: rows.map(summary), meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) } };
}
export async function getCancelledOrder(id: string) {
  id = cancelledOrderId(id);
  const order = await withCustomer(activeQuery()).leftJoinAndSelect("o.items", "item").leftJoin("item.product", "product").addSelect(["product.id", "product.model"]).andWhere("o.id = :id", { id }).getOne();
  if (!order) throw new ApiError(404, "Cancelled order not found");
  const history = await AppDataSource.getRepository(OrderHistory).find({ where: { orderId: id }, order: { createdAt: "DESC", id: "DESC" } });
  return { ...summary(order), notes: order.notes, tracking: order.tracking ?? { carrier: null, trackingNumber: null }, items: order.items.map(item => ({ id: item.id, productId: item.productId, productName: item.productName, productImages: item.productImages, model: item.product?.model ?? null, price: item.price, discountedPrice: item.discountedPrice, quantity: item.quantity, total: item.total, selectedOptions: item.selectedOptions })), history };
}
async function lockCancelled(manager: EntityManager, id: string) {
  const order = await activeQuery(manager).andWhere("o.id = :id", { id }).setLock("pessimistic_write").getOne();
  // Recheck archival after obtaining the order lock to cover concurrent archival.
  if (!order || await manager.getRepository(CancelledOrderArchive).findOneBy({ orderId: id })) throw new ApiError(404, "Cancelled order not found");
  return order;
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export async function addCancelledHistory(id: string, input: unknown, actorId: string) {
  id = cancelledOrderId(id);
  const dto = await validateCancelledInput(CancelledOrderHistoryDto, input);
  const { history, order } = await AppDataSource.transaction(async manager => {
    const order = await lockCancelled(manager, id);
    // Existing order flow forbids reopening and delegates refunds to the payment flow.
    if (dto.status !== OrderStatus.CANCELLED) throw new ApiError(409, "Cancelled orders cannot be reopened or refunded here, including with override; use the existing payment refund flow");
    order.status = dto.status;
    if (dto.comment !== undefined) order.notes = dto.comment;
    await manager.getRepository(Order).save(order);
    const repository = manager.getRepository(OrderHistory);
    const history = await repository.save(repository.create({ orderId: id, status: dto.status, comment: dto.comment ?? "", override: dto.override, customerNotified: false, carrierName: order.tracking?.carrier ?? null, trackingNumber: order.tracking?.trackingNumber ?? null, createdBy: actorId }));
    return { history, order };
  });
  let notification = dto.notifyCustomer ? "failed" : "not_requested";
  if (dto.notifyCustomer) {
    try {
      const recipient = order.shippingAddress?.email;
      if (!recipient) throw new Error("Missing recipient");
      await sendEmail({ to: recipient, subject: `Order ${order.orderNumber} status: cancelled`, html: `<p>Order ${escapeHtml(order.orderNumber)} is cancelled.</p><p>${escapeHtml(dto.comment ?? "").replace(/\n/g, "<br>")}</p>` });
      notification = "sent";
    } catch { notification = "failed"; }
    if (notification === "sent") {
      // A provider acceptance is not a guarantee of inbox delivery.
      try {
        await AppDataSource.getRepository(OrderHistory).update(history.id, { customerNotified: true });
        history.customerNotified = true;
      } catch {
        throw new ApiError(500, "History saved and email accepted, but notification audit update failed; do not resend automatically");
      }
    }
  }
  return { message: notification === "failed" ? "Order history added successfully, but customer notification failed" : "Order history added successfully", history, notification };
}
export async function archiveCancelledOrders(input: unknown, actorId: string) {
  const dto = await validateCancelledInput(CancelledOrderBulkDto, input);
  const ids = dto.ids.map(id => id.toLowerCase()).sort();
  await AppDataSource.transaction(async manager => {
    for (const id of ids) await lockCancelled(manager, id);
    const repo = manager.getRepository(CancelledOrderArchive);
    await repo.save(ids.map(orderId => repo.create({ orderId, createdBy: actorId })));
  });
  return { message: "Cancelled orders deleted successfully", deletedCount: ids.length, deletionMode: "archive" };
}
