import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { SystemUser } from "./system-user.entity";

@Entity("system_user_groups")
export class SystemUserGroup {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  name!: string;

  @Column({ type: "text", array: true, default: () => "ARRAY[]::text[]" })
  accessPermissions!: string[];

  @Column({ type: "text", array: true, default: () => "ARRAY[]::text[]" })
  modifyPermissions!: string[];

  @OneToMany(() => SystemUser, (user) => user.userGroup)
  systemUsers!: SystemUser[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
