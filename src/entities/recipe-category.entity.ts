import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Recipe } from "./recipe.entity";

@Entity("recipe_categories")
export class RecipeCategory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  name: string;

  @Column({
    type: "text",
    default: "",
  })
  description: string;

  @Column({
    type: "varchar",
    length: 255,
  })
  metaTitle: string;

  @Column({
    type: "text",
    default: "",
  })
  metaDescription: string;

  @Column({
    type: "text",
    default: "",
  })
  metaKeywords: string;

  @Column({
    type: "uuid",
    nullable: true,
  })
  parent: string | null;

  @Column({
    type: "text",
    nullable: true,
  })
  image: string | null;

  @Column({
    type: "boolean",
    default: false,
  })
  top: boolean;

  @Column({
    type: "integer",
    default: 1,
  })
  columns: number;

  @Column({
    type: "integer",
    default: 0,
  })
  sortOrder: number;

  @Column({
    type: "boolean",
    default: true,
  })
  isActive: boolean;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
    nullable: true,
  })
  seoKeyword: string | null;

  @ManyToMany(() => Recipe, recipe => recipe.categories)
  recipes: Recipe[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
