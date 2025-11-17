# taxana - Solana Tax Calculator for Indonesia

## Project Overview

taxana is a specialized tax calculation platform designed for Indonesian cryptocurrency traders on the Solana blockchain. The application automatically fetches transaction history, calculates tax obligations based on Indonesian regulations, and generates comprehensive PDF reports for tax filing purposes.

**Target Market**: Indonesian Solana traders, DeFi users, and memecoin enthusiasts who need compliant tax reporting.

---

## Problem Statement

Indonesian cryptocurrency traders face several challenges:

1. **Complexity**: Manual tracking of hundreds or thousands of transactions is impractical
2. **Compliance**: Indonesian tax law requires reporting crypto gains, but tools are limited
3. **Micro-cap Tokens**: Most tax tools don't support the micro-cap memecoins popular on Solana
4. **Language Barrier**: Most crypto tax tools are English-only without Indonesian localization
5. **Cost**: Existing solutions are expensive or don't support Solana well

**Indonesian Tax Context**:

- Crypto transactions are subject to 0.1% tax (as of latest regulation)
- Capital gains must be reported
- Most traders are unaware of their obligations or lack tools to calculate them

---

## Solution

A streamlined web application that:

- Connects to user's Solana wallet (no signup required)
- Automatically fetches and parses all swap transactions
- Calculates tax obligations using FIFO accounting
- Generates professional PDF reports ready for tax filing
- Supports micro-cap tokens through specialized Solana price APIs
- Provides Indonesian language support

---

## Core Features

### Phase 1: MVP (Month 1)

#### User Flow

1. User visits website
2. Connects Phantom wallet
3. Selects tax year
4. App fetches all transactions automatically
5. Calculates gains/losses
6. Generates downloadable PDF report

#### Technical Features

- **Wallet Connection**: Phantom wallet authentication
- **Transaction Fetching**: Retrieve complete transaction history via Helius API
- **DEX Support**: Parse swaps from Jupiter, Raydium, and Orca
- **Tax Calculation**:
  - FIFO (First In, First Out) cost basis method
  - Capital gains/losses calculation
  - IDR conversion at transaction time
  - Realized gains tracking
- **Price Data**: Multi-source approach (Birdeye → DexScreener → CoinGecko)
- **PDF Generation**: Professional tax report with:
  - Transaction summary
  - Detailed transaction list
  - Total gains/losses
  - Tax obligation breakdown
  - Disclaimers and notes

#### Non-functional Requirements

- Session-based (no user accounts)
- On-demand processing (no background jobs)
- Mobile-responsive design
- PDF downloads work on all devices

### Phase 2: Enhanced Features (Month 2-3)

- User accounts with wallet saving
- Multiple wallet support (Solflare, Backpack)
- Transaction history caching
- Email report delivery
- Export to CSV/Excel
- Multiple tax year reports
- Transaction filtering and search

### Phase 3: Advanced Features (Month 4+)

- Multi-chain support (Ethereum, BSC, Polygon)
- Complex DeFi tracking (staking, liquidity pools, lending)
- Alternative accounting methods (LIFO, specific identification)
- Tax loss harvesting suggestions
- Integration with Indonesian tax filing portals
- API access for accountants
- Bulk wallet processing
- White-label solution for accounting firms

---

## Technical Architecture

### Technology Stack

#### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (subtle, professional)
- **Wallet Adapter**: @solana/wallet-adapter-react
- **State Management**: React Context / Zustand (if needed)

#### Backend

- **Framework**: Next.js API Routes
- **Database**: PostgreSQL 15+
- **ORM**: Prisma or Drizzle
- **Caching**: Redis (for price data and transaction caching)

#### External Services

- **Blockchain Data**: Helius API
- **Price Data (Primary)**: Birdeye API
- **Price Data (Fallback)**: DexScreener API, CoinGecko API
- **PDF Generation**: react-pdf with @react-pdf/renderer
- **Analytics**: Vercel Analytics or self-hosted Plausible

#### Infrastructure

- **Hosting**: Self-hosted VPS (existing)
- **Database**: PostgreSQL on VPS
- **Domain**: Owned (e.g., taxana.id or pajak-solana.com)
- **SSL**: Let's Encrypt (free)
- **CDN**: Cloudflare (free tier)

### System Architecture

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│      Next.js Frontend           │
│  - Wallet Connection UI         │
│  - Transaction Display          │
│  - PDF Preview/Download         │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│    Next.js API Routes           │
│  - Transaction Processing       │
│  - Tax Calculations             │
│  - PDF Generation               │
└──────┬─────────┬────────────────┘
       │         │
       ↓         ↓
┌──────────┐ ┌──────────────────┐
│PostgreSQL│ │  External APIs   │
│ Database │ │  - Helius        │
│          │ │  - Birdeye       │
│          │ │  - DexScreener   │
└──────────┘ └──────────────────┘
```

### Database Schema (MVP)

```sql
-- Cache for transaction data
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  signature VARCHAR(88) UNIQUE NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  type VARCHAR(20), -- 'swap', 'transfer', etc.
  from_token VARCHAR(44),
  from_amount DECIMAL(20, 8),
  to_token VARCHAR(44),
  to_amount DECIMAL(20, 8),
  dex VARCHAR(20), -- 'jupiter', 'raydium', 'orca'
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cache for price data
CREATE TABLE token_prices (
  id UUID PRIMARY KEY,
  token_address VARCHAR(44) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  price_usd DECIMAL(20, 8),
  price_idr DECIMAL(20, 8),
  source VARCHAR(20), -- 'birdeye', 'dexscreener', 'coingecko'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(token_address, timestamp)
);

-- Cache for generated reports
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  tax_year INTEGER NOT NULL,
  total_trades INTEGER,
  total_gain_loss_idr DECIMAL(20, 2),
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_token_prices_lookup ON token_prices(token_address, timestamp);
```

---

## Price Data Strategy

### The Challenge

Solana users frequently trade micro-cap memecoins (10K-2M market cap) that aren't listed on mainstream price APIs like CoinGecko.

### Multi-Source Waterfall Approach

```javascript
async function getTokenPrice(tokenAddress, timestamp) {
  // 1. Check cache first
  const cached = await checkPriceCache(tokenAddress, timestamp);
  if (cached) return cached;

  // 2. Try Birdeye (best for Solana)
  try {
    const birdeyePrice = await fetchBirdeyePrice(tokenAddress, timestamp);
    if (birdeyePrice) return cacheAndReturn(birdeyePrice);
  } catch (error) {
    console.log("Birdeye failed, trying DexScreener...");
  }

  // 3. Try DexScreener (good for micro-caps)
  try {
    const dexScreenerPrice = await fetchDexScreenerPrice(
      tokenAddress,
      timestamp
    );
    if (dexScreenerPrice) return cacheAndReturn(dexScreenerPrice);
  } catch (error) {
    console.log("DexScreener failed, trying CoinGecko...");
  }

  // 4. Try CoinGecko (major tokens only)
  try {
    const coinGeckoPrice = await fetchCoinGeckoPrice(tokenAddress, timestamp);
    if (coinGeckoPrice) return cacheAndReturn(coinGeckoPrice);
  } catch (error) {
    console.log("CoinGecko failed");
  }

  // 5. Mark for manual entry
  return { price: null, requiresManualEntry: true };
}
```

### Handling Missing Price Data

**Approach 1: Manual Entry**

- Flag transactions with missing prices
- Allow user to input cost basis manually
- Store user-provided prices for future reports

**Approach 2: Best Effort Estimation**

- Use closest available price data
- Clearly mark estimated values in report
- Provide disclaimer about estimation

**Approach 3: Conservative Default**

- Mark as $0 cost basis (worst case for user)
- Let user override if they have records

---

## Infrastructure & Costs

### MVP Phase (Month 1-3)

**Monthly Costs: $0**

| Service         | Plan          | Cost | Notes              |
| --------------- | ------------- | ---- | ------------------ |
| VPS             | Existing      | $0   | Already owned      |
| Domain          | Existing      | $0   | Already owned      |
| Helius API      | Free Tier     | $0   | 100k credits/month |
| Birdeye API     | Free Tier     | $0   | 50 req/min         |
| DexScreener     | Free          | $0   | No auth needed     |
| CoinGecko       | Free Tier     | $0   | 10-50 calls/min    |
| SSL Certificate | Let's Encrypt | $0   | Auto-renewal       |
| PostgreSQL      | Self-hosted   | $0   | On VPS             |

**Storage Requirements**: ~5-10GB for database (included in VPS)

### Growth Phase (100+ active users)

**Monthly Costs: ~$70-100**

| Service       | Plan        | Cost         |
| ------------- | ----------- | ------------ |
| Helius API    | Pro         | $50          |
| Birdeye API   | Free → Paid | $0-30        |
| Email Service | SendGrid    | $20          |
| CDN           | Cloudflare  | $0 (Free)    |
| **Total**     |             | **~$70-100** |

### Scale Phase (1000+ users)

**Monthly Costs: ~$150-250**

- Better API tiers
- Potential second VPS for load balancing
- CDN for PDF delivery
- Email service upgrade
- Analytics tools

---

## Development Roadmap

### Week 1: Foundation

- [ ] Set up Next.js project with TypeScript
- [ ] Configure Tailwind CSS + design system
- [ ] Implement Phantom wallet connection
- [ ] Set up PostgreSQL database
- [ ] Create basic UI layout

### Week 2: Transaction Processing

- [ ] Integrate Helius API
- [ ] Fetch transaction history
- [ ] Parse Jupiter swaps
- [ ] Parse Raydium swaps
- [ ] Parse Orca swaps
- [ ] Store transactions in database

### Week 3: Tax Calculation & Prices

- [ ] Integrate Birdeye API
- [ ] Implement price data waterfall
- [ ] Build FIFO calculation engine
- [ ] Calculate gains/losses in IDR
- [ ] Handle edge cases (missing prices, etc.)

### Week 4: PDF Generation & Polish

- [ ] Design PDF template
- [ ] Implement PDF generation
- [ ] Add transaction filtering
- [ ] Error handling and loading states
- [ ] Mobile responsiveness
- [ ] Deploy to VPS

### Week 5: Testing & Launch

- [ ] Test with real wallets
- [ ] Fix bugs
- [ ] Add analytics
- [ ] Write documentation
- [ ] Soft launch to crypto communities
- [ ] Gather feedback

---

## Monetization Strategy

### Phase 1: Free Beta (Month 1-2)

- Completely free to build user base
- Gather feedback
- Refine features
- Build credibility

### Phase 2: Freemium Model (Month 3+)

**Free Tier**

- 50 transactions per tax year
- Basic PDF report
- Single wallet
- Community support

**Pro Tier - $15/year** (~200k IDR)

- Unlimited transactions
- Multiple wallets
- Enhanced PDF reports
- Priority support
- Email delivery
- CSV export

**Premium Tier - $30/year** (~450k IDR)

- Everything in Pro
- Multi-year reports
- Tax consultant consultation (1 hour)
- API access
- Early access to new features

### Phase 3: Alternative Models

**Pay-Per-Report**: $5 per tax year report (one-time)
**Accountant Tier**: $100/year (bulk processing, white-label)
**Enterprise**: Custom pricing for firms

### Revenue Projections (Conservative)

**Year 1**

- 100 free users
- 20 pro users × $15 = $300
- 5 premium users × $30 = $150
- **Total: ~$450**

**Year 2** (with marketing)

- 500 free users
- 100 pro users × $15 = $1,500
- 20 premium users × $30 = $600
- 5 accountant tier × $100 = $500
- **Total: ~$2,600**

**Year 3** (established)

- 2,000 free users
- 400 pro users × $15 = $6,000
- 80 premium users × $30 = $2,400
- 20 accountant tier × $100 = $2,000
- **Total: ~$10,400**

---

## Marketing Strategy

### Pre-Launch (Week 1-4)

- Build landing page with email capture
- Create educational content about crypto taxes in Indonesia
- Engage in Indonesian crypto communities (Twitter, Telegram, Discord)
- Partner with Indonesian crypto influencers

### Launch (Month 1-2)

- Product Hunt launch (if applicable)
- Press release to Indonesian crypto media
- Free beta for early adopters
- Twitter/X campaign with hashtags: #PajakCrypto #SolanaTax #CryptoIndonesia
- YouTube tutorial videos

### Growth (Month 3-6)

- **Content Marketing**:
  - Blog posts about crypto taxes
  - "How to report Solana trades" guides
  - Memecoin tax implications
- **SEO Optimization**:
  - Target: "pajak crypto indonesia"
  - "cara lapor pajak solana"
  - "tax calculator solana"
- **Community Building**:
  - Discord server for users
  - Regular AMAs about crypto taxes
  - Partner with tax consultants
- **Referral Program**:
  - Give 1 month free Pro for each referral
  - Influencer affiliate program (20% commission)

### Partnerships

- Indonesian crypto exchanges (Indodax, Tokocrypto)
- Tax consultant firms
- Crypto influencers and educators
- Solana ecosystem projects

---

## Legal & Compliance

### Required Disclaimers

```
"taxana provides tax calculations based on publicly available
information and should not be considered as tax advice. Always
consult with a qualified tax professional before filing your taxes.
We are not responsible for the accuracy of price data from third-party
sources or for any tax filing decisions made using this tool."
```

### Terms of Service Must Include

- No guarantee of tax calculation accuracy
- User responsible for verifying data
- No liability for tax filing errors
- Right to modify service
- Data retention policy
- Refund policy

### Privacy Policy

- What data we collect (wallet addresses, transactions)
- How we use it (generate reports only)
- Data storage (encrypted, on secure VPS)
- No selling of user data
- Right to delete data

### Indonesian Regulations

- Stay updated on Indonesian crypto tax laws
- Clearly state current tax rates and regulations
- Update calculations when laws change
- Consider consulting with Indonesian tax lawyer

---

## Risk Assessment

### Technical Risks

| Risk                       | Impact   | Likelihood | Mitigation                           |
| -------------------------- | -------- | ---------- | ------------------------------------ |
| API rate limits exceeded   | High     | Medium     | Caching, upgrade to paid tiers       |
| Missing price data         | High     | High       | Multi-source approach + manual entry |
| Incorrect tax calculations | Critical | Low        | Thorough testing, legal disclaimers  |
| VPS downtime               | Medium   | Low        | Regular backups, monitoring          |
| Transaction parsing errors | High     | Medium     | Extensive testing with real wallets  |

### Business Risks

| Risk               | Impact | Likelihood | Mitigation                     |
| ------------------ | ------ | ---------- | ------------------------------ |
| Low user adoption  | High   | Medium     | Strong marketing, free tier    |
| Regulatory changes | Medium | Medium     | Stay informed, adapt quickly   |
| Competition        | Medium | Low        | Solana-first niche, Indo focus |
| User doesn't pay   | Low    | Medium     | Free tier sufficient for most  |

### Legal Risks

| Risk                   | Impact   | Likelihood | Mitigation                       |
| ---------------------- | -------- | ---------- | -------------------------------- |
| Tax calculation errors | High     | Low        | Clear disclaimers, testing       |
| Data breach            | Critical | Low        | Encryption, minimal data storage |
| Regulatory compliance  | Medium   | Low        | Consult legal experts            |

---

## Success Metrics

### MVP Success Criteria (Month 1)

- ✅ 50+ unique wallets analyzed
- ✅ 25+ PDF reports generated
- ✅ <5 second average processing time
- ✅ >90% transaction parsing accuracy
- ✅ >80% price data coverage
- ✅ Positive user feedback (surveys)

### Growth Metrics (Month 3-6)

- 500+ total users
- 10%+ conversion to paid tier
- <2% churn rate
- 4+ star average rating
- 20+ organic testimonials
- 1000+ monthly visitors

### Long-term KPIs (Year 1)

- 2000+ registered users
- $2000+ MRR (Monthly Recurring Revenue)
- 15%+ conversion rate
- Featured in Indonesian crypto media
- Partnership with 2+ tax consultants

---

## Competitive Analysis

### Existing Solutions

**CoinTracker**

- ❌ Expensive ($59+/year)
- ❌ Not optimized for Solana
- ❌ No Indonesian focus
- ✅ Mature product

**Koinly**

- ❌ Expensive (£79+/year)
- ❌ Poor Solana support
- ❌ No IDR calculations
- ✅ Many features

**ZenLedger**

- ❌ US-focused
- ❌ Expensive
- ❌ Limited Solana coverage

**Our Advantages**

- ✅ Solana-first approach
- ✅ Indonesian tax law specific
- ✅ Micro-cap token support
- ✅ Affordable pricing
- ✅ Indonesian language support
- ✅ No signup required for basic use

---

## Future Expansion Opportunities

### Geographic Expansion

- Malaysia crypto tax calculator
- Singapore crypto reporting
- Philippines tax compliance
- Other Southeast Asian markets

### Feature Expansion

- NFT transaction tracking
- Staking rewards calculation
- Airdrops and rewards tracking
- DeFi yield farming tax implications
- Real-time portfolio tracking
- Tax loss harvesting optimizer
- Integration with Indonesian e-filing system

### B2B Opportunities

- White-label for accounting firms
- API for crypto exchanges
- Institutional reporting tools
- Accounting software integrations

---

## Team & Resources Needed

### MVP Phase (Solo Developer)

- **You**: Full-stack development
- **Time Commitment**: 4-6 weeks, 20-30 hours/week
- **External**: Beta testers from crypto community

### Growth Phase

- **Developer** (You): Product development
- **Part-time Designer**: UI/UX improvements
- **Tax Consultant**: Advisory role (contract basis)
- **Content Writer**: Indonesian crypto tax content

### Scale Phase

- Full-time co-founder or senior developer
- Marketing specialist
- Customer support
- Tax/legal advisor

---

## Exit Strategy

### Potential Paths

**Acquisition Targets**

- Indonesian crypto exchanges (Indodax, Tokocrypto)
- International tax software (CoinTracker, Koinly)
- Solana ecosystem projects
- Indonesian fintech companies

**Bootstrap to Profitability**

- Build sustainable $5-10k MRR business
- Run lean with automation
- Passive income stream

**Pivot Opportunities**

- General Indonesian crypto tax tool (all chains)
- Crypto accounting software
- Portfolio tracking app
- Tax consultation marketplace

---

## Action Items (Next Steps)

### Immediate (This Week)

1. [ ] Research Indonesian crypto tax regulations in detail
2. [ ] Register for Helius API key (free tier)
3. [ ] Register for Birdeye API key (free tier)
4. [ ] Set up Next.js project repository
5. [ ] Design basic wireframes/mockups

### Short-term (Week 1-2)

6. [ ] Set up PostgreSQL database on VPS
7. [ ] Implement wallet connection
8. [ ] Test Helius API integration
9. [ ] Build transaction fetching logic
10. [ ] Create initial UI components

### Medium-term (Week 3-4)

11. [ ] Implement price data fetching
12. [ ] Build tax calculation engine
13. [ ] Design and implement PDF template
14. [ ] Add error handling
15. [ ] Deploy MVP to VPS

### Launch Prep (Week 5)

16. [ ] Test with 5-10 beta users
17. [ ] Fix critical bugs
18. [ ] Write documentation
19. [ ] Create marketing materials
20. [ ] Soft launch to crypto communities

---

## Appendix

### Useful Resources

**Indonesian Tax Regulations**

- Direktorat Jenderal Pajak: https://www.pajak.go.id
- Crypto tax guidelines (search for latest updates)

**Technical Documentation**

- Helius API: https://docs.helius.dev
- Birdeye API: https://docs.birdeye.so
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
- Wallet Adapter: https://github.com/solana-labs/wallet-adapter

**Competitor Analysis**

- CoinTracker: https://www.cointracker.io
- Koinly: https://koinly.io
- CryptoTaxCalculator: https://cryptotaxcalculator.io

**Community**

- Indonesian Crypto Twitter/X communities
- Solana Indonesia Telegram groups
- r/cryptocurrency Indonesia discussions

---
