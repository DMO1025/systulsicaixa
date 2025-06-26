"use client";

import React, { forwardRef } from 'react';
import type { GeneralReportViewData } from '@/lib/types';
import type { PeriodDefinition } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DollarSign, Hash, ReceiptText } from 'lucide-react';

interface GeneralReportViewProps {
  data: GeneralReportViewData;
  visiblePeriods: PeriodDefinition[];
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number) => (value || 0).toLocaleString('pt-BR');

const formatQtyAndCurrency = (qty: number | undefined, value: number | undefined) => {
    return `${formatQty(qty || 0)} / ${formatCurrency(value || 0)}`;
};

const GeneralReportView = forwardRef<HTMLDivElement, GeneralReportViewProps>(({ data, visiblePeriods }, ref) => {
    const ticketMedio = (data.summary.grandTotalQtd - data.summary.grandTotalCIQtd > 0)
        ? data.summary.grandTotalSemCI / (data.summary.grandTotalQtd - data.summary.grandTotalCIQtd)
        : 0;

    return (
        <div className="space-y-6" ref={ref}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total (com CI)</CardTitle>
                            <div className="text-2xl font-bold">{formatCurrency(data.summary.grandTotalComCI)}</div>
                        </div>
                        <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total (sem CI)</CardTitle>
                            <div className="text-2xl font-bold">{formatCurrency(data.summary.grandTotalSemCI)}</div>
                        </div>
                        <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens/Transações</CardTitle>
                            <div className="text-2xl font-bold">{data.summary.grandTotalQtd.toLocaleString('pt-BR')}</div>
                        </div>
                        <Hash className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio (sem CI)</CardTitle>
                            <div className="text-2xl font-bold">{formatCurrency(ticketMedio)}</div>
                        </div>
                        <ReceiptText className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tabela de Detalhamento (Qtd / Valor)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                {visiblePeriods.map(p => <TableHead key={p.id} className="text-right">{p.label}</TableHead>)}
                                <TableHead className="text-right font-bold">Total GERAL</TableHead>
                                <TableHead className="text-right font-bold">Reajuste C.I</TableHead>
                                <TableHead className="text-right font-bold">Total LÍQUIDO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.dailyBreakdowns.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{row.date}</TableCell>
                                    {visiblePeriods.map(p => (
                                        <TableCell key={p.id} className="text-right">
                                            {formatQtyAndCurrency(row.periodTotals[p.id]?.qtd, row.periodTotals[p.id]?.valor)}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right font-bold">{formatQtyAndCurrency(row.totalQtd, row.totalComCI)}</TableCell>
                                    <TableCell className="text-right font-bold">- / {formatCurrency(row.totalReajusteCI)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatQtyAndCurrency(row.totalQtd - row.totalCIQtd, row.totalSemCI)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell>TOTAL</TableCell>
                                {visiblePeriods.map(p => (
                                    <TableCell key={p.id} className="text-right">
                                        {formatQtyAndCurrency(data.summary.periodTotals[p.id]?.qtd, data.summary.periodTotals[p.id]?.valor)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right">{formatQtyAndCurrency(data.summary.grandTotalQtd, data.summary.grandTotalComCI)}</TableCell>
                                <TableCell className="text-right">- / {formatCurrency(data.summary.grandTotalReajusteCI)}</TableCell>
                                <TableCell className="text-right">{formatQtyAndCurrency(data.summary.grandTotalQtd - data.summary.grandTotalCIQtd, data.summary.grandTotalSemCI)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
});
GeneralReportView.displayName = 'GeneralReportView';

export default GeneralReportView;
