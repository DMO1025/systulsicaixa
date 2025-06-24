
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";

interface GeneralTotalsTableProps {
  overallTotalTransactions: number;
  overallTotalRevenue: number;
  overallTotalReajusteCI: number;
  totalGeralSemCI: { qtd: number; valor: number };
}

const GeneralTotalsTable: React.FC<GeneralTotalsTableProps> = ({
  overallTotalTransactions,
  overallTotalRevenue,
  overallTotalReajusteCI,
  totalGeralSemCI,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">TOTAL GERAL</CardTitle>
        <ListChecks className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 text-xs">CI</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">QTD</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">VALOR TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium px-4 py-2 text-xs">COM CI</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{overallTotalTransactions.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {overallTotalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium px-4 py-2 text-xs">REAJUSTE CI</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">-</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {overallTotalReajusteCI.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium px-4 py-2 text-xs">SEM CI</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{totalGeralSemCI.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {totalGeralSemCI.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default GeneralTotalsTable;
