"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Calculator } from "lucide-react";
import { WizardProvider, useWizard } from "./wizard-provider";
import { ProgressIndicator } from "./progress-indicator";
import { ConnectStep } from "./steps/connect-step";
import { YearStep } from "./steps/year-step";
import { LoadingStep } from "./steps/loading-step";
import { ResultsStep } from "./steps/results-step";

function WizardContent() {
  const { connected } = useWallet();
  const { state, goToStep } = useWizard();
  const { currentStep } = state;

  // Reset to connect step if wallet disconnects
  useEffect(() => {
    if (!connected && currentStep !== "connect") {
      goToStep("connect");
    }
  }, [connected, currentStep, goToStep]);

  const renderStep = () => {
    switch (currentStep) {
      case "connect":
        return <ConnectStep />;
      case "year":
        return <YearStep />;
      case "loading":
        return <LoadingStep />;
      case "results":
        return <ResultsStep />;
      default:
        return <ConnectStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border backdrop-blur-sm bg-background/50 no-print">
        <div className="container mx-auto px-6 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Taxana</span>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      {currentStep !== "connect" && (
        <div className="relative z-10 py-6 border-b border-border/50 no-print">
          <ProgressIndicator currentStep={currentStep} />
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 container mx-auto">
        {renderStep()}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-auto no-print">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>
            Taxana adalah alat bantu perhitungan pajak. Selalu konsultasikan dengan
            konsultan pajak profesional.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function WizardContainer() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
