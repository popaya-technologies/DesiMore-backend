import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { SystemLanguage } from "./system-language.entity";

@Entity("seo_urls")
@Unique("UQ_seo_url_keyword_scope", ["store", "language", "keyword"])
@Unique("UQ_seo_url_query_scope", ["store", "language", "query"])
export class SeoUrl {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 500 })
  query!: string;

  @Column({ type: "varchar", length: 500 })
  keyword!: string;

  @Column({
    type: "varchar",
    length: 255,
    default: "Default",
  })
  store!: string;

  @Column({
    type: "varchar",
    length: 255,
    default: "English",
  })
  language!: string;

  @Column({ type: "uuid" })
  languageId!: string;

  @ManyToOne(() => SystemLanguage, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "languageId" })
  systemLanguage!: SystemLanguage;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
