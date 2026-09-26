import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("carriers")
export class Carrier {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "integer", default: 0 })
  trackingNoLength!: number;

  @Column({ type: "varchar", length: 50, default: "Exact" })
  match!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  carrierUrl!: string | null;

  @Column({ type: "integer", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
