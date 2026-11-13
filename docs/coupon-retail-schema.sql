CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS "productIds" uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "categoryIds" uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "couponCode" varchar(255);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "couponId" uuid NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "orderId" uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_coupon_usage_order" UNIQUE ("couponId", "orderId")
);

CREATE INDEX IF NOT EXISTS "IDX_coupon_usages_coupon" ON coupon_usages ("couponId");
CREATE INDEX IF NOT EXISTS "IDX_coupon_usages_customer" ON coupon_usages ("couponId", "userId");
