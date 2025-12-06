import { MarketSnapshot, ProfitAssumptions, ProfitEstimateResult } from '../types/market';

export function estimateProfit(buyPrice: number, market: MarketSnapshot): ProfitEstimateResult {
  const assumptions: ProfitAssumptions = {
    ebayFeeRate: 0.13,
    paymentProcessingRate: 0.03,
    shippingCost: 5,
    otherFees: 0.5,
  };

  const expectedSalePrice = market.avgSoldPrice;
  const platformFees = expectedSalePrice * (assumptions.ebayFeeRate + assumptions.paymentProcessingRate);
  const totalCosts = buyPrice + assumptions.shippingCost + assumptions.otherFees + platformFees;
  const estimatedProfit = expectedSalePrice - totalCosts;
  const profitMarginPercent = (estimatedProfit / expectedSalePrice) * 100;

  return {
    estimatedProfitPerItem: Number(estimatedProfit.toFixed(2)),
    profitMarginPercent: Number(profitMarginPercent.toFixed(2)),
    assumptions,
  };
}
