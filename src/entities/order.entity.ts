import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { User } from "./user.entity";
import { OrderItem } from "./order-item.entity";
import { PaymentStatus } from "./payment.entity";

// Re-export PaymentStatus for other modules to use
export { PaymentStatus };

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

// Remove duplicate PaymentStatus enum - use the one from payment.entity.ts

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", unique: true })
  orderNumber: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: "decimal", precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  shipping: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  total: number;

  @Column({ type: "varchar", length: 50, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: "varchar", length: 50, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ type: "jsonb" })
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Column({ type: "jsonb", nullable: true })
  billingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Column({ type: "varchar", nullable: true })
  paymentMethod: string;

  @Column({ type: "varchar", nullable: true })
  transactionId: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to generate order number
  generateOrderNumber(): void {
    // Authorize.Net requires invoiceNumber to be max 20 characters
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.orderNumber = `ORD${timestamp}${random}`; // Format: ORD + 8 digits + 3 digits = 14 chars
  }
}
