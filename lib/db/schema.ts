import { pgTable, uuid, varchar, timestamp, decimal, jsonb, integer, text, index } from 'drizzle-orm/pg-core';

// Cache for transaction data
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 44 }).notNull(),
  signature: varchar('signature', { length: 88 }).unique().notNull(),
  timestamp: timestamp('timestamp').notNull(),
  type: varchar('type', { length: 20 }), // 'swap', 'transfer', etc.
  fromToken: varchar('from_token', { length: 44 }),
  fromAmount: decimal('from_amount', { precision: 20, scale: 8 }),
  fromSymbol: varchar('from_symbol', { length: 20 }),
  toToken: varchar('to_token', { length: 44 }),
  toAmount: decimal('to_amount', { precision: 20, scale: 8 }),
  toSymbol: varchar('to_symbol', { length: 20 }),
  dex: varchar('dex', { length: 20 }), // 'jupiter', 'raydium', 'orca'
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_transactions_wallet').on(table.walletAddress),
  index('idx_transactions_timestamp').on(table.timestamp),
]);

// Cache for price data
export const tokenPrices = pgTable('token_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenAddress: varchar('token_address', { length: 44 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  priceUsd: decimal('price_usd', { precision: 20, scale: 8 }),
  priceIdr: decimal('price_idr', { precision: 20, scale: 2 }),
  source: varchar('source', { length: 20 }), // 'birdeye', 'dexscreener', 'coingecko'
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_token_prices_lookup').on(table.tokenAddress, table.timestamp),
]);

// Cache for generated reports
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 44 }).notNull(),
  taxYear: integer('tax_year').notNull(),
  totalTrades: integer('total_trades'),
  totalGainLossIdr: decimal('total_gain_loss_idr', { precision: 20, scale: 2 }),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Types for TypeScript
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TokenPrice = typeof tokenPrices.$inferSelect;
export type NewTokenPrice = typeof tokenPrices.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
