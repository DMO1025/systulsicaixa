
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import type { ProcessedDailyTotal } from '@/lib/types';

interface DailyTotalsTableProps {
  dailyTotals: ProcessedDailyTotal[];
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number) => (value || 0).toLocaleString('pt-BR');

const DailyTotalsTable: React.FC<DailyTotalsTableProps> = ({ dailyTotals }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">TOTAIS DIÁRIOS</CardTitle>
        <ListChecks className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] px-4 py-2 text-xs">DATA</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">QTD</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">VALOR TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyTotals.length > 0 ? dailyTotals.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-sm px-4">{row.date}</TableCell>
                <TableCell className="text-right px-4">{formatQty(row.totalQtd)}</TableCell>
                <TableCell className="text-right font-medium px-4">{formatCurrency(row.totalValor)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DailyTotalsTable;
