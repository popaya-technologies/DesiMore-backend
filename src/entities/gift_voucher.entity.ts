import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("gift_vouchers")
export class GiftVoucher {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  code!: string;

  @Column({ type: "varchar", length: 255 })
  fromName!: string;

  @Column({ type: "varchar", length: 255 })
  fromEmail!: string;

  @Column({ type: "varchar", length: 255 })
  toName!: string;

  @Column({ type: "varchar", length: 255 })
  toEmail!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  theme!: string | null;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
