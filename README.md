# Taxana

Crypto tax calculator for Indonesian Solana users. Calculate PPh and PPN taxes on your DEX swap transactions with automatic FIFO cost basis calculation.

## User Flow

```
1. Connect Wallet
   └─> User connects Phantom wallet on landing page

2. Select Tax Year
   └─> Choose 2023, 2024, or 2025

3. Check Database
   └─> App checks for cached transactions
   └─> If found: Display results
   └─> If empty: Show "Fetch from Blockchain" prompt

4. Fetch Transactions (on demand)
   └─> Click "Refresh" or "Ambil dari Blockchain"
   └─> Fetches all SWAP transactions from Helius API
   └─> Parses Jupiter, Raydium, Orca, and other DEX swaps
   └─> Saves to PostgreSQL database

5. Calculate Taxes
   └─> Click "Hitung Pajak"
   └─> Fetches token prices from Birdeye/DexScreener
   └─> Calculates cost basis using FIFO method
   └─> Computes gains/losses in IDR
   └─> Applies Indonesian tax rates

6. Download PDF Report
   └─> Click "Download PDF"
   └─> Generates comprehensive tax report
   └─> Includes all transactions, calculations, and disclaimer
```

## Features

- **Non-custodial**: Only reads public blockchain data, no private keys required
- **Automatic transaction parsing**: Detects swaps from Jupiter, Raydium, Orca, Meteora, and more
- **FIFO cost basis**: First In, First Out calculation method for gains/losses
- **Database caching**: Transactions and prices cached to minimize API calls
- **PDF report generation**: Detailed report ready for SPT filing
- **Indonesian tax compliance**: PPh 0.2% on sells, PPN 0.22% on buys (DEX rates)

## Tax Rates

For transactions through DEX (Unregistered Exchange):

| Tax Type | Rate | Applied To |
|----------|------|------------|
| PPh Final | 0.2% | Sell transactions |
| PPN | 0.22% | Buy transactions |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **API**: tRPC for type-safe endpoints
- **UI**: Tailwind CSS + shadcn/ui components
- **PDF**: React-PDF for report generation
- **Wallet**: Solana Wallet Adapter (Phantom)

## Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database
- Helius API key
- Birdeye API key

## Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taxana

# Helius API (for Solana transactions)
HELIUS_API_KEY=your_helius_api_key

# Birdeye API (for token prices)
BIRDEYE_API_KEY=your_birdeye_api_key
```

## Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Run development server
pnpm dev
```

## Project Structure

```
taxana/
├── app/
│   ├── api/
│   │   ├── pdf/          # PDF generation endpoint
│   │   └── trpc/         # tRPC API handler
│   ├── layout.tsx
│   └── page.tsx          # Main app (landing + dashboard)
├── components/
│   ├── ui/               # shadcn components
│   └── transaction-table.tsx
├── lib/
│   ├── db/
│   │   └── schema.ts     # Drizzle schema
│   ├── pdf/
│   │   └── tax-report.tsx # PDF template
│   ├── services/
│   │   ├── price.ts      # Token price fetching
│   │   └── tax-calculator.ts # FIFO calculation
│   └── trpc/
│       └── client.ts
└── server/
    └── routers/
        └── transactions.ts # Main API logic
```

## API Integrations

### Helius
- Fetches all SWAP transactions for a wallet
- Uses cursor-based pagination to get complete history
- Endpoint: `GET /v0/addresses/{address}/transactions?type=SWAP`

### Birdeye
- Primary source for token prices
- 3-hour cache for major tokens (SOL, USDC, USDT)
- Endpoint: `GET /defi/price?address={mint}`

### DexScreener
- Fallback when Birdeye fails
- Used for newer/smaller tokens
- Endpoint: `GET /latest/dex/tokens/{mint}`

## Database Schema

### transactions
- `id`, `walletAddress`, `signature`, `timestamp`
- `type` (BUY/SELL), `dex`
- `inputToken`, `inputAmount`, `inputMint`
- `outputToken`, `outputAmount`, `outputMint`

### tokenPrices
- `id`, `tokenMint`, `priceUsd`, `timestamp`
- Cached prices to reduce API calls

### reports
- `id`, `walletAddress`, `year`, `generatedAt`
- `totalTransactions`, `totalTax`, `pdfUrl`

## Development

```bash
# Type check
pnpm tsc --noEmit

# Build
pnpm build

# Database studio
pnpm db:studio
```

## Disclaimer

Taxana is a tax calculation tool for informational purposes only. It is not tax advice and should not be relied upon as such. Always consult with a qualified tax professional for your specific tax situation. The creators of Taxana are not responsible for any errors in calculations or any tax liabilities that may arise from using this tool.

## License

MIT
