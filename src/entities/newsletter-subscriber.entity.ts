import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("newsletter_subscribers")
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 254, unique: true }) email: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
