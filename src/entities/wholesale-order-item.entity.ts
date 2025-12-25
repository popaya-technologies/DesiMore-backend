import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WholesaleOrderRequest } from "./wholesale-order-request.entity";

@Entity("wholesale_order_items")
export class WholesaleOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(
    () => WholesaleOrderRequest,
    (request) => request.items,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "requestId" })
  request: WholesaleOrderRequest;

  @Column({ type: "uuid" })
  requestId: string;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "varchar" })
  productName: string;

  @Column("text", { array: true, default: [] })
  productImages: string[];

  @Column({ type: "integer" })
  requestedBoxes: number;

  @Column({ type: "varchar", nullable: true })
  wholesaleOrderQuantity: string | null;

  @Column({ type: "integer", nullable: true })
  unitsPerCarton: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  wholesalePrice: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  effectivePricePerCarton: number;

  @Column({ type: "integer", nullable: true })
  totalUnits: number | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  total: number;

  calculateTotals(): void {
    const unitsPerCarton = this.unitsPerCarton ?? 0;
    this.totalUnits = unitsPerCarton
      ? unitsPerCarton * this.requestedBoxes
      : null;
    this.total = Number(
      (this.effectivePricePerCarton * this.requestedBoxes).toFixed(2)
    );
  }
}
