import { router } from '../trpc/trpc';
import { transactionsRouter } from './transactions';

export const appRouter = router({
  transactions: transactionsRouter,
});

export type AppRouter = typeof appRouter;
