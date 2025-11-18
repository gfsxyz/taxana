"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { TransactionTable } from "@/components/transaction-table";
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
  Twitter,
} from "lucide-react";
import type { TaxSummary } from "@/lib/services/tax-calculator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Helper to format IDR
function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
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
  const [fetchStep, setFetchStep] = useState("");
  const [calcProgress, setCalcProgress] = useState(0);
  const [calcStep, setCalcStep] = useState("");
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
    setFetchStep("Menghubungi blockchain Solana...");

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 8;

      if (progress < 30) {
        setFetchStep("Mengambil data transaksi dari Helius...");
      } else if (progress < 60) {
        setFetchStep("Memproses transaksi swap...");
      } else if (progress < 85) {
        setFetchStep("Menyimpan ke database...");
      } else {
        setFetchStep("Menyelesaikan...");
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
    setFetchStep("Selesai!");
  };

  // Progress simulation for tax calculation
  const startCalcProgress = () => {
    setCalcProgress(0);
    setCalcStep("Mengambil harga token...");

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 6;

      if (progress < 40) {
        setCalcStep("Mengambil harga token dari API...");
      } else if (progress < 60) {
        setCalcStep("Menghitung cost basis (FIFO)...");
      } else if (progress < 80) {
        setCalcStep("Menghitung keuntungan/kerugian...");
      } else {
        setCalcStep("Menghitung kewajiban pajak...");
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
    setCalcStep("Selesai!");
  };

  // tRPC mutations and queries
  const fetchTransactionsMutation =
    trpc.transactions.fetchTransactions.useMutation();
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
      console.error("Error calculating taxes:", error);
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
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          year: selectedYear,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taxana-report-${selectedYear}-${walletAddress.slice(
        0,
        8
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  // Landing Page - Not Connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        {/* Animated gradient background */}
        <div className="fixed inset-0 bg-background">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 border-b border-border backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight">
                Taxana
              </span>
            </div>

            <Button
              onClick={handleConnectWallet}
              variant="secondary"
              className="rounded-full px-4 h-9 text-sm font-medium"
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-sm text-muted-foreground mb-8 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Sesuai peraturan pajak Indonesia 2024
              </div>

              {/* Main headline */}
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
                Hitung Pajak Crypto
                <br />
                <span className="text-primary">Solana Anda</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-100">
                Kalkulator pajak otomatis untuk trader Solana Indonesia.
                Generate laporan PDF untuk SPT dalam hitungan detik.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up animation-delay-200">
                <Button
                  size="lg"
                  onClick={handleConnectWallet}
                  className="rounded-full px-8 h-12 text-base font-medium shadow-lg transition-all hover:scale-105"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Connect Phantom Wallet
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground animate-fade-in-up animation-delay-300">
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
              <Card className="group">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Tanpa Registrasi</CardTitle>
                  <CardDescription>
                    Cukup hubungkan wallet Phantom Anda. Tidak perlu email,
                    tidak perlu password. Data diproses secara aman.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 2 */}
              <Card className="group">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-lg">FIFO Cost Basis</CardTitle>
                  <CardDescription>
                    Perhitungan keuntungan/kerugian menggunakan metode FIFO yang
                    sesuai standar akuntansi.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 3 */}
              <Card className="group">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Laporan PDF</CardTitle>
                  <CardDescription>
                    Generate laporan lengkap dengan detail transaksi. Siap untuk
                    pelaporan SPT tahunan Anda.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Tax rates section */}
          <div className="container mx-auto px-6 pb-32">
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">
                    Tarif Pajak Crypto Indonesia
                  </CardTitle>
                  <CardDescription>
                    Untuk transaksi melalui DEX (Unregistered Exchange)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="text-center p-6 rounded-xl bg-secondary">
                      <div className="text-3xl font-bold text-primary mb-2">
                        0.2%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        PPh Final
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Transaksi Jual
                      </div>
                    </div>
                    <div className="text-center p-6 rounded-xl bg-secondary">
                      <div className="text-3xl font-bold text-primary mb-2">
                        0.22%
                      </div>
                      <div className="text-sm text-muted-foreground">PPN</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Transaksi Beli
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                  <Calculator className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm">Taxana</span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan
                dengan konsultan pajak profesional.
              </p>

              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* CSS animations */}
        <style jsx global>{`
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border backdrop-blur-sm bg-background/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Taxana</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-muted-foreground hover:text-foreground"
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
            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
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
                  className="text-lg px-8 py-6 hover:border-primary/50 transition-all"
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
              <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Calculator className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Mengambil Transaksi
              </h2>
              <p className="text-muted-foreground mb-6">
                Tahun pajak {selectedYear}
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={fetchProgress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{fetchStep}</span>
                <span className="font-medium text-primary">
                  {Math.round(fetchProgress)}%
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Proses ini mungkin memakan waktu beberapa saat untuk wallet dengan
              banyak transaksi
            </p>
          </div>
        ) : isCalculating ? (
          // Loading - Calculating
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="mb-6">
              <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <BarChart3 className="h-8 w-8 text-accent-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Menghitung Pajak</h2>
              <p className="text-muted-foreground mb-6">
                Menganalisis {transactionsQuery.data?.length || 0} transaksi
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={calcProgress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{calcStep}</span>
                <span className="font-medium text-primary">
                  {Math.round(calcProgress)}%
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Mengambil harga dari Birdeye dan DexScreener untuk setiap token
            </p>
          </div>
        ) : (
          // Results
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
                  onClick={() => {
                    setSelectedYear(null);
                    setTaxSummary(null);
                  }}
                >
                  Ganti Tahun
                </Button>
                {!taxSummary &&
                  transactionsQuery.data &&
                  transactionsQuery.data.length > 0 && (
                    <Button onClick={handleCalculateTaxes}>
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
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Transaksi</CardDescription>
                      <CardTitle className="text-2xl">
                        {taxSummary.totalTransactions}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {taxSummary.totalBuys} beli, {taxSummary.totalSells}{" "}
                        jual
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Keuntungan/Kerugian</CardDescription>
                      <CardTitle
                        className={`text-2xl ${
                          taxSummary.netGainLossIdr >= 0
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                      >
                        {taxSummary.netGainLossIdr >= 0 ? (
                          <TrendingUp className="inline h-5 w-5 mr-1" />
                        ) : (
                          <TrendingDown className="inline h-5 w-5 mr-1" />
                        )}
                        {formatIDR(Math.abs(taxSummary.netGainLossIdr))}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        FIFO cost basis
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>PPh Final (0.2%)</CardDescription>
                      <CardTitle className="text-2xl">
                        {formatIDR(taxSummary.totalPphTax)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Pajak transaksi jual
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>PPN (0.22%)</CardDescription>
                      <CardTitle className="text-2xl">
                        {formatIDR(taxSummary.totalPpnTax)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Pajak transaksi beli
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Total Tax Card */}
                <Card className="mb-6 border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardDescription>Total Kewajiban Pajak</CardDescription>
                        <CardTitle className="text-3xl text-primary">
                          {formatIDR(taxSummary.totalTax)}
                        </CardTitle>
                      </div>
                      <Button
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
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
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Catatan: Perhitungan ini menggunakan harga token saat ini.
                      Untuk akurasi lebih baik, gunakan harga historis pada saat
                      transaksi dilakukan.
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
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
                      <Badge variant="secondary">Belum Dihitung</Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>DEX Terdeteksi</CardDescription>
                    <CardTitle className="text-2xl">
                      {transactionsQuery.data
                        ? [
                            ...new Set(
                              transactionsQuery.data.map((tx) => tx.dex)
                            ),
                          ].filter(Boolean).length
                        : 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

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
      <footer className="relative z-10 border-t border-border mt-16">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>
            Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan
            dengan konsultan pajak profesional.
          </p>
        </div>
      </footer>
    </div>
  );
}
