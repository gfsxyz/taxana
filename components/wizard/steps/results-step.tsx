"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  FileText,
  Printer,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useWizard } from "../wizard-provider";

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours} jam lalu`;
}

export function ResultsStep() {
  const { publicKey, disconnect } = useWallet();
  const walletAddress = publicKey?.toBase58() || "";
  const { state, reset, goToStep } = useWizard();
  const { selectedYear, taxSummary, cachedAt } = state;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!taxSummary) {
    return null;
  }

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, year: selectedYear }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taxana-report-${selectedYear}-${walletAddress.slice(0, 8)}.pdf`;
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

  const handlePrint = () => {
    window.print();
  };

  const handleStartOver = () => {
    disconnect();
    reset();
  };

  const handleRefresh = () => {
    goToStep("loading");
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center print:mb-4">
        <h2 className="text-2xl font-bold mb-2">Hasil Perhitungan Pajak</h2>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Badge variant="secondary" className="font-mono">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </Badge>
          <span>•</span>
          <span>Tahun {selectedYear}</span>
        </div>
        {cachedAt && (
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground no-print">
            <Clock className="h-3 w-3" />
            <span>Data dari {formatTimeAgo(cachedAt)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-1"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transaksi</CardDescription>
            <CardTitle className="text-2xl">{taxSummary.totalTransactions}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {taxSummary.totalBuys} beli, {taxSummary.totalSells} jual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Keuntungan/Kerugian</CardDescription>
            <CardTitle
              className={`text-2xl flex items-center ${
                taxSummary.netGainLossIdr >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {taxSummary.netGainLossIdr >= 0 ? (
                <TrendingUp className="h-5 w-5 mr-1" />
              ) : (
                <TrendingDown className="h-5 w-5 mr-1" />
              )}
              {formatIDR(Math.abs(taxSummary.netGainLossIdr))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">FIFO cost basis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>PPh Final (0.2%)</CardDescription>
            <CardTitle className="text-2xl">{formatIDR(taxSummary.totalPphTax)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pajak transaksi jual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>PPN (0.22%)</CardDescription>
            <CardTitle className="text-2xl">{formatIDR(taxSummary.totalPpnTax)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pajak transaksi beli</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Tax Card */}
      <Card className="mb-8 border-primary">
        <CardHeader>
          <CardDescription>Total Kewajiban Pajak</CardDescription>
          <CardTitle className="text-3xl text-primary">
            {formatIDR(taxSummary.totalTax)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Catatan: Perhitungan ini menggunakan harga token saat ini. Untuk akurasi
            lebih baik, gunakan harga historis pada saat transaksi dilakukan.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center no-print">
        <Button onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
          {isDownloadingPdf ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={handleStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Mulai Ulang
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-center text-xs text-muted-foreground print:mt-4">
        Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan dengan
        konsultan pajak profesional.
      </p>
    </div>
  );
}
