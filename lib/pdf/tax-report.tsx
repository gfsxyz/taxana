import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  TaxSummary,
  TransactionTaxResult,
} from "@/lib/services/tax-calculator";

// Helper to format IDR
function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #10b981",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  walletInfo: {
    marginTop: 10,
    fontSize: 9,
    color: "#374151",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "48%",
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  summaryValuePositive: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#10b981",
  },
  summaryValueNegative: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ef4444",
  },
  taxBox: {
    padding: 15,
    backgroundColor: "#ecfdf5",
    borderRadius: 4,
    border: "1px solid #10b981",
    marginBottom: 20,
  },
  taxBoxTitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 5,
  },
  taxBoxValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #e5e7eb",
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #e5e7eb",
    fontSize: 8,
    backgroundColor: "#f9fafb",
  },
  colDate: { width: "12%" },
  colType: { width: "8%" },
  colFrom: { width: "20%" },
  colTo: { width: "20%" },
  colValue: { width: "15%" },
  colGainLoss: { width: "15%" },
  colTax: { width: "10%" },
  disclaimer: {
    marginTop: 30,
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    fontSize: 8,
  },
  disclaimerTitle: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#92400e",
  },
  disclaimerText: {
    color: "#78350f",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
  },
  explanationSection: {
    marginBottom: 15,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  explanationText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
    marginBottom: 5,
  },
  bulletPoint: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
    marginLeft: 10,
    marginBottom: 3,
  },
  tosBox: {
    padding: 15,
    backgroundColor: "#fef2f2",
    borderRadius: 4,
    border: "1px solid #ef4444",
    marginTop: 15,
  },
  tosTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#991b1b",
    marginBottom: 10,
  },
  tosText: {
    fontSize: 8,
    color: "#7f1d1d",
    lineHeight: 1.5,
    marginBottom: 5,
  },
  tosBullet: {
    fontSize: 8,
    color: "#7f1d1d",
    lineHeight: 1.5,
    marginLeft: 10,
    marginBottom: 3,
  },
});

interface TaxReportPDFProps {
  walletAddress: string;
  year: number;
  taxSummary: TaxSummary;
  generatedAt: Date;
}

export function TaxReportPDF({
  walletAddress,
  year,
  taxSummary,
  generatedAt,
}: TaxReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TAXANA</Text>
          <Text style={styles.subtitle}>
            Laporan Pajak Crypto Solana - Tahun {year}
          </Text>
          <Text style={styles.walletInfo}>Wallet: {walletAddress}</Text>
          <Text style={styles.walletInfo}>
            Dibuat: {formatDate(generatedAt)}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Transaksi</Text>
              <Text style={styles.summaryValue}>
                {taxSummary.totalTransactions}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Transaksi Beli / Jual</Text>
              <Text style={styles.summaryValue}>
                {taxSummary.totalBuys} / {taxSummary.totalSells}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Volume Beli</Text>
              <Text style={styles.summaryValue}>
                {formatIDR(taxSummary.totalBuyValueIdr)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Volume Jual</Text>
              <Text style={styles.summaryValue}>
                {formatIDR(taxSummary.totalSellValueIdr)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Keuntungan</Text>
              <Text style={styles.summaryValuePositive}>
                {formatIDR(taxSummary.totalGainIdr)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Kerugian</Text>
              <Text style={styles.summaryValueNegative}>
                {formatIDR(taxSummary.totalLossIdr)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Gain/Loss */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Keuntungan/Kerugian Bersih (FIFO)
            </Text>
            <Text
              style={
                taxSummary.netGainLossIdr >= 0
                  ? styles.summaryValuePositive
                  : styles.summaryValueNegative
              }
            >
              {taxSummary.netGainLossIdr >= 0 ? "+" : ""}
              {formatIDR(taxSummary.netGainLossIdr)}
            </Text>
          </View>
        </View>

        {/* Tax Obligation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kewajiban Pajak</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>PPh Final (0.2%)</Text>
              <Text style={styles.summaryValue}>
                {formatIDR(taxSummary.totalPphTax)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>PPN (0.22%)</Text>
              <Text style={styles.summaryValue}>
                {formatIDR(taxSummary.totalPpnTax)}
              </Text>
            </View>
          </View>
        </View>

        {/* Total Tax */}
        <View style={styles.taxBox}>
          <Text style={styles.taxBoxTitle}>Total Kewajiban Pajak</Text>
          <Text style={styles.taxBoxValue}>
            {formatIDR(taxSummary.totalTax)}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>DISCLAIMER</Text>
          <Text style={styles.disclaimerText}>
            Laporan ini dibuat oleh Taxana sebagai alat bantu perhitungan pajak
            dan bukan merupakan nasihat pajak profesional. Perhitungan
            menggunakan metode FIFO (First In, First Out) dan tarif pajak untuk
            transaksi melalui DEX (PPh 0.2%, PPN 0.22%). Harga token menggunakan
            harga saat ini, bukan harga historis pada saat transaksi. Selalu
            konsultasikan dengan konsultan pajak profesional sebelum melakukan
            pelaporan SPT. Taxana tidak bertanggung jawab atas kesalahan
            perhitungan atau keputusan pelaporan pajak berdasarkan laporan ini.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Taxana - Kalkulator Pajak Crypto Solana Indonesia
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>

      {/* Calculation Explanation & Disclaimer Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Penjelasan Perhitungan</Text>

          {/* FIFO Explanation */}
          <View style={styles.explanationSection}>
            <Text style={styles.explanationTitle}>
              Metode FIFO (First In, First Out)
            </Text>
            <Text style={styles.explanationText}>
              Perhitungan keuntungan/kerugian menggunakan metode FIFO, dimana
              aset yang dibeli pertama akan dijual pertama. Setiap kali Anda
              menjual token, sistem akan menghitung cost basis dari pembelian
              paling awal yang belum terjual.
            </Text>
            <Text style={styles.bulletPoint}>
              - Beli 10 SOL @ Rp 100.000 (total Rp 1.000.000)
            </Text>
            <Text style={styles.bulletPoint}>
              - Beli 5 SOL @ Rp 120.000 (total Rp 600.000)
            </Text>
            <Text style={styles.bulletPoint}>
              - Jual 8 SOL @ Rp 150.000 (total Rp 1.200.000)
            </Text>
            <Text style={styles.bulletPoint}>
              - Cost basis: 8 x Rp 100.000 = Rp 800.000 (dari lot pertama)
            </Text>
            <Text style={styles.bulletPoint}>
              - Keuntungan: Rp 1.200.000 - Rp 800.000 = Rp 400.000
            </Text>
          </View>

          {/* Tax Rate Explanation */}
          <View style={styles.explanationSection}>
            <Text style={styles.explanationTitle}>
              Tarif Pajak Crypto Indonesia
            </Text>
            <Text style={styles.explanationText}>
              Berdasarkan PMK 68/2022, transaksi aset kripto dikenakan pajak
              sebagai berikut:
            </Text>
            <Text style={styles.bulletPoint}>
              - PPh Final 0.2%: Dikenakan pada transaksi penjualan melalui
              exchange yang tidak terdaftar di Bappebti (termasuk DEX seperti
              Jupiter, Raydium, dll)
            </Text>
            <Text style={styles.bulletPoint}>
              - PPN 0.22%: Dikenakan pada transaksi pembelian melalui exchange
              yang tidak terdaftar di Bappebti
            </Text>
            <Text style={styles.explanationText}>
              Catatan: Exchange terdaftar Bappebti memiliki tarif lebih rendah
              (PPh 0.1%, PPN 0.11%).
            </Text>
          </View>

          {/* Price Data Explanation */}
          <View style={styles.explanationSection}>
            <Text style={styles.explanationTitle}>Sumber Data Harga</Text>
            <Text style={styles.explanationText}>
              Harga token diambil dari berbagai sumber (Birdeye, DexScreener)
              dan dikonversi dari USD ke IDR menggunakan kurs saat ini. PENTING:
              Harga yang digunakan adalah harga saat laporan dibuat, BUKAN harga
              historis pada saat transaksi. Hal ini dapat menyebabkan perbedaan
              dengan nilai transaksi sebenarnya.
            </Text>
          </View>
        </View>

        {/* Terms of Service / Disclaimer */}
        <View style={styles.tosBox}>
          <Text style={styles.tosTitle}>SYARAT & KETENTUAN PENGGUNAAN</Text>

          <Text style={styles.tosText}>PENTING - BACA DENGAN SEKSAMA:</Text>

          <Text style={styles.tosBullet}>
            1. TUJUAN HIBURAN & EDUKASI: Taxana dibuat untuk tujuan hiburan dan
            edukasi saja. Kami BUKAN konsultan pajak, akuntan, atau penasihat
            keuangan berlisensi.
          </Text>

          <Text style={styles.tosBullet}>
            2. BUKAN NASIHAT PAJAK: Laporan ini BUKAN merupakan nasihat pajak
            profesional dan tidak boleh dijadikan dasar utama untuk pelaporan
            SPT Anda.
          </Text>

          <Text style={styles.tosBullet}>
            3. TIDAK ADA JAMINAN AKURASI: Perhitungan mungkin mengandung
            kesalahan karena keterbatasan data harga historis, parsing
            transaksi, dan faktor lainnya.
          </Text>

          <Text style={styles.tosBullet}>
            4. KONSULTASI PROFESIONAL: WAJIB konsultasikan dengan konsultan
            pajak profesional sebelum melakukan pelaporan pajak resmi.
          </Text>

          <Text style={styles.tosBullet}>
            5. TANGGUNG JAWAB PENGGUNA: Pengguna bertanggung jawab penuh atas
            keakuratan pelaporan pajak mereka. Taxana tidak bertanggung jawab
            atas denda, penalti, atau kerugian akibat penggunaan laporan ini.
          </Text>

          <Text style={styles.tosBullet}>
            6. PERUBAHAN REGULASI: Regulasi pajak crypto dapat berubah
            sewaktu-waktu. Pastikan untuk selalu mengecek peraturan terbaru dari
            Dirjen Pajak dan Bappebti.
          </Text>

          <Text style={styles.tosText}>
            Dengan menggunakan Taxana, Anda menyetujui syarat dan ketentuan di
            atas.
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>

      {/* Transaction Details Pages - Show ALL transactions */}
      {taxSummary.transactions.length > 0 &&
        (() => {
          const ROWS_PER_PAGE = 35;
          const totalPages = Math.ceil(
            taxSummary.transactions.length / ROWS_PER_PAGE
          );

          return Array.from({ length: totalPages }, (_, pageIndex) => {
            const startIdx = pageIndex * ROWS_PER_PAGE;
            const endIdx = Math.min(
              startIdx + ROWS_PER_PAGE,
              taxSummary.transactions.length
            );
            const pageTransactions = taxSummary.transactions.slice(
              startIdx,
              endIdx
            );

            return (
              <Page key={`tx-page-${pageIndex}`} size="A4" style={styles.page}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Detail Transaksi{" "}
                    {totalPages > 1
                      ? `(${startIdx + 1}-${endIdx} dari ${
                          taxSummary.transactions.length
                        })`
                      : ""}
                  </Text>

                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={styles.colDate}>Tanggal</Text>
                    <Text style={styles.colType}>Tipe</Text>
                    <Text style={styles.colFrom}>Dari</Text>
                    <Text style={styles.colTo}>Ke</Text>
                    <Text style={styles.colValue}>Nilai (IDR)</Text>
                    <Text style={styles.colGainLoss}>P/L (IDR)</Text>
                    <Text style={styles.colTax}>Pajak</Text>
                  </View>

                  {/* Table Rows */}
                  {pageTransactions.map((tx, index) => (
                    <View
                      key={tx.signature}
                      style={
                        index % 2 === 0 ? styles.tableRow : styles.tableRowAlt
                      }
                    >
                      <Text style={styles.colDate}>
                        {formatDate(tx.timestamp)}
                      </Text>
                      <Text style={styles.colType}>
                        {tx.type === "buy" ? "Beli" : "Jual"}
                      </Text>
                      <Text style={styles.colFrom}>
                        {tx.fromAmount.toFixed(2)} {tx.fromSymbol}
                      </Text>
                      <Text style={styles.colTo}>
                        {tx.toAmount.toFixed(2)} {tx.toSymbol}
                      </Text>
                      <Text style={styles.colValue}>
                        {formatIDR(tx.transactionValueIdr)}
                      </Text>
                      <Text style={styles.colGainLoss}>
                        {tx.gainLossIdr !== 0
                          ? (tx.gainLossIdr > 0 ? "+" : "") +
                            formatIDR(tx.gainLossIdr)
                          : "-"}
                      </Text>
                      <Text style={styles.colTax}>
                        {formatIDR(tx.totalTax)}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text
                  style={styles.pageNumber}
                  render={({ pageNumber, totalPages }) =>
                    `${pageNumber} / ${totalPages}`
                  }
                />
              </Page>
            );
          });
        })()}
    </Document>
  );
}
