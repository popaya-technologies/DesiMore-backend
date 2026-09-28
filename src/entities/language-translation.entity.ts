import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";
@Entity("language_translations")
@Unique("UQ_language_translation_scope", ["store", "language", "route", "key"])
export class LanguageTranslation {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 100, default: "Default" }) store: string;
  @Column({ type: "varchar", length: 50, default: "English" }) language: string;
  @Column({ type: "varchar", length: 255 }) route: string;
  @Column({ type: "varchar", length: 255 }) key: string;
  @Column({ type: "text" }) value: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
