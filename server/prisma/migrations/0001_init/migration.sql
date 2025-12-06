-- CreateEnum? none
CREATE TABLE "Product" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "buyPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MarketData" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "platform" TEXT NOT NULL,
    "avgSoldPrice" DECIMAL NOT NULL,
    "minSoldPrice" DECIMAL NOT NULL,
    "maxSoldPrice" DECIMAL NOT NULL,
    "numSales" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ProfitEstimate" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "estimatedProfitPerItem" DECIMAL NOT NULL,
    "profitMarginPercent" DECIMAL NOT NULL,
    "assumptionsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
