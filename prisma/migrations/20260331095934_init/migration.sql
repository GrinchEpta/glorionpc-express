/*
  Warnings:

  - You are about to drop the `Component` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComponentImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomBuildOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Component";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComponentImage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CustomBuildOrder";
PRAGMA foreign_keys=on;
