import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
export interface FilterValue {
  id: string;
  name: string;
  sortOrder: number;
}
@Entity("filter_groups")
export class FilterGroup {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) name: string;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) values: FilterValue[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
