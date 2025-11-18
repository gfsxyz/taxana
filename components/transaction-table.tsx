'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import type { Transaction } from '@/lib/db/schema';

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 hover:bg-transparent"
          >
            Tanggal
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.getValue('timestamp'));
          return (
            <div className="text-sm">
              <div>{date.toLocaleDateString('id-ID')}</div>
              <div className="text-muted-foreground text-xs">
                {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'dex',
        header: 'DEX',
        cell: ({ row }) => {
          const dex = row.getValue('dex') as string;
          return (
            <Badge variant="outline" className="capitalize">
              {dex || 'Unknown'}
            </Badge>
          );
        },
      },
      {
        id: 'from',
        header: 'Dari',
        cell: ({ row }) => {
          const symbol = row.original.fromSymbol;
          const amount = row.original.fromAmount;
          return (
            <div className="font-mono text-sm">
              <span className="text-destructive">-</span>{' '}
              {Number(amount).toLocaleString('id-ID', { maximumFractionDigits: 6 })}{' '}
              <span className="text-muted-foreground">{symbol}</span>
            </div>
          );
        },
      },
      {
        id: 'to',
        header: 'Ke',
        cell: ({ row }) => {
          const symbol = row.original.toSymbol;
          const amount = row.original.toAmount;
          return (
            <div className="font-mono text-sm">
              <span className="text-primary">+</span>{' '}
              {Number(amount).toLocaleString('id-ID', { maximumFractionDigits: 6 })}{' '}
              <span className="text-muted-foreground">{symbol}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'signature',
        header: 'Signature',
        cell: ({ row }) => {
          const sig = row.getValue('signature') as string;
          return (
            <a
              href={`https://solscan.io/tx/${sig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {sig.slice(0, 8)}...{sig.slice(-8)}
            </a>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Tidak ada transaksi ditemukan</p>
        <p className="text-sm mt-1">
          Pastikan wallet Anda memiliki transaksi swap pada tahun yang dipilih
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari transaksi..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Tidak ada hasil
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {table.getRowModel().rows.length} dari{' '}
          {table.getFilteredRowModel().rows.length} transaksi
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {table.getState().pagination.pageIndex + 1} dari{' '}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
