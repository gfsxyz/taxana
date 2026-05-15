"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, LogOut } from "lucide-react";
import { useWizard } from "../wizard-provider";
import { trpc } from "@/lib/trpc/client";

export function YearStep() {
  const { publicKey, disconnect } = useWallet();
  const { goToStep, selectYear, setCacheStatus, setLoadingProgress } = useWizard();
  const walletAddress = publicKey?.toBase58() || "";

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const checkCacheMutation = trpc.transactions.checkCache.useMutation();

  const handleSelectYear = async (year: number) => {
    selectYear(year);
    setLoadingProgress(0, "Mengecek cache...");
    goToStep("loading");

    try {
      const cacheResult = await checkCacheMutation.mutateAsync({
        walletAddress,
        year,
      });

      if (cacheResult.valid && cacheResult.fetchedAt) {
        setCacheStatus("fresh", new Date(cacheResult.fetchedAt));
      } else if (cacheResult.exists && cacheResult.fetchedAt) {
        setCacheStatus("stale", new Date(cacheResult.fetchedAt));
      } else {
        setCacheStatus("none");
      }
    } catch {
      setCacheStatus("none");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    goToStep("connect");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Wallet Badge */}
      <div className="mb-8 flex items-center gap-3">
        <Badge variant="secondary" className="px-4 py-2 font-mono text-sm">
          {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Disconnect
        </Button>
      </div>

      {/* Icon */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
        <Calendar className="h-10 w-10 text-primary" />
      </div>

      {/* Title */}
      <h2 className="mb-2 text-2xl font-bold">Pilih Tahun Pajak</h2>
      <p className="mb-8 text-muted-foreground">
        Pilih tahun pajak yang ingin Anda hitung
      </p>

      {/* Year Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        {years.map((year) => (
          <Button
            key={year}
            variant="outline"
            size="lg"
            className="h-16 w-28 text-xl font-semibold hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => handleSelectYear(year)}
            disabled={checkCacheMutation.isPending}
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  );
}
