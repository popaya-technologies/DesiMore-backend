import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

import { User } from "./user.entity";
import { CustomerGroup } from "./customer-group.entity";

@Entity("customer_approvals")
@Index("IDX_customer_approvals_status_created", ["status", "createdAt"])
export class CustomerApproval {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", unique: true })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid" })
  customerGroupId: string;

  @ManyToOne(() => CustomerGroup, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "customerGroupId" })
  customerGroup: CustomerGroup;

  @Column({ type: "varchar", length: 20 })
  type: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "pending",
  })
  status: string;

  @Column({
    type: "text",
    default: "",
  })
  comment: string;

  @Column({
    type: "uuid",
    nullable: true,
  })
  reviewedBy: string | null;

  @Column({
    type: "timestamp",
    nullable: true,
  })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
