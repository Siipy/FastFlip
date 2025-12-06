import { Prisma } from '@prisma/client';

import { prisma } from '../db/client';
import { MarketSnapshot } from '../types/market';
import { fetchSoldListings } from './ebayService';
import { estimateProfit } from './profitService';

interface AnalyseProductInput {
  sourceUrl: string;
  buyPrice: number;
  currency: string;
  keywordOverride?: string;
}

export async function analyseProduct(input: AnalyseProductInput) {
  const keyword = input.keywordOverride || deriveKeywordFromUrl(input.sourceUrl);
  const listings = await fetchSoldListings(keyword);
  const marketSnapshot = aggregateMarket(listings, input.currency);
  const profitEstimate = estimateProfit(input.buyPrice, marketSnapshot);

  const product = await prisma.product.create({
    data: {
      sourceUrl: input.sourceUrl,
      title: keyword,
      buyPrice: input.buyPrice,
      currency: input.currency,
      marketData: {
        create: {
          platform: 'ebay',
          avgSoldPrice: marketSnapshot.avgSoldPrice,
          minSoldPrice: marketSnapshot.minSoldPrice,
          maxSoldPrice: marketSnapshot.maxSoldPrice,
          numSales: marketSnapshot.numSales,
          currency: marketSnapshot.currency,
          lastCheckedAt: new Date(),
        },
      },
      profitEstimates: {
        create: {
          estimatedProfitPerItem: profitEstimate.estimatedProfitPerItem,
          profitMarginPercent: profitEstimate.profitMarginPercent,
          assumptionsJson: profitEstimate.assumptions as unknown as Prisma.InputJsonValue,
        },
      },
    },
    include: {
      marketData: true,
      profitEstimates: true,
    },
  });

  return {
    product,
    marketSnapshot,
    profitEstimate,
    listings,
  };
}

function deriveKeywordFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split('/').filter(Boolean).pop();
    if (slug) {
      return slug.replace(/[-_]+/g, ' ').slice(0, 80) || 'AliExpress item';
    }
  } catch (error) {
    console.warn('Could not derive keyword from URL', error);
  }
  return 'AliExpress item';
}

function aggregateMarket(listings: { price: number; currency: string }[], currencyFallback: string): MarketSnapshot {
  const prices = listings.map((listing) => listing.price);
  const currency = listings[0]?.currency || currencyFallback;
  const avgSoldPrice = prices.reduce((acc, val) => acc + val, 0) / Math.max(prices.length, 1);
  const minSoldPrice = Math.min(...prices);
  const maxSoldPrice = Math.max(...prices);

  return {
    avgSoldPrice: Number(avgSoldPrice.toFixed(2)),
    minSoldPrice: Number(minSoldPrice.toFixed(2)),
    maxSoldPrice: Number(maxSoldPrice.toFixed(2)),
    numSales: prices.length,
    currency,
  };
}
