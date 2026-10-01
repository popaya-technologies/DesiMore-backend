import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import * as bcrypt from "bcryptjs";

@Entity("system_users")
export class SystemUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "varchar",
    length: 50,
    unique: true,
  })
  username!: string;

  @Column({
    type: "varchar",
    length: 30,
  })
  userGroup!: string;

  @Column({
    type: "varchar",
    length: 50,
  })
  firstName!: string;

  @Column({
    type: "varchar",
    length: 50,
  })
  lastName!: string;

  @Column({
    type: "varchar",
    length: 255,
    unique: true,
  })
  email!: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image!: string | null;

  @Column({
    type: "varchar",
    length: 255,
    select: false,
  })
  password!: string;

  @Column({
    type: "boolean",
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  private passwordModified = false;

  @BeforeInsert()
  @BeforeUpdate()
  async normalizeAndHashPassword() {
    // Keep username lowercase
    if (this.username) {
      this.username = this.username.trim().toLowerCase();
    }

    // Keep email lowercase
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }

    // Trim user group and names
    if (this.userGroup) {
      this.userGroup = this.userGroup.trim();
    }

    if (this.firstName) {
      this.firstName = this.firstName.trim();
    }

    if (this.lastName) {
      this.lastName = this.lastName.trim();
    }

    // Hash password only when it was changed
    if (
      this.passwordModified &&
      this.password &&
      !this.isPasswordHashed(this.password)
    ) {
      this.password = await bcrypt.hash(this.password, 10);
      this.passwordModified = false;
    }
  }

  private isPasswordHashed(password: string): boolean {
    return /^\$2[aby]\$\d{2}\$.{53}$/.test(password);
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return await bcrypt.compare(attempt, this.password);
  }

  setPassword(newPassword: string) {
    this.password = newPassword;
    this.passwordModified = true;
  }
}
