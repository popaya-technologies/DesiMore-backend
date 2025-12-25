import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Order } from "./order.entity";

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  PAYPAL = "paypal",
  BANK_TRANSFER = "bank_transfer",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Order)
  @JoinColumn({ name: "orderId" })
  order: Order;

  @Column({ type: "uuid" })
  orderId: string;

  @Column({ type: "varchar", nullable: true })
  transactionId: string;

  @Column({ type: "varchar", nullable: true })
  authCode: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 3, default: "USD" })
  currency: string;

  @Column({ type: "varchar", length: 50, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: "varchar", length: 50 })
  paymentMethod: PaymentMethod;

  @Column({ type: "jsonb", nullable: true })
  paymentDetails: {
    cardType?: string;
    lastFour?: string;
    expirationDate?: string;
    // For security, we don't store full card details
  };

  @Column({ type: "text", nullable: true })
  failureMessage: string;

  @Column({ type: "jsonb", nullable: true })
  authorizeNetResponse: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
