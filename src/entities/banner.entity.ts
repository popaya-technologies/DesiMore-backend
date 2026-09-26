import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export interface BannerSlide {
  title: string;
  link: string;
  image: string;
  sortOrder: number;
}

@Entity("banners")
export class Banner {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255 }) name: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) slides: BannerSlide[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
