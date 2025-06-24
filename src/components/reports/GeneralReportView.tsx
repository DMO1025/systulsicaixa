
"use client";

import React from 'react';
import type { GeneralReportViewData } from '@/lib/types';
import type { PeriodDefinition } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";

interface GeneralReportViewProps {
  data: GeneralReportViewData;
  visiblePeriods: PeriodDefinition[];
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const GeneralReportView: React.FC<GeneralReportViewProps> = ({ data, visiblePeriods }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">{data.reportTitle}</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[80vh] overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        {visiblePeriods.map(p => <TableHead key={p.id} className="text-right">{p.label}</TableHead>)}
                        <TableHead className="text-right font-bold">Total COM C.I</TableHead>
                        <TableHead className="text-right font-bold">Reajuste C.I</TableHead>
                        <TableHead className="text-right font-bold">Total SEM C.I</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.dailyBreakdowns.map((row, idx) => (
                        <TableRow key={idx}>
                            <TableCell>{row.date}</TableCell>
                            {visiblePeriods.map(p => (
                                <TableCell key={p.id} className="text-right">
                                    {formatCurrency(row.periodTotals[p.id]?.valor ?? 0)}
                                </TableCell>
                            ))}
                            <TableCell className="text-right font-bold">{formatCurrency(row.totalComCI)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(row.totalReajusteCI)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(row.totalSemCI)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTAL</TableCell>
                        {visiblePeriods.map(p => (
                            <TableCell key={p.id} className="text-right">
                                {formatCurrency(data.summary.periodTotals[p.id]?.valor ?? 0)}
                            </TableCell>
                        ))}
                        <TableCell className="text-right">{formatCurrency(data.summary.grandTotalComCI)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.summary.grandTotalReajusteCI)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.summary.grandTotalSemCI)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </CardContent>
    </Card>
);

export default GeneralReportView;
