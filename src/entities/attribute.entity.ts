import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { AttributeGroup, DEFAULT_ATTRIBUTE_GROUP_ID } from "./attribute-group.entity";

@Entity("attributes")
@Unique("UQ_attribute_group_name", ["attributeGroupId", "name"])
export class Attribute {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255 }) name: string;
  @Column({ type: "uuid", default: DEFAULT_ATTRIBUTE_GROUP_ID }) attributeGroupId: string;
  @ManyToOne(() => AttributeGroup, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "attributeGroupId" }) attributeGroup: AttributeGroup;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
