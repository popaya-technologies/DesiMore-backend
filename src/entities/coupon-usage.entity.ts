import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("coupon_usages")
@Index(["couponId", "orderId"], { unique: true })
export class CouponUsage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  couponId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "uuid" })
  orderId: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  discount: number;

  @CreateDateColumn()
  createdAt: Date;
}
