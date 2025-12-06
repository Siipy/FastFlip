export interface SoldListing {
  title: string;
  price: number;
  currency: string;
  soldAt: string;
}

export interface MarketSnapshot {
  avgSoldPrice: number;
  minSoldPrice: number;
  maxSoldPrice: number;
  numSales: number;
  currency: string;
}

export interface ProfitAssumptions {
  ebayFeeRate: number;
  paymentProcessingRate: number;
  shippingCost: number;
  otherFees: number;
}

export interface ProfitEstimateResult {
  estimatedProfitPerItem: number;
  profitMarginPercent: number;
  assumptions: ProfitAssumptions;
}
