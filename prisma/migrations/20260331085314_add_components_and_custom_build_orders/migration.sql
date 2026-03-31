-- CreateTable
CREATE TABLE "Component" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "price" REAL NOT NULL,
    "oldPrice" REAL,
    "description" TEXT NOT NULL,
    "specs" TEXT NOT NULL DEFAULT '{}',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComponentImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "componentId" INTEGER NOT NULL,
    CONSTRAINT "ComponentImage_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomBuildOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "comment" TEXT,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "buildItems" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Component_slug_key" ON "Component"("slug");
