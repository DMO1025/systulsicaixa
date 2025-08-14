
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks, PlusCircle, Edit } from "lucide-react";
import type { ProcessedDailyTotal } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
              <TableHead className="w-[150px] px-4 py-2 text-xs">DATA / CRIAÇÃO</TableHead>
              <TableHead className="w-[150px] px-4 py-2 text-xs">ÚLTIMA MODIFICAÇÃO</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">QTD</TableHead>
              <TableHead className="px-4 py-2 text-xs text-right">VALOR TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyTotals.length > 0 ? dailyTotals.map((row, index) => {
              const createdAtDate = row.createdAt ? (typeof row.createdAt === 'string' ? parseISO(row.createdAt) : row.createdAt) : null;
              const lastModifiedDate = row.lastModifiedAt ? (typeof row.lastModifiedAt === 'string' ? parseISO(row.lastModifiedAt) : row.lastModifiedAt) : null;
              
              const formattedCreationTime = createdAtDate && isValid(createdAtDate) 
                ? format(createdAtDate, 'HH:mm', { locale: ptBR }) 
                : '--:--';
              
              let formattedModificationDateTime = '--:--';
              if(createdAtDate && lastModifiedDate && isValid(createdAtDate) && isValid(lastModifiedDate)){
                // Only show modification if it's different from creation time (within a minute grace period)
                 if (lastModifiedDate.getTime() - createdAtDate.getTime() > 60000) {
                     formattedModificationDateTime = format(lastModifiedDate, 'dd/MM/yy HH:mm', { locale: ptBR });
                 }
              }

              return(
                <TableRow key={`${row.id}-${index}`}>
                    <TableCell className="font-medium text-sm px-4">
                        <div>{row.date}</div>
                        <div className="text-xs text-muted-foreground font-normal">{formattedCreationTime}</div>
                    </TableCell>
                    <TableCell className="text-xs px-4 text-muted-foreground">{formattedModificationDateTime}</TableCell>
                    <TableCell className="text-right px-4">{formatQty(row.totalQtd)}</TableCell>
                    <TableCell className="text-right font-medium px-4">{formatCurrency(row.totalValor)}</TableCell>
                </TableRow>
              )
            }) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
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

