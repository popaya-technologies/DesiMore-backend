import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("mail_requests")
export class MailRequest {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "uuid", unique: true }) requestId: string;
  @Column({ type: "uuid" }) createdBy: string;
  @Column({ type: "varchar", length: 64 }) payloadHash: string;
  @Column({ type: "varchar", length: 255 }) subject: string;
  @Column({ type: "varchar", length: 30, default: "processing" }) status: string;
  @Column({ type: "integer", default: 0 }) total: number;
  @Column({ type: "integer", default: 0 }) accepted: number;
  @Column({ type: "integer", default: 0 }) uncertain: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
