import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
@Entity("product_discounts")
export class ProductDiscount {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") productId: string;
  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;
  @Column({ length: 30 }) customerGroup: string;
  @Column("integer") quantity: number;
  @Column({ default: 0 }) priority: number;
  @Column({ type: "decimal", precision: 10, scale: 2 }) price: number;
  @Column({ type: "date", nullable: true }) dateStart: string | null;
  @Column({ type: "date", nullable: true }) dateEnd: string | null;
}
