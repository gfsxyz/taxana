"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowLeft } from "lucide-react";
import { useWizard } from "../wizard-provider";
import { trpc } from "@/lib/trpc/client";

const MESSAGES = {
  fetch: [
    { threshold: 0, text: "Menghubungi blockchain Solana..." },
    { threshold: 10, text: "Mengambil data transaksi dari Helius..." },
    { threshold: 25, text: "Memproses transaksi swap..." },
    { threshold: 40, text: "Menyimpan ke database..." },
  ],
  calculate: [
    { threshold: 50, text: "Mengambil harga token dari API..." },
    { threshold: 65, text: "Menghitung cost basis (FIFO)..." },
    { threshold: 80, text: "Menghitung keuntungan/kerugian..." },
    { threshold: 90, text: "Menghitung kewajiban pajak..." },
  ],
};

function getMessage(progress: number): string {
  const allMessages = [...MESSAGES.fetch, ...MESSAGES.calculate];
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (progress >= allMessages[i].threshold) {
      return allMessages[i].text;
    }
  }
  return allMessages[0].text;
}

export function LoadingStep() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || "";
  const { state, goToStep, setTaxSummary, setError } = useWizard();
  const { selectedYear, cacheStatus, error } = state;

  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Memulai...");
  const [targetProgress, setTargetProgress] = useState(0);

  const animationRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  const fetchTransactionsMutation = trpc.transactions.fetchTransactions.useMutation();
  const calculateTaxesMutation = trpc.transactions.calculateTaxes.useMutation();

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setProgress((prev) => {
        if (prev >= targetProgress) return prev;
        // Smooth easing - move faster when far from target, slower when close
        const diff = targetProgress - prev;
        const step = Math.max(0.3, diff * 0.08);
        const next = Math.min(prev + step, targetProgress);
        return next;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetProgress]);

  // Update message based on progress
  useEffect(() => {
    setMessage(getMessage(progress));
  }, [progress]);

  const runProcess = useCallback(async () => {
    if (!selectedYear || hasStartedRef.current) return;
    hasStartedRef.current = true;

    try {
      // Phase 1: Fetch or use cache (0-50%)
      if (cacheStatus !== "fresh") {
        // Animate to ~10% while starting
        setTargetProgress(10);

        // Start the fetch
        const fetchPromise = fetchTransactionsMutation.mutateAsync({
          walletAddress,
          year: selectedYear,
        });

        // Animate progress while fetching
        let fetchProgress = 10;
        const fetchInterval = setInterval(() => {
          fetchProgress += Math.random() * 3;
          if (fetchProgress > 45) fetchProgress = 45;
          setTargetProgress(fetchProgress);
        }, 200);

        await fetchPromise;
        clearInterval(fetchInterval);
        setTargetProgress(50);
      } else {
        // Using cache - quick animation to 50%
        setTargetProgress(15);
        await new Promise((r) => setTimeout(r, 300));
        setTargetProgress(35);
        await new Promise((r) => setTimeout(r, 300));
        setTargetProgress(50);
      }

      // Brief pause at 50%
      await new Promise((r) => setTimeout(r, 400));

      // Phase 2: Calculate (50-100%)
      setTargetProgress(55);

      const calcPromise = calculateTaxesMutation.mutateAsync({
        walletAddress,
        year: selectedYear,
      });

      // Animate progress while calculating
      let calcProgress = 55;
      const calcInterval = setInterval(() => {
        calcProgress += Math.random() * 2.5;
        if (calcProgress > 92) calcProgress = 92;
        setTargetProgress(calcProgress);
      }, 150);

      const result = await calcPromise;
      clearInterval(calcInterval);

      // Finish animation
      setTargetProgress(100);
      setMessage("Selesai!");
      setTaxSummary(result);

      // Wait for animation to complete
      await new Promise((r) => setTimeout(r, 600));
      goToStep("results");
    } catch (err) {
      console.error("Error during processing:", err);
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data"
      );
    }
  }, [
    selectedYear,
    cacheStatus,
    walletAddress,
    fetchTransactionsMutation,
    calculateTaxesMutation,
    setTaxSummary,
    setError,
    goToStep,
  ]);

  useEffect(() => {
    runProcess();
  }, [runProcess]);

  const handleBack = () => {
    hasStartedRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
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
        {progress < 50 ? "Mengambil Data" : "Menghitung Pajak"}
      </h2>
      <p className="mb-8 text-muted-foreground">Tahun pajak {selectedYear}</p>

      {/* Progress Bar */}
      <div className="w-full max-w-md space-y-3">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{message}</span>
          <span className="font-medium text-primary">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Helper Text */}
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        {progress < 50
          ? "Proses ini mungkin memakan waktu beberapa saat untuk wallet dengan banyak transaksi"
          : "Mengambil harga dari Birdeye dan DexScreener untuk setiap token"}
      </p>
    </div>
  );
}
