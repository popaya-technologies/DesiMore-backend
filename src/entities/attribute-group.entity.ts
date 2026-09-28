import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
export const DEFAULT_ATTRIBUTE_GROUP_ID = "b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc";
@Entity("attribute_groups")
export class AttributeGroup {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) name: string;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
