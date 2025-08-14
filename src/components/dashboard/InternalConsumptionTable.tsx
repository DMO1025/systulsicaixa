
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import { cn } from '@/lib/utils';
import { REPORTS_PATHS } from '@/lib/config/navigation';

interface InternalConsumptionTableProps {
  ciAlmoco: { qtd: number; valor: number };
  ciJantar: { qtd: number; valor: number };
  totalConsumoInternoGeral: { qtd: number; valor: number };
  selectedMonth: Date;
}

const InternalConsumptionTable: React.FC<InternalConsumptionTableProps> = ({
  ciAlmoco,
  ciJantar,
  totalConsumoInternoGeral,
  selectedMonth,
}) => {
  const router = useRouter();

  const handleRowClick = (periodo: 'almoco' | 'jantar' | 'total') => {
    const monthStr = format(selectedMonth, "yyyy-MM-dd");
    
    // O relatório de Consumo Interno é consolidado, então o link é sempre para `consumoInterno`
    // No futuro, poderíamos adicionar um sub-filtro se necessário, mas por agora o link principal é suficiente.
    router.push(`${REPORTS_PATHS.PERIOD}?periodId=consumoInterno&filterFocus=item&month=${monthStr}`);
  };

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
            <TableRow 
              onClick={() => handleRowClick('almoco')} 
              className={cn("cursor-pointer hover:bg-muted/80")}
            >
              <TableCell className="font-medium px-4 py-2 text-xs">ALMOÇO</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{ciAlmoco.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {ciAlmoco.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow 
              onClick={() => handleRowClick('jantar')} 
              className={cn("cursor-pointer hover:bg-muted/80")}
            >
              <TableCell className="font-medium px-4 py-2 text-xs">JANTAR</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{ciJantar.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">R$ {ciJantar.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
            <TableRow 
              onClick={() => handleRowClick('total')} 
              className={cn("font-semibold bg-muted/50 cursor-pointer hover:bg-muted/80")}
            >
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
