import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export interface BannerSlide {
  title: string;
  link: string;
  image: string;
  sortOrder: number;
}

export type BannerPlacement = "home_slideshow" | "footer_payments" | "custom";

@Entity("banners")
export class Banner {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255 }) name: string;
  @Column({ type: "varchar", length: 50, default: "custom" }) placement: BannerPlacement;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) slides: BannerSlide[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
