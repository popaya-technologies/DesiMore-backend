import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) categories: string[];
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) relatedProducts: string[];
  @Column({ type: "varchar", length: 255, unique: true, nullable: true }) seoKeyword: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
