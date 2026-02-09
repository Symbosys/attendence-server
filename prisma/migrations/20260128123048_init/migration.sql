-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PayPeriod" AS ENUM ('FIXED_30_DAYS', 'WEEK_OFF_PAID', 'WEEK_OFF_UNPAID');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "code" TEXT NOT NULL,
    "numberOfEmployees" INTEGER,
    "address" TEXT,
    "logo" JSONB,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "gstNumber" TEXT,
    "estiblishedDate" TIMESTAMP(3),
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "payPeriod" "PayPeriod" NOT NULL DEFAULT 'WEEK_OFF_PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "id" BIGSERIAL NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptedAt" TIMESTAMP(3),
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_phone_key" ON "Company"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Company_gstNumber_key" ON "Company"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "otp_mobile_key" ON "otp"("mobile");

-- CreateIndex
CREATE INDEX "otp_mobile_idx" ON "otp"("mobile");
