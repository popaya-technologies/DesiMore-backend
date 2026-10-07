import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export const PAGE_PLACEMENTS = ["footer_about_us", "footer_consumer", "footer_privacy", "top_menu", "none"] as const;
@Entity("pages")
export class Page {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255 }) title: string;
  @Column({ type: "text", default: "" }) description: string;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) media: string[];
  @Column({ type: "varchar", length: 255, default: "" }) metaTagTitle: string;
  @Column({ type: "text", default: "" }) metaTagDescription: string;
  @Column({ type: "text", default: "" }) metaTagKeywords: string;
  @Column({ type: "varchar", length: 32, default: "none" }) bottom: string;
  @Column({ type: "integer", default: 0 }) sortOrder: number;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: "varchar", length: 255, unique: true }) slug: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
