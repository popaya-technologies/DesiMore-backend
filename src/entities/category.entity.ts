import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
import { ParentCategory } from "./parent-category.entity";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  image: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "integer", default: 0 })
  displayOrder: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaDescription: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaKeyword: string | null;

  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];

  @ManyToOne(() => ParentCategory, (parent) => parent.categories, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "parentCategoryId" })
  parentCategory: ParentCategory | null;

  @Column({ type: "uuid", nullable: true })
  parentCategoryId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateSlug() {
    if (!this.slug) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
  }
}
