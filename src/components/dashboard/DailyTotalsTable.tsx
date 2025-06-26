
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import type { ProcessedDailyTotal } from '@/lib/types';

interface DailyTotalsTableProps {
  dailyTotals: ProcessedDailyTotal[];
}

const DailyTotalsTable: React.FC<DailyTotalsTableProps> = ({ dailyTotals }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">TOTAIS DIÁRIOS</CardTitle>
        <ListChecks className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0 max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 text-xs sticky top-0 bg-card z-10">DATA</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right sticky top-0 bg-card z-10">QTD TOTAL</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right sticky top-0 bg-card z-10">VALOR TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyTotals.length > 0 ? dailyTotals.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-4 py-2 text-xs">{row.date}</TableCell>
                <TableCell className="text-right px-4 py-2 text-xs">{row.totalQtd.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right px-4 py-2 text-xs">R$ {row.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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
