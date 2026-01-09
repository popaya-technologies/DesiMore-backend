import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { WholesaleOrderItem } from "./wholesale-order-item.entity";

export enum WholesaleOrderRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  DELIVERED = "delivered",
}

@Entity("wholesale_order_requests")
export class WholesaleOrderRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.wholesaleOrderRequests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", unique: true })
  requestNumber: string;

  @OneToMany(() => WholesaleOrderItem, (item) => item.request, {
    cascade: true,
  })
  items: WholesaleOrderItem[];

  @Column({ type: "decimal", precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  shipping: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  total: number;

  @Column({
    type: "varchar",
    length: 50,
    default: WholesaleOrderRequestStatus.PENDING,
  })
  status: WholesaleOrderRequestStatus;

  @Column({ type: "jsonb" })
  shippingAddress: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  billingAddress?: Record<string, any>;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "text", nullable: true })
  adminNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
