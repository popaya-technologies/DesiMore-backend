import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("product_returns")
export class ProductReturn {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  orderId!: string;

  @Column({ type: "date", nullable: true })
  orderDate!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  customer!: string | null;

  @Column({ type: "varchar", length: 255 })
  firstName!: string;

  @Column({ type: "varchar", length: 255 })
  lastName!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  telephone!: string | null;

  @Column({ type: "varchar", length: 500 })
  product!: string;

  @Column({ type: "varchar", length: 255 })
  model!: string;

  @Column({ type: "integer", default: 1 })
  quantity!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  returnReason!: string | null;

  @Column({ type: "boolean", default: false })
  opened!: boolean;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  returnAction!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  returnStatus!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
