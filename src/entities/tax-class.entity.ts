import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from "typeorm";

@Entity("tax_rates")
export class TaxRate {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) name: string;
  @Column({ type: "numeric", precision: 12, scale: 4 }) rate: string;
  @Column({ type: "varchar", length: 20, default: "percentage" }) type: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity("tax_classes")
export class TaxClass {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "varchar", length: 255, unique: true }) title: string;
  @Column({ type: "text" }) description: string;
  @OneToMany(() => TaxClassRule, rule => rule.taxClass) rules: TaxClassRule[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity("tax_class_rules")
@Index("IDX_tax_class_rules_class", ["taxClassId"])
@Index("UQ_tax_class_rule_rate_basis", ["taxClassId", "taxRateId", "basedOn"], { unique: true })
export class TaxClassRule {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") taxClassId: string;
  @ManyToOne(() => TaxClass, taxClass => taxClass.rules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taxClassId" }) taxClass: TaxClass;
  @Column("uuid") taxRateId: string;
  @ManyToOne(() => TaxRate, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "taxRateId" }) taxRate: TaxRate;
  @Column({ type: "varchar", length: 20, default: "shipping" }) basedOn: string;
  @Column({ type: "integer", default: 1 }) priority: number;
}
