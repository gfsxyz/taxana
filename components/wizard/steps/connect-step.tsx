"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Calculator, Wallet, Lock, Zap, Shield } from "lucide-react";
import { WalletModal } from "../wallet-modal";
import { useWizard } from "../wizard-provider";

export function ConnectStep() {
  const [modalOpen, setModalOpen] = useState(false);
  const { connected } = useWallet();
  const { goToStep } = useWizard();

  // Auto-advance when connected
  useEffect(() => {
    if (connected) {
      goToStep("year");
    }
  }, [connected, goToStep]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Logo */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 shadow-lg">
        <Calculator className="h-10 w-10 text-primary" />
      </div>

      {/* Title */}
      <h1 className="mb-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Hitung Pajak Crypto
        <br />
        <span className="text-primary">Solana Anda</span>
      </h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        Kalkulator pajak otomatis untuk trader Solana Indonesia. Generate laporan
        PDF untuk SPT dalam hitungan detik.
      </p>

      {/* Connect Button */}
      <Button
        size="lg"
        onClick={() => setModalOpen(true)}
        className="h-14 px-8 text-lg font-medium shadow-lg transition-all hover:scale-105"
      >
        <Wallet className="mr-2 h-5 w-5" />
        Connect Phantom Wallet
      </Button>

      {/* Trust indicators */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
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

      {/* Wallet Modal */}
      <WalletModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => goToStep("year")}
      />
    </div>
  );
}
