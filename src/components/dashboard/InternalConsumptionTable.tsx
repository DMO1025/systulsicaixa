
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";

interface InternalConsumptionTableProps {
  ciAlmoco: { qtd: number; valor: number };
  ciJantar: { qtd: number; valor: number };
  totalConsumoInternoGeral: { qtd: number; valor: number };
}

const InternalConsumptionTable: React.FC<InternalConsumptionTableProps> = ({
  ciAlmoco,
  ciJantar,
  totalConsumoInternoGeral,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">CONSUMO INTERNO</CardTitle>
        <ListChecks className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 text-xs">ITEM</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">QTD</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">VALOR TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium px-4 py-2 text-xs">ALMOÇO</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{ciAlmoco.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {ciAlmoco.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium px-4 py-2 text-xs">JANTAR</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{ciJantar.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {ciJantar.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow className="font-semibold bg-muted/50">
              <TableCell className="px-4 py-2 text-xs">TOTAL CI</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{totalConsumoInternoGeral.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {totalConsumoInternoGeral.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default InternalConsumptionTable;
