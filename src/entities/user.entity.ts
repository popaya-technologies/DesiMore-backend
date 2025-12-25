import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from "typeorm";
import * as bcrypt from "bcryptjs";
import { UserRole } from "./user-role.entity";
import { Order } from "./order.entity";
import { WholesaleOrderRequest } from "./wholesale-order-request.entity";
import { Cart } from "./cart.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  firstname: string;

  @Column({ type: "varchar", length: 50 })
  lastname: string;

  @Column({ type: "varchar", length: 100 })
  fullname: string;

  @Column({ type: "varchar", length: 50, unique: true })
  username: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 20, unique: true })
  phone: string;

  @Column({ type: "varchar", length: 255, select: false })
  password: string;

  @Column({ type: "varchar", length: 20, default: "user" })
  userRole: string;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(
    () => WholesaleOrderRequest,
    (request) => request.user
  )
  wholesaleOrderRequests: WholesaleOrderRequest[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @Column({ type: "varchar", length: 255, nullable: true })
  avatar: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, select: false })
  refreshToken: string | null;

  @Column({ type: "varchar", length: 6, nullable: true, select: false })
  resetPasswordOtp: string | null;

  @Column({ type: "timestamp", nullable: true, select: false })
  resetPasswordOtpExpiry: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  private passwordModified = false;

  @BeforeInsert()
  @BeforeUpdate()
  async updateFullnameAndHashPassword() {
    // Update fullname before insert/update
    if (this.firstname && this.lastname) {
      this.fullname = `${this.firstname} ${this.lastname}`;
    }

    // Hash password if modified
    if (
      this.passwordModified &&
      this.password &&
      !this.isPasswordHashed(this.password)
    ) {
      this.password = await bcrypt.hash(this.password, 10);
      this.passwordModified = false;
    }

    // Ensure username is lowercase
    if (this.username) {
      this.username = this.username.toLowerCase();
    }

    // Ensure email is lowercase for consistent lookups
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
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

  isSuperAdmin(): boolean {
    return this.userRole === "su";
  }
}
