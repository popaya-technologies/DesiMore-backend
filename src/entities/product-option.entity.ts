import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
import { CatalogOption } from "./option.entity";
export interface ProductOptionValue {
  id: string;
  optionValueId: string | null;
  value: string;
  quantity: number;
  subtractStock: boolean;
  pricePrefix: "+" | "-";
  price: number;
  pointsPrefix: "+" | "-";
  points: number;
  weightPrefix: "+" | "-";
  weight: number;
}
@Entity("product_options")
export class ProductOption {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") productId: string;
  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product: Product;
  @Column("uuid", { nullable: true }) optionId: string | null;
  @ManyToOne(() => CatalogOption, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "optionId" })
  option: CatalogOption | null;
  @Column({ length: 255 }) name: string;
  @Column({ length: 20 }) type: string;
  @Column({ default: false }) required: boolean;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ type: "jsonb", default: [] }) values: ProductOptionValue[];
}
