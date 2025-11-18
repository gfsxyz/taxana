import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { TaxSummary, TransactionTaxResult } from '@/lib/services/tax-calculator';

// Helper to format IDR
function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #10b981',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  walletInfo: {
    marginTop: 10,
    fontSize: 9,
    color: '#374151',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryValuePositive: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
  },
  summaryValueNegative: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  taxBox: {
    padding: 15,
    backgroundColor: '#ecfdf5',
    borderRadius: 4,
    border: '1px solid #10b981',
    marginBottom: 20,
  },
  taxBoxTitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 5,
  },
  taxBoxValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
    fontSize: 8,
    backgroundColor: '#f9fafb',
  },
  colDate: { width: '12%' },
  colType: { width: '8%' },
  colFrom: { width: '20%' },
  colTo: { width: '20%' },
  colValue: { width: '15%' },
  colGainLoss: { width: '15%' },
  colTax: { width: '10%' },
  disclaimer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    fontSize: 8,
  },
  disclaimerTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#92400e',
  },
  disclaimerText: {
    color: '#78350f',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
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
          <Text style={styles.walletInfo}>
            Wallet: {walletAddress}
          </Text>
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
              {taxSummary.netGainLossIdr >= 0 ? '+' : ''}
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
            Laporan ini dibuat oleh Taxana sebagai alat bantu perhitungan pajak dan
            bukan merupakan nasihat pajak profesional. Perhitungan menggunakan
            metode FIFO (First In, First Out) dan tarif pajak untuk transaksi
            melalui DEX (PPh 0.2%, PPN 0.22%). Harga token menggunakan harga saat
            ini, bukan harga historis pada saat transaksi. Selalu konsultasikan
            dengan konsultan pajak profesional sebelum melakukan pelaporan SPT.
            Taxana tidak bertanggung jawab atas kesalahan perhitungan atau
            keputusan pelaporan pajak berdasarkan laporan ini.
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

      {/* Transaction Details Page */}
      {taxSummary.transactions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detail Transaksi</Text>

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
            {taxSummary.transactions.slice(0, 30).map((tx, index) => (
              <View
                key={tx.signature}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.colDate}>
                  {formatDate(tx.timestamp)}
                </Text>
                <Text style={styles.colType}>
                  {tx.type === 'buy' ? 'Beli' : 'Jual'}
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
                    ? (tx.gainLossIdr > 0 ? '+' : '') +
                      formatIDR(tx.gainLossIdr)
                    : '-'}
                </Text>
                <Text style={styles.colTax}>
                  {formatIDR(tx.totalTax)}
                </Text>
              </View>
            ))}

            {taxSummary.transactions.length > 30 && (
              <Text style={{ marginTop: 10, fontSize: 8, color: '#6b7280' }}>
                ... dan {taxSummary.transactions.length - 30} transaksi lainnya
              </Text>
            )}
          </View>

          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </Page>
      )}
    </Document>
  );
}
