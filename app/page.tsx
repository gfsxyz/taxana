"use client";

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { TransactionTable } from '@/components/transaction-table';
import {
  Wallet,
  FileText,
  Shield,
  ArrowRight,
  Calculator,
  TrendingUp,
  TrendingDown,
  Zap,
  Lock,
  BarChart3,
  ChevronRight,
  Github,
  Twitter
} from 'lucide-react';
import type { TaxSummary } from '@/lib/services/tax-calculator';

// Helper to format IDR
function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Home() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Progress tracking
  const [fetchProgress, setFetchProgress] = useState(0);
  const [fetchStep, setFetchStep] = useState('');
  const [calcProgress, setCalcProgress] = useState(0);
  const [calcStep, setCalcStep] = useState('');
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const walletAddress = publicKey?.toBase58() || "";

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Progress simulation for fetching
  const startFetchProgress = () => {
    setFetchProgress(0);
    setFetchStep('Menghubungi blockchain Solana...');

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 8;

      if (progress < 30) {
        setFetchStep('Mengambil data transaksi dari Helius...');
      } else if (progress < 60) {
        setFetchStep('Memproses transaksi swap...');
      } else if (progress < 85) {
        setFetchStep('Menyimpan ke database...');
      } else {
        setFetchStep('Menyelesaikan...');
      }

      if (progress >= 90) {
        progress = 90;
      }

      setFetchProgress(progress);
    }, 300);
  };

  const stopFetchProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setFetchProgress(100);
    setFetchStep('Selesai!');
  };

  // Progress simulation for tax calculation
  const startCalcProgress = () => {
    setCalcProgress(0);
    setCalcStep('Mengambil harga token...');

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 6;

      if (progress < 40) {
        setCalcStep('Mengambil harga token dari API...');
      } else if (progress < 60) {
        setCalcStep('Menghitung cost basis (FIFO)...');
      } else if (progress < 80) {
        setCalcStep('Menghitung keuntungan/kerugian...');
      } else {
        setCalcStep('Menghitung kewajiban pajak...');
      }

      if (progress >= 90) {
        progress = 90;
      }

      setCalcProgress(progress);
    }, 400);
  };

  const stopCalcProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setCalcProgress(100);
    setCalcStep('Selesai!');
  };

  // tRPC mutations and queries
  const fetchTransactionsMutation = trpc.transactions.fetchTransactions.useMutation();
  const calculateTaxesMutation = trpc.transactions.calculateTaxes.useMutation();
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
    setTaxSummary(null);
  };

  const handleSelectYear = async (year: number) => {
    setSelectedYear(year);
    setIsFetching(true);
    setTaxSummary(null);
    startFetchProgress();

    try {
      await fetchTransactionsMutation.mutateAsync({
        walletAddress,
        year,
      });
      stopFetchProgress();
      transactionsQuery.refetch();
    } catch (error) {
      console.error("Error fetching transactions:", error);
      stopFetchProgress();
    } finally {
      setTimeout(() => {
        setIsFetching(false);
      }, 500);
    }
  };

  const handleCalculateTaxes = async () => {
    if (!selectedYear) return;

    setIsCalculating(true);
    startCalcProgress();
    try {
      const result = await calculateTaxesMutation.mutateAsync({
        walletAddress,
        year: selectedYear,
      });
      stopCalcProgress();
      setTaxSummary(result);
    } catch (error) {
      console.error('Error calculating taxes:', error);
      stopCalcProgress();
    } finally {
      setTimeout(() => {
        setIsCalculating(false);
      }, 500);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedYear || !taxSummary) return;

    setIsDownloadingPdf(true);
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          year: selectedYear,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taxana-report-${selectedYear}-${walletAddress.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  // Landing Page - Not Connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Animated gradient background */}
        <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 border-b border-white/10 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Taxana</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#docs" className="text-sm text-gray-400 hover:text-white transition-colors">
                Docs
              </a>
            </nav>

            <Button
              onClick={handleConnectWallet}
              className="bg-white text-black hover:bg-gray-200 rounded-full px-4 h-9 text-sm font-medium"
            >
              Connect Wallet
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative z-10">
          <div className="container mx-auto px-6 pt-24 pb-32">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Sesuai peraturan pajak Indonesia 2024
              </div>

              {/* Main headline */}
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
                Hitung Pajak Crypto
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                  Solana Anda
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-100">
                Kalkulator pajak otomatis untuk trader Solana Indonesia.
                Dukung semua DEX populer. Generate laporan PDF untuk SPT dalam hitungan detik.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up animation-delay-200">
                <Button
                  size="lg"
                  onClick={handleConnectWallet}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-105"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Connect Phantom Wallet
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full px-6 h-12"
                >
                  Lihat Demo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-8 text-sm text-gray-500 animate-fade-in-up animation-delay-300">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Non-custodial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Instant calculation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Data tidak disimpan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div id="features" className="container mx-auto px-6 pb-32">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <div className="group relative rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-px">
                <div className="rounded-2xl bg-black p-6 h-full">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Tanpa Registrasi</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Cukup hubungkan wallet Phantom Anda. Tidak perlu email, tidak perlu password. Data diproses secara aman.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-px">
                <div className="rounded-2xl bg-black p-6 h-full">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">FIFO Cost Basis</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Perhitungan keuntungan/kerugian menggunakan metode FIFO yang sesuai standar akuntansi.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group relative rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-px">
                <div className="rounded-2xl bg-black p-6 h-full">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Laporan PDF</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Generate laporan lengkap dengan detail transaksi. Siap untuk pelaporan SPT tahunan Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tax rates section */}
          <div className="container mx-auto px-6 pb-32">
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-px">
                <div className="rounded-2xl bg-black/50 backdrop-blur-sm p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Tarif Pajak Crypto Indonesia</h2>
                    <p className="text-gray-400">Untuk transaksi melalui DEX (Unregistered Exchange)</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="text-center p-6 rounded-xl bg-white/5">
                      <div className="text-3xl font-bold text-emerald-400 mb-2">0.2%</div>
                      <div className="text-sm text-gray-400">PPh Final</div>
                      <div className="text-xs text-gray-500 mt-1">Transaksi Jual</div>
                    </div>
                    <div className="text-center p-6 rounded-xl bg-white/5">
                      <div className="text-3xl font-bold text-purple-400 mb-2">0.22%</div>
                      <div className="text-sm text-gray-400">PPN</div>
                      <div className="text-xs text-gray-500 mt-1">Transaksi Beli</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                  <Calculator className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm">Taxana</span>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan dengan konsultan pajak profesional.
              </p>

              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* CSS animations */}
        <style jsx global>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.6s ease-out forwards;
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
          }

          .animation-delay-100 {
            animation-delay: 100ms;
            opacity: 0;
          }

          .animation-delay-200 {
            animation-delay: 200ms;
            opacity: 0;
          }

          .animation-delay-300 {
            animation-delay: 300ms;
            opacity: 0;
          }
        `}</style>
      </div>
    );
  }

  // Dashboard - Connected
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Taxana</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono bg-white/10 text-gray-300 border-0">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8">
        {!selectedYear ? (
          // Year Selection
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mx-auto mb-6">
              <Calculator className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Pilih Tahun Pajak</h2>
            <p className="text-gray-400 mb-8">
              Pilih tahun pajak yang ingin Anda hitung
            </p>

            <div className="flex gap-4 justify-center">
              {years.map((year) => (
                <Button
                  key={year}
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/50 transition-all"
                  onClick={() => handleSelectYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        ) : isFetching || fetchTransactionsMutation.isPending ? (
          // Loading - Fetching
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Calculator className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Mengambil Transaksi</h2>
              <p className="text-gray-400 mb-6">Tahun pajak {selectedYear}</p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={fetchProgress} className="h-2 bg-white/10" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{fetchStep}</span>
                <span className="font-medium text-emerald-400">{Math.round(fetchProgress)}%</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Proses ini mungkin memakan waktu beberapa saat untuk wallet dengan banyak transaksi
            </p>
          </div>
        ) : isCalculating ? (
          // Loading - Calculating
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <BarChart3 className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Menghitung Pajak</h2>
              <p className="text-gray-400 mb-6">
                Menganalisis {transactionsQuery.data?.length || 0} transaksi
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={calcProgress} className="h-2 bg-white/10" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{calcStep}</span>
                <span className="font-medium text-purple-400">{Math.round(calcProgress)}%</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Mengambil harga dari Birdeye dan DexScreener untuk setiap token
            </p>
          </div>
        ) : (
          // Results
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Transaksi {selectedYear}</h2>
                <p className="text-gray-400">
                  {transactionsQuery.data?.length || 0} transaksi ditemukan
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedYear(null);
                    setTaxSummary(null);
                  }}
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                >
                  Ganti Tahun
                </Button>
                {!taxSummary && transactionsQuery.data && transactionsQuery.data.length > 0 && (
                  <Button
                    onClick={handleCalculateTaxes}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Hitung Pajak
                  </Button>
                )}
              </div>
            </div>

            {/* Tax Summary Cards */}
            {taxSummary ? (
              <>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Transaksi</p>
                    <p className="text-2xl font-bold">{taxSummary.totalTransactions}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {taxSummary.totalBuys} beli, {taxSummary.totalSells} jual
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-gray-400 mb-1">Keuntungan/Kerugian</p>
                    <p className={`text-2xl font-bold ${taxSummary.netGainLossIdr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {taxSummary.netGainLossIdr >= 0 ? (
                        <TrendingUp className="inline h-5 w-5 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-5 w-5 mr-1" />
                      )}
                      {formatIDR(Math.abs(taxSummary.netGainLossIdr))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">FIFO cost basis</p>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-gray-400 mb-1">PPh Final (0.2%)</p>
                    <p className="text-2xl font-bold">{formatIDR(taxSummary.totalPphTax)}</p>
                    <p className="text-xs text-gray-500 mt-1">Pajak transaksi jual</p>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-gray-400 mb-1">PPN (0.22%)</p>
                    <p className="text-2xl font-bold">{formatIDR(taxSummary.totalPpnTax)}</p>
                    <p className="text-xs text-gray-500 mt-1">Pajak transaksi beli</p>
                  </div>
                </div>

                {/* Total Tax Card */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Total Kewajiban Pajak</p>
                      <p className="text-3xl font-bold text-emerald-400">
                        {formatIDR(taxSummary.totalTax)}
                      </p>
                    </div>
                    <Button
                      onClick={handleDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      {isDownloadingPdf ? (
                        <>
                          <Spinner className="h-4 w-4 mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Catatan: Perhitungan ini menggunakan harga token saat ini. Untuk akurasi lebih baik,
                    gunakan harga historis pada saat transaksi dilakukan.
                  </p>
                </div>
              </>
            ) : (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Transaksi</p>
                  <p className="text-2xl font-bold">{transactionsQuery.data?.length || 0}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-0 mt-1">
                    Belum Dihitung
                  </Badge>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-gray-400 mb-1">DEX Terdeteksi</p>
                  <p className="text-2xl font-bold">
                    {transactionsQuery.data
                      ? [...new Set(transactionsQuery.data.map(tx => tx.dex))].filter(Boolean).length
                      : 0}
                  </p>
                </div>
              </div>
            )}

            {/* Transaction Table */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-6">
              <TransactionTable
                transactions={transactionsQuery.data || []}
                isLoading={transactionsQuery.isLoading}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-16">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-gray-500">
          <p>
            Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan
            dengan konsultan pajak profesional.
          </p>
        </div>
      </footer>
    </div>
  );
}
