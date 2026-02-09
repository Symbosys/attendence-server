-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY');

-- CreateEnum
CREATE TYPE "weekOffDay" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "PunchFromGeofence" AS ENUM ('PUNCH_FROM_GEOFENCE', 'PUNCH_FROM_ANYWHERE');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "password" TEXT,
    "email" TEXT,
    "employeeCode" INTEGER,
    "designation" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "Country" TEXT,
    "salary" INTEGER,
    "birthDate" TIMESTAMP(3),
    "emergencyContactPhone" TEXT,
    "emergencyContactName" TEXT,
    "gender" "Gender",
    "bloodGroup" "BloodGroup",

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSetting" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekOffExtraPayment" BOOLEAN NOT NULL,
    "weekOffDay" TEXT NOT NULL,
    "applicableToOvertime" BOOLEAN NOT NULL,
    "shiftwiseAttendance" BOOLEAN NOT NULL,
    "payrollConfiguration" TEXT NOT NULL,
    "numberOfCasualLeaves" INTEGER NOT NULL,
    "numberOfSickLeaves" INTEGER NOT NULL,
    "numberOfPrivilegeLeaves" INTEGER NOT NULL,
    "numberOfEmergencyLeaves" INTEGER NOT NULL,
    "addDocument" JSONB,
    "multipleAttendance" BOOLEAN NOT NULL,
    "liveTracking" BOOLEAN NOT NULL,
    "mobileAttendance" BOOLEAN NOT NULL,
    "aiFingerprintVerification" BOOLEAN NOT NULL,
    "selfCustomDaywiseSalary" BOOLEAN NOT NULL,
    "viewSelfSalary" BOOLEAN NOT NULL,
    "selfOdometerReading" BOOLEAN NOT NULL,
    "dateOfJoining" TIMESTAMP(3) NOT NULL,
    "punchFromGeofence" "PunchFromGeofence" NOT NULL,

    CONSTRAINT "EmployeeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBankDetails" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "panNumber" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankIfscCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankBranchName" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "EmployeeBankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_phoneNumber_key" ON "Employee"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSetting_employeeId_key" ON "EmployeeSetting"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBankDetails_employeeId_key" ON "EmployeeBankDetails"("employeeId");

-- AddForeignKey
ALTER TABLE "EmployeeSetting" ADD CONSTRAINT "EmployeeSetting_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBankDetails" ADD CONSTRAINT "EmployeeBankDetails_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
