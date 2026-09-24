import { AppDataSource } from "../data-source";
import { EntityManager } from "typeorm";
import { Order } from "../entities/order.entity";
import { WholesaleOrderRequest } from "../entities/wholesale-order-request.entity";

const ORDER_PREFIX = "INV";
const WHOLESALE_PREFIX = "WS";
const PAD_WIDTH = 6;

const padNumber = (value: number) => value.toString().padStart(PAD_WIDTH, "0");

const extractSequence = (reference?: string | null) => {
  if (!reference) return null;
  const parts = reference.split("-");
  if (parts.length < 3) return null;
  const parsed = parseInt(parts[2], 10);
  return isNaN(parsed) ? null : parsed;
};

const getLatestSequence = async (
  prefix: string,
  year: number,
  entity: typeof Order | typeof WholesaleOrderRequest,
  column: "orderNumber" | "requestNumber",
  manager?: EntityManager,
): Promise<number> => {
  const repo = (manager || AppDataSource.manager).getRepository(entity);
  if (manager)
    await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      prefix + year,
    ]);
  const prefixWithYear = `${prefix}-${year}-`;

  const latest = await repo
    .createQueryBuilder("record")
    .select(`record.${column}`, "ref")
    .where(`record.${column} LIKE :prefix`, { prefix: `${prefixWithYear}%` })
    .orderBy(`record.${column}`, "DESC")
    .limit(1)
    .getRawOne<{ ref?: string }>();

  return extractSequence(latest?.ref) ?? 0;
};

const buildReference = (prefix: string, year: number, sequence: number) =>
  `${prefix}-${year}-${padNumber(sequence)}`;

export const generateOrderNumber = async (
  manager?: EntityManager,
): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const lastSeq = await getLatestSequence(
    ORDER_PREFIX,
    currentYear,
    Order,
    "orderNumber",
    manager,
  );
  return buildReference(ORDER_PREFIX, currentYear, lastSeq + 1);
};

export const generateWholesaleRequestNumber = async (
  manager?: EntityManager,
): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const lastSeq = await getLatestSequence(
    WHOLESALE_PREFIX,
    currentYear,
    WholesaleOrderRequest,
    "requestNumber",
    manager,
  );
  return buildReference(WHOLESALE_PREFIX, currentYear, lastSeq + 1);
};
