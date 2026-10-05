import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("weight_classes")
export class WeightClass {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 100, unique: true }) weightTitle: string;
  @Column({ type: "varchar", length: 32, unique: true }) weightUnit: string;
  @Column({ type: "numeric", precision: 20, scale: 8, default: 1,
    transformer: { to: (value: number) => value, from: (value: string) => Number(value) } }) value: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
