"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { TaxSummary } from "@/lib/services/tax-calculator";

export type WizardStep = "connect" | "year" | "loading" | "results";

export interface WizardState {
  currentStep: WizardStep;
  selectedYear: number | null;
  taxSummary: TaxSummary | null;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;
  cacheStatus: "fresh" | "stale" | "none";
  cachedAt: Date | null;
}

type WizardAction =
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "SELECT_YEAR"; year: number }
  | { type: "SET_TAX_SUMMARY"; summary: TaxSummary }
  | { type: "SET_LOADING_PROGRESS"; progress: number; message: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_CACHE_STATUS"; status: "fresh" | "stale" | "none"; cachedAt?: Date }
  | { type: "RESET" };

const initialState: WizardState = {
  currentStep: "connect",
  selectedYear: null,
  taxSummary: null,
  loadingProgress: 0,
  loadingMessage: "",
  error: null,
  cacheStatus: "none",
  cachedAt: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };
    case "SELECT_YEAR":
      return { ...state, selectedYear: action.year };
    case "SET_TAX_SUMMARY":
      return { ...state, taxSummary: action.summary };
    case "SET_LOADING_PROGRESS":
      return {
        ...state,
        loadingProgress: action.progress,
        loadingMessage: action.message,
      };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_CACHE_STATUS":
      return {
        ...state,
        cacheStatus: action.status,
        cachedAt: action.cachedAt || null,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface WizardContextValue {
  state: WizardState;
  goToStep: (step: WizardStep) => void;
  selectYear: (year: number) => void;
  setTaxSummary: (summary: TaxSummary) => void;
  setLoadingProgress: (progress: number, message: string) => void;
  setError: (error: string | null) => void;
  setCacheStatus: (status: "fresh" | "stale" | "none", cachedAt?: Date) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const goToStep = useCallback((step: WizardStep) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const selectYear = useCallback((year: number) => {
    dispatch({ type: "SELECT_YEAR", year });
  }, []);

  const setTaxSummary = useCallback((summary: TaxSummary) => {
    dispatch({ type: "SET_TAX_SUMMARY", summary });
  }, []);

  const setLoadingProgress = useCallback((progress: number, message: string) => {
    dispatch({ type: "SET_LOADING_PROGRESS", progress, message });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "SET_ERROR", error });
  }, []);

  const setCacheStatus = useCallback(
    (status: "fresh" | "stale" | "none", cachedAt?: Date) => {
      dispatch({ type: "SET_CACHE_STATUS", status, cachedAt });
    },
    []
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <WizardContext.Provider
      value={{
        state,
        goToStep,
        selectYear,
        setTaxSummary,
        setLoadingProgress,
        setError,
        setCacheStatus,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
