import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("seo_urls")
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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
