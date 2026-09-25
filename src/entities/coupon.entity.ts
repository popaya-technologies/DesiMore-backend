import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("coupons")
export class Coupon {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  code!: string;

  @Column({ type: "varchar", length: 50, default: "Percentage" })
  type!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: "boolean", default: false })
  customerLogin!: boolean;

  @Column({ type: "boolean", default: false })
  freeShipping!: boolean;

  @Column({ type: "date" })
  dateStart!: string;

  @Column({ type: "date" })
  dateEnd!: string;

  @Column({ type: "integer", default: 1 })
  usesPerCoupon!: number;

  @Column({ type: "integer", default: 1 })
  usesPerCustomer!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
