-- CreateTable
CREATE TABLE "CustomPcRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "budget" INTEGER,
    "designWishes" TEXT,
    "caseSize" TEXT,
    "purpose" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
