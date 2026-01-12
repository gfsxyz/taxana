"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowLeft } from "lucide-react";
import { useWizard } from "../wizard-provider";
import { trpc } from "@/lib/trpc/client";

export function LoadingStep() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || "";
  const {
    state,
    goToStep,
    setLoadingProgress,
    setTaxSummary,
    setError,
  } = useWizard();

  const { selectedYear, loadingProgress, loadingMessage, cacheStatus, error } = state;
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  const fetchTransactionsMutation = trpc.transactions.fetchTransactions.useMutation();
  const calculateTaxesMutation = trpc.transactions.calculateTaxes.useMutation();

  const startProgressSimulation = useCallback((stage: "fetch" | "calculate") => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const baseProgress = stage === "fetch" ? 0 : 50;
    let progress = baseProgress;

    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 5;
      const maxProgress = stage === "fetch" ? 45 : 95;

      if (progress >= maxProgress) {
        progress = maxProgress;
      }

      const messages =
        stage === "fetch"
          ? progress < 15
            ? "Menghubungi blockchain Solana..."
            : progress < 30
              ? "Mengambil data transaksi dari Helius..."
              : progress < 40
                ? "Memproses transaksi swap..."
                : "Menyimpan ke database..."
          : progress < 60
            ? "Mengambil harga token dari API..."
            : progress < 75
              ? "Menghitung cost basis (FIFO)..."
              : progress < 85
                ? "Menghitung keuntungan/kerugian..."
                : "Menghitung kewajiban pajak...";

      setLoadingProgress(progress, messages);
    }, 300);
  }, [setLoadingProgress]);

  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const runProcess = useCallback(async () => {
    if (!selectedYear || hasStartedRef.current) return;
    hasStartedRef.current = true;

    try {
      // If cache is not fresh, fetch new data
      if (cacheStatus !== "fresh") {
        startProgressSimulation("fetch");

        await fetchTransactionsMutation.mutateAsync({
          walletAddress,
          year: selectedYear,
        });

        stopProgressSimulation();
        setLoadingProgress(50, "Transaksi berhasil diambil");
      } else {
        setLoadingProgress(50, "Menggunakan data dari cache");
      }

      // Calculate taxes
      startProgressSimulation("calculate");

      const result = await calculateTaxesMutation.mutateAsync({
        walletAddress,
        year: selectedYear,
      });

      stopProgressSimulation();
      setLoadingProgress(100, "Selesai!");
      setTaxSummary(result);

      // Brief delay before showing results
      setTimeout(() => {
        goToStep("results");
      }, 500);
    } catch (err) {
      stopProgressSimulation();
      console.error("Error during processing:", err);
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data"
      );
    }
  }, [
    selectedYear,
    cacheStatus,
    walletAddress,
    startProgressSimulation,
    stopProgressSimulation,
    fetchTransactionsMutation,
    calculateTaxesMutation,
    setLoadingProgress,
    setTaxSummary,
    setError,
    goToStep,
  ]);

  useEffect(() => {
    runProcess();

    return () => {
      stopProgressSimulation();
    };
  }, [runProcess, stopProgressSimulation]);

  const handleBack = () => {
    hasStartedRef.current = false;
    stopProgressSimulation();
    goToStep("year");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/20">
          <Calculator className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Terjadi Kesalahan</h2>
        <p className="mb-6 max-w-md text-center text-muted-foreground">{error}</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Animated Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 animate-pulse">
        <Calculator className="h-10 w-10 text-primary" />
      </div>

      {/* Title */}
      <h2 className="mb-2 text-xl font-semibold">
        {loadingProgress < 50 ? "Mengambil Data" : "Menghitung Pajak"}
      </h2>
      <p className="mb-8 text-muted-foreground">Tahun pajak {selectedYear}</p>

      {/* Progress Bar */}
      <div className="w-full max-w-md space-y-3">
        <Progress value={loadingProgress} className="h-2" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{loadingMessage}</span>
          <span className="font-medium text-primary">
            {Math.round(loadingProgress)}%
          </span>
        </div>
      </div>

      {/* Helper Text */}
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        {loadingProgress < 50
          ? "Proses ini mungkin memakan waktu beberapa saat untuk wallet dengan banyak transaksi"
          : "Mengambil harga dari Birdeye dan DexScreener untuk setiap token"}
      </p>
    </div>
  );
}
