import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("customer_groups")
export class CustomerGroup {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) name: string;
  @Column({ type: "text", default: "" }) description: string;
  @Column({ type: "boolean", default: false }) approveNewCustomers: boolean;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
