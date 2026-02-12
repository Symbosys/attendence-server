/*
  Warnings:

  - You are about to drop the column `checkInGeofenceId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutGeofenceId` on the `Attendance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_checkInGeofenceId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_checkOutGeofenceId_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "checkInGeofenceId",
DROP COLUMN "checkOutGeofenceId",
ALTER COLUMN "status" SET DEFAULT 'PRESENT';

-- CreateTable
CREATE TABLE "_EmployeeGeofence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeGeofence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EmployeeGeofence_B_index" ON "_EmployeeGeofence"("B");

-- AddForeignKey
ALTER TABLE "_EmployeeGeofence" ADD CONSTRAINT "_EmployeeGeofence_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeGeofence" ADD CONSTRAINT "_EmployeeGeofence_B_fkey" FOREIGN KEY ("B") REFERENCES "Geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
