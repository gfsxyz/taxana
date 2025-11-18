import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { db, transactions } from '@/lib/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { calculateTaxes } from '@/lib/services/tax-calculator';
import { TaxReportPDF } from '@/lib/pdf/tax-report';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, year } = body;

    if (!walletAddress || !year) {
      return NextResponse.json(
        { error: 'walletAddress and year are required' },
        { status: 400 }
      );
    }

    // Get transactions from database
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.walletAddress, walletAddress),
          gte(transactions.timestamp, startDate),
          lte(transactions.timestamp, endDate)
        )
      )
      .orderBy(desc(transactions.timestamp));

    if (txs.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 404 }
      );
    }

    // Calculate taxes
    const taxSummary = await calculateTaxes(txs);

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      TaxReportPDF({
        walletAddress,
        year,
        taxSummary,
        generatedAt: new Date(),
      })
    );

    // Return PDF as downloadable file
    const filename = `taxana-report-${year}-${walletAddress.slice(0, 8)}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
