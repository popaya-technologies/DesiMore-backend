import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
@Entity("downloads")
export class Download {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ length: 255 }) name: string;
  @Column("text") url: string;
  @Column({ type: "text", nullable: true, select: false }) storagePath:
    string | null;
  @CreateDateColumn() createdAt: Date;
}
