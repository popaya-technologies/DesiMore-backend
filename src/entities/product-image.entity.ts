import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
@Entity("product_images")
export class ProductImage {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") productId: string;
  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;
  @Column("text") url: string;
  @Column({ default: false }) isMain: boolean;
  @Column({ default: 0 }) sortOrder: number;
}
