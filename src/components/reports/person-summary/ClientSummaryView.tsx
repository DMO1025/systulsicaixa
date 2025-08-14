"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry, PeriodData, FaturadoItem, ConsumoInternoItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { extractPersonTransactions } from '@/lib/reports/person/generator';

interface ClientSummaryViewProps {
  entries: DailyLogEntry[];
  consumptionType: string;
}

interface ClientSummary {
    totalQtd: number;
    totalValue: number;
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatNumber = (value: number) => (value || 0).toLocaleString('pt-BR');

const ClientSummaryView: React.FC<ClientSummaryViewProps> = ({ entries, consumptionType }) => {

  const clientSummaries = useMemo(() => {
    const { allTransactions } = extractPersonTransactions(entries, consumptionType);
    const summaryMap: Record<string, ClientSummary> = {};

    allTransactions.forEach(t => {
        if (!summaryMap[t.personName]) {
            summaryMap[t.personName] = { totalQtd: 0, totalValue: 0 };
        }
        summaryMap[t.personName].totalQtd += t.quantity;
        summaryMap[t.personName].totalValue += t.value;
    });

    return Object.entries(summaryMap)
      .map(([clientName, summary]) => ({ clientName, ...summary }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [entries, consumptionType]);

  const grandTotal = useMemo(() => {
    return clientSummaries.reduce((acc, client) => {
        acc.totalQtd += client.totalQtd;
        acc.totalValue += client.totalValue;
        return acc;
    }, { totalQtd: 0, totalValue: 0 });
  }, [clientSummaries]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Resumo Mensal de Consumo por Pessoa</CardTitle>
            <CardDescription>
                Totais de consumo (faturado e interno) para todas as pessoas no período selecionado.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pessoa</TableHead>
                        <TableHead className="text-right">Total de Itens</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clientSummaries.length > 0 ? clientSummaries.map((client) => (
                        <TableRow key={client.clientName}>
                            <TableCell className="font-medium">{client.clientName}</TableCell>
                            <TableCell className="text-right">{formatNumber(client.totalQtd)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(client.totalValue)}</TableCell>
                        </TableRow>
                    )) : (
                       <TableRow>
                           <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum consumo encontrado para os filtros selecionados.</TableCell>
                       </TableRow>
                    )}
                </TableBody>
                {clientSummaries.length > 0 && (
                    <TableFooter>
                        <TableRow className="font-bold bg-muted/50">
                            <TableCell>TOTAL GERAL</TableCell>
                            <TableCell className="text-right">{formatNumber(grandTotal.totalQtd)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(grandTotal.totalValue)}</TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </CardContent>
    </Card>
  );
};

export default ClientSummaryView;
