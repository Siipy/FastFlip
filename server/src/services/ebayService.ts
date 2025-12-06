import { SoldListing } from '../types/market';

// Placeholder implementation for fetching sold listings from eBay API.
// This service can be extended later to use official eBay SDK calls.
export async function fetchSoldListings(keyword: string): Promise<SoldListing[]> {
  // TODO: integrate with eBay Finding API using EBAY_APP_ID
  const today = new Date();
  return [
    {
      title: `${keyword} sample item 1`,
      price: 24.99,
      currency: 'USD',
      soldAt: today.toISOString(),
    },
    {
      title: `${keyword} sample item 2`,
      price: 19.5,
      currency: 'USD',
      soldAt: new Date(today.getTime() - 86_400_000).toISOString(),
    },
    {
      title: `${keyword} sample item 3`,
      price: 27.25,
      currency: 'USD',
      soldAt: new Date(today.getTime() - 2 * 86_400_000).toISOString(),
    },
  ];
}
