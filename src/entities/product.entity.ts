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
  OneToMany,
} from "typeorm";
import { Category } from "./category.entity";
import { Brand } from "./brand.entity";
import { Message } from "./message.entity";
import { ProductAttribute } from "./product-attribute.entity";
import { ProductOption } from "./product-option.entity";
import { ProductDiscount } from "./product-discount.entity";
import { ProductImage } from "./product-image.entity";
import { Download } from "./download.entity";

@Entity("products")
export class Product {
  @Column({ type: "varchar", nullable: true, length: 100 })
  sku: string | null;

  @Column({ type: "varchar", nullable: true, length: 100 })
  mpn: string | null;

  @Column({ type: "integer", default: 1 })
  minimumQuantity: number;

  @Column({ type: "boolean", default: true })
  subtractStock: boolean;

  @Column({ type: "varchar", default: "out_of_stock", length: 30 })
  outOfStockStatus: string;

  @Column({ type: "boolean", default: true })
  requiresShipping: boolean;

  @Column({ type: "date", nullable: true })
  dateAvailable: string | null;

  @Column({ type: "varchar", default: "inch", length: 20 })
  lengthClass: string;

  @Column({ type: "varchar", default: "pound", length: 20 })
  weightClass: string;

  @Column({ type: "integer", default: 0 })
  sortOrder: number;

  @Column({ type: "integer", default: 0 })
  wholesaleQuantity: number;

  @Column({ type: "integer", default: 1 })
  wholesaleMinimumQuantity: number;

  @Column({ type: "boolean", default: true })
  wholesaleRequiresShipping: boolean;

  @Column({ type: "date", nullable: true })
  wholesaleDateAvailable: string | null;

  @Column({ type: "decimal", nullable: true, precision: 10, scale: 2 })
  wholesaleLength: number | null;

  @Column({ type: "decimal", nullable: true, precision: 10, scale: 2 })
  wholesaleWidth: number | null;

  @Column({ type: "decimal", nullable: true, precision: 10, scale: 2 })
  wholesaleHeight: number | null;

  @Column({ type: "decimal", nullable: true, precision: 10, scale: 2 })
  wholesaleWeight: number | null;

  @Column({ type: "varchar", default: "inch", length: 20 })
  wholesaleLengthClass: string;

  @Column({ type: "varchar", default: "pound", length: 20 })
  wholesaleWeightClass: string;

  @OneToMany(() => ProductAttribute, (row) => row.product)
  attributes: ProductAttribute[];
  @OneToMany(() => ProductOption, (row) => row.product)
  options: ProductOption[];
  @OneToMany(() => ProductDiscount, (row) => row.product)
  discounts: ProductDiscount[];
  @OneToMany(() => ProductImage, (row) => row.product)
  imageDetails: ProductImage[];
  @ManyToMany(() => Download)
  @JoinTable({
    name: "product_downloads",
    joinColumn: { name: "productId" },
    inverseJoinColumn: { name: "downloadId" },
  })
  downloads: Download[];
  @ManyToMany(() => Product)
  @JoinTable({
    name: "product_related",
    joinColumn: { name: "productId" },
    inverseJoinColumn: { name: "relatedProductId" },
  })
  relatedProducts: Product[];
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

  @Column({ type: "jsonb", nullable: true })
  package: {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;

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

  @ManyToMany(() => Message, (message) => message.products)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
