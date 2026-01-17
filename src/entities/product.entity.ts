import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { Category } from "./category.entity";
import { Brand } from "./brand.entity";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  model: string | null;

  @Column("text", { array: true, default: [] })
  images: string[];

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  discountPrice: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  wholesalePrice: number | null;

  @Column({ type: "text" })
  summary: string;

  @Column({ type: "varchar", default: "0" })
  quantity: string; // Replaced stock

  @Column({ type: "varchar", nullable: true })
  wholesaleOrderQuantity: string | null; // Previously boxQuantity

  @Column({ type: "integer", nullable: true })
  unitsPerCarton: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  weight: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  length: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  width: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  height: number | null;

  @Column({ type: "boolean", default: true })
  inStock: boolean; // New field replacing stock boolean concept

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "text", nullable: true })
  tag: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaDescription: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaKeyword: string | null;

  @ManyToOne(() => Brand, (brand) => brand.products, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "brandId" })
  brand: Brand | null;

  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: "product_categories",
    joinColumn: {
      name: "productId",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "categoryId",
      referencedColumnName: "id",
    },
  })
  categories: Category[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
