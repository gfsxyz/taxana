'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { TransactionTable } from '@/components/transaction-table';
import { Wallet, FileText, Shield, ArrowRight, Calculator } from 'lucide-react';

export default function Home() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const walletAddress = publicKey?.toBase58() || '';

  // tRPC mutations and queries
  const fetchTransactionsMutation = trpc.transactions.fetchTransactions.useMutation();
  const transactionsQuery = trpc.transactions.getTransactions.useQuery(
    { walletAddress, year: selectedYear || 2024 },
    { enabled: connected && !!selectedYear }
  );

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const handleDisconnect = () => {
    disconnect();
    setSelectedYear(null);
  };

  const handleSelectYear = async (year: number) => {
    setSelectedYear(year);
    setIsFetching(true);

    try {
      await fetchTransactionsMutation.mutateAsync({
        walletAddress,
        year,
      });
      // Refetch transactions after fetching from Helius
      transactionsQuery.refetch();
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Taxana</span>
          </div>

          {connected ? (
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono">
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnectWallet} size="sm">
              <Wallet className="h-4 w-4 mr-2" />
              Hubungkan Wallet
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!connected ? (
          // Hero Section - Not Connected
          <div className="max-w-3xl mx-auto text-center py-16">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Hitung Pajak Crypto Solana Anda
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Kalkulator pajak otomatis untuk trader Solana Indonesia. Dukung Jupiter, Raydium, dan Orca. Laporan PDF siap untuk pelaporan SPT.
            </p>

            <Button size="lg" onClick={handleConnectWallet} className="mb-12">
              <Wallet className="h-5 w-5 mr-2" />
              Hubungkan Phantom Wallet
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <Card>
                <CardHeader>
                  <Wallet className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Tanpa Registrasi</CardTitle>
                  <CardDescription>
                    Cukup hubungkan wallet Phantom Anda. Data diproses secara aman dan tidak disimpan permanen.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Laporan PDF</CardTitle>
                  <CardDescription>
                    Generate laporan pajak lengkap dengan detail transaksi, siap untuk pelaporan SPT tahunan.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Sesuai Regulasi</CardTitle>
                  <CardDescription>
                    Perhitungan PPh 0.2% dan PPN 0.22% sesuai peraturan pajak crypto Indonesia untuk DEX.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        ) : !selectedYear ? (
          // Year Selection - Connected but no year selected
          <div className="max-w-xl mx-auto text-center py-16">
            <h2 className="text-2xl font-bold mb-2">Pilih Tahun Pajak</h2>
            <p className="text-muted-foreground mb-8">
              Pilih tahun pajak yang ingin Anda hitung
            </p>

            <div className="flex gap-4 justify-center">
              {years.map((year) => (
                <Button
                  key={year}
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6"
                  onClick={() => handleSelectYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        ) : isFetching || fetchTransactionsMutation.isPending ? (
          // Loading State
          <div className="max-w-xl mx-auto text-center py-16">
            <Spinner className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Mengambil Transaksi...</h2>
            <p className="text-muted-foreground">
              Sedang mengambil riwayat transaksi dari blockchain Solana untuk tahun {selectedYear}
            </p>
          </div>
        ) : (
          // Results - Transactions loaded
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Transaksi {selectedYear}</h2>
                <p className="text-muted-foreground">
                  {transactionsQuery.data?.length || 0} transaksi ditemukan
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedYear(null)}
                >
                  Ganti Tahun
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Transaksi</CardDescription>
                  <CardTitle className="text-2xl">
                    {transactionsQuery.data?.length || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Status</CardDescription>
                  <CardTitle className="text-2xl">
                    <Badge variant="secondary">POC - Tanpa Kalkulasi</Badge>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>DEX Terdeteksi</CardDescription>
                  <CardTitle className="text-2xl">
                    {transactionsQuery.data
                      ? [...new Set(transactionsQuery.data.map(tx => tx.dex))].filter(Boolean).length
                      : 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Transaction Table */}
            <Card>
              <CardContent className="pt-6">
                <TransactionTable
                  transactions={transactionsQuery.data || []}
                  isLoading={transactionsQuery.isLoading}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan dengan konsultan pajak profesional.
          </p>
        </div>
      </footer>
    </div>
  );
}
