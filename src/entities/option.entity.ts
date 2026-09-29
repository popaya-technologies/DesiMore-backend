import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
export interface CatalogOptionValue {
  id: string;
  name: string;
  image: string | null;
  sortOrder: number;
}
@Entity("options")
export class CatalogOption {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) name: string;
  @Column({ type: "varchar", length: 20, default: "select" }) type: string;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) values: CatalogOptionValue[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
