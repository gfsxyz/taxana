"use client";

import { cn } from "@/lib/utils";
import { Check, Wallet, Calendar, Loader2, FileText } from "lucide-react";
import type { WizardStep } from "./wizard-provider";

interface ProgressIndicatorProps {
  currentStep: WizardStep;
}

const steps: { id: WizardStep; label: string; icon: typeof Wallet }[] = [
  { id: "connect", label: "Connect", icon: Wallet },
  { id: "year", label: "Tahun", icon: Calendar },
  { id: "loading", label: "Proses", icon: Loader2 },
  { id: "results", label: "Hasil", icon: FileText },
];

const stepOrder: WizardStep[] = ["connect", "year", "loading", "results"];

function getStepIndex(step: WizardStep): number {
  return stepOrder.indexOf(step);
}

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : isCurrent && step.id === "loading" ? (
                    <Icon className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 sm:w-12 transition-colors duration-300",
                    index < currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
