import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("length_classes")
export class LengthClass {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 100, unique: true }) lengthTitle: string;
  @Column({ type: "varchar", length: 32, unique: true }) lengthUnit: string;
  @Column({ type: "numeric", precision: 20, scale: 8, default: 1,
    transformer: { to: (value: number) => value, from: (value: string) => Number(value) } }) value: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
