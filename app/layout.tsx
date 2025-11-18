import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { SolanaWalletProvider } from "@/lib/wallet/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taxana - Kalkulator Pajak Crypto Solana Indonesia",
  description: "Hitung pajak crypto Solana Anda dengan mudah. Dukung Jupiter, Raydium, Orca. Laporan PDF untuk pelaporan pajak.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
