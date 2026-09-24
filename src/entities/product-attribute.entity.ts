import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
@Entity("product_attributes")
export class ProductAttribute {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") productId: string;
  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;
  @Column({ length: 255 }) name: string;
  @Column("text") text: string;
  @Column({ default: 0 }) sortOrder: number;
}
