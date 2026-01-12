"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, ExternalLink } from "lucide-react";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WalletModal({ open, onOpenChange, onSuccess }: WalletModalProps) {
  const { wallets, select, connecting, connected } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const phantomWallet = wallets.find(
    (w) => w.adapter.name.toLowerCase() === "phantom"
  );

  // Close modal and trigger success when connected
  useEffect(() => {
    if (connected && open) {
      setIsConnecting(false);
      onOpenChange(false);
      onSuccess?.();
    }
  }, [connected, open, onOpenChange, onSuccess]);

  const handleConnect = useCallback(() => {
    if (!phantomWallet) {
      setError("Phantom wallet tidak terdeteksi");
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      // Just select the wallet - autoConnect will handle the rest
      select(phantomWallet.adapter.name);
    } catch (err) {
      console.error("Connection error:", err);
      setError("Gagal terhubung ke wallet. Silakan coba lagi.");
      setIsConnecting(false);
    }
  }, [phantomWallet, select]);

  const isPhantomInstalled = !!phantomWallet?.readyState;
  const showSpinner = connecting || isConnecting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              width="32"
              height="32"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M110.584 64.872C110.584 91.432 89.144 112.872 62.584 112.872C36.024 112.872 14.584 91.432 14.584 64.872C14.584 38.312 36.024 16.872 62.584 16.872C89.144 16.872 110.584 38.312 110.584 64.872Z"
                fill="white"
              />
              <path
                d="M98.8 53.2C97.6 39.6 86.4 28.8 72.4 28.8H38.8C37.6 28.8 36.8 30 37.2 31.2L50.8 72.8C51.6 75.2 53.6 76.8 56 76.8H72.4C86.8 76.8 98.4 66.8 98.8 53.2ZM72.4 68H60.8L52.4 40H72.4C81.2 40 88.4 46.8 88.4 54C88.4 61.2 81.2 68 72.4 68Z"
                fill="#AB9FF2"
              />
              <path
                d="M88.4 76.8C88.4 80.8 85.2 84 81.2 84C77.2 84 74 80.8 74 76.8C74 72.8 77.2 69.6 81.2 69.6C85.2 69.6 88.4 72.8 88.4 76.8Z"
                fill="#AB9FF2"
              />
            </svg>
          </div>
          <DialogTitle className="text-xl">Connect Phantom Wallet</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Hubungkan wallet Anda untuk mulai menghitung pajak crypto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isPhantomInstalled ? (
            <Button
              onClick={handleConnect}
              disabled={showSpinner}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {showSpinner ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Menghubungkan...
                </>
              ) : (
                "Connect Wallet"
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Phantom wallet tidak terdeteksi di browser Anda
              </p>
              <Button
                variant="outline"
                className="w-full h-12"
                asChild
              >
                <a
                  href="https://phantom.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Install Phantom
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 border-t pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Non-custodial
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Tidak perlu signature
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
