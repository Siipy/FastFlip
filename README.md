# FlipFinder (FastFlip)

Monorepo containing the FlipFinder backend (`/server`) and frontend (`/web`). FlipFinder estimates eBay resale potential for AliExpress products by comparing recent sold listings and projecting profit after fees.

## Prerequisites
- Node.js 18+
- PostgreSQL database

## Setup
1. Install dependencies from the repo root (installs workspaces):
   ```bash
   npm install --workspaces
   ```
2. Create environment files:
   - `/server/.env` based on `/server/.env.example`
   - Configure `DATABASE_URL` for PostgreSQL and `EBAY_APP_ID` for your eBay API credentials.
3. Apply Prisma migrations (requires PostgreSQL):
   ```bash
   cd server
   npx prisma migrate deploy
   ```

## Running the backend
```bash
cd server
npm run dev
```
Backend defaults to `PORT=4000` and exposes `POST /api/products/analyse` to fetch market data and profit estimates.

## Running the frontend
```bash
cd web
npm run dev
```
Use `VITE_API_BASE` in `/web/.env` to point to the backend (defaults to `http://localhost:4000`).

## Notes
- eBay integration is stubbed to return sample sold listings; swap the logic in `server/src/services/ebayService.ts` with real API calls.
- Fee assumptions live in `server/src/services/profitService.ts` and can be tuned to your store.
