import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("return_statuses")
export class ReturnStatus {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 100, unique: true }) name: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
