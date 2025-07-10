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

const GeneralReportView = forwardRef<HTMLDivElement, GeneralReportViewProps>(({ data, visiblePeriods }, ref) => {
    const ticketMedio = (data.summary.grandTotalQtd - data.summary.grandTotalCIQtd > 0)
        ? data.summary.grandTotalSemCI / (data.summary.grandTotalQtd - data.summary.grandTotalCIQtd)
        : 0;

    return (
        <div className="space-y-6" ref={ref}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total (com CI)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.summary.grandTotalComCI)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatQty(data.summary.grandTotalQtd)} Itens
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Líquida (sem CI)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.summary.grandTotalSemCI)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatQty(data.summary.grandTotalQtd - data.summary.grandTotalCIQtd)} Itens
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Médio (sem CI)</CardTitle>
                        <ReceiptText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(ticketMedio)}</div>
                        <p className="text-xs text-muted-foreground">
                            Valor médio por item
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tabela de Detalhamento Diário</CardTitle>
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
                                <React.Fragment key={idx}>
                                    <TableRow className={idx > 0 ? "border-t-2 border-border" : ""}>
                                        <TableCell rowSpan={2} className="align-middle border-r font-medium text-sm">{row.date}</TableCell>
                                        {visiblePeriods.map(p => (
                                            <TableCell key={`${p.id}-qtd`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                                {formatQty(row.periodTotals[p.id]?.qtd)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalQtd)}</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">-</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalQtd - row.totalCIQtd)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        {visiblePeriods.map(p => (
                                            <TableCell key={`${p.id}-valor`} className="text-right font-medium text-sm pb-2 pt-0">
                                                {formatCurrency(row.periodTotals[p.id]?.valor)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalComCI)}</TableCell>
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalReajusteCI)}</TableCell>
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalSemCI)}</TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted/50 font-bold border-t-4 border-double border-foreground/50">
                                <TableCell rowSpan={2} className="align-middle border-r text-base">TOTAL</TableCell>
                                {visiblePeriods.map(p => (
                                    <TableCell key={`${p.id}-qtd-total`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                        {formatQty(data.summary.periodTotals[p.id]?.qtd)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalQtd)}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">-</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalQtd - data.summary.grandTotalCIQtd)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                                {visiblePeriods.map(p => (
                                    <TableCell key={`${p.id}-valor-total`} className="text-right font-semibold text-sm pb-2 pt-0">
                                        {formatCurrency(data.summary.periodTotals[p.id]?.valor)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(data.summary.grandTotalComCI)}</TableCell>
                                <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(data.summary.grandTotalReajusteCI)}</TableCell>
                                <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(data.summary.grandTotalSemCI)}</TableCell>
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
