import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { RecipeCategory } from "./recipe-category.entity";

export interface RecipeAdditionalImage {
  image: string;
  sortOrder: number;
}

@Entity("recipes")
export class Recipe {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) name: string;
  @Column({ type: "text", default: "" }) description: string;
  @Column({ type: "varchar", length: 255 }) metaTitle: string;
  @Column({ type: "text", default: "" }) metaDescription: string;
  @Column({ type: "text", default: "" }) metaKeywords: string;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @Column({ type: "boolean", default: true }) isActive: boolean;
  @Column({ type: "text", nullable: true }) image: string | null;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) additionalImages: RecipeAdditionalImage[];
  @ManyToMany(() => RecipeCategory, category => category.recipes, { onDelete: "RESTRICT" })
  @JoinTable({
    name: "recipe_category_assignments",
    joinColumn: { name: "recipeId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "categoryId", referencedColumnName: "id" },
  })
  categories: RecipeCategory[];
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) relatedProducts: string[];
  @Column({ type: "varchar", length: 255, unique: true, nullable: true }) seoKeyword: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
