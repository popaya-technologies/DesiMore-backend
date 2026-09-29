import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Order } from "./order.entity";

@Entity("order_history")
@Index("IDX_order_history_order", ["orderId", "createdAt"])
export class OrderHistory {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") orderId: string;
  @ManyToOne(() => Order, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" }) order: Order;
  @Column({ type: "varchar", length: 50 }) status: string;
  @Column({ type: "text", default: "" }) comment: string;
  @Column({ type: "varchar", length: 255, nullable: true }) carrierName: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) trackingNumber: string | null;
  @Column({ default: false }) customerNotified: boolean;
  @Column({ default: false }) override: boolean;
  @Column({ type: "uuid", nullable: true }) createdBy: string | null;
  @CreateDateColumn() createdAt: Date;
}

// Archival is scoped to the cancelled-orders admin page. Accounting records stay intact.
@Entity("cancelled_order_archives")
export class CancelledOrderArchive {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "uuid", unique: true }) orderId: string;
  @ManyToOne(() => Order, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "orderId" }) order: Order;
  @Column({ type: "uuid", nullable: true }) createdBy: string | null;
  @CreateDateColumn() createdAt: Date;
}
