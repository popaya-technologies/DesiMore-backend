import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
import { Attribute } from "./attribute.entity";
@Entity("product_attributes")
export class ProductAttribute {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") productId: string;
  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;
  @Column("uuid", { nullable: true }) attributeId: string | null;
  @ManyToOne(() => Attribute, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "attributeId" })
  attribute: Attribute | null;
  // Retained as a snapshot for legacy rows and backward-compatible responses.
  @Column({ length: 255 }) name: string;
  @Column("text") text: string;
  @Column({ default: 0 }) sortOrder: number;
}
