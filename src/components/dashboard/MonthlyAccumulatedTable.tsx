
"use client";

import React from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import type { AcumulativoMensalItem } from '@/lib/types';

interface MonthlyAccumulatedTableProps {
  data: AcumulativoMensalItem[];
}

const MonthlyAccumulatedTable: React.FC<MonthlyAccumulatedTableProps> = ({ data }) => {
  const router = useRouter(); // Initialize router

  const handleRowClick = (reportLink?: string) => {
    if (reportLink) {
      router.push(reportLink);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">ACUMULATIVO MENSAL</CardTitle>
        <ListChecks className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 text-xs">ITEM</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">QTD / ITENS</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">VALOR TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow 
                key={row.item}
                onClick={() => handleRowClick(row.reportLink)}
                className={row.reportLink ? "cursor-pointer hover:bg-muted/80" : ""}
              >
                <TableCell className="font-medium px-4 py-2 text-xs">{row.item}</TableCell>
                <TableCell className="text-right px-4 py-2 text-xs">{row.qtdDisplay}</TableCell>
                <TableCell className="text-right px-4 py-2 text-xs">R$ {row.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MonthlyAccumulatedTable;

