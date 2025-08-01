

"use client";

import React, { forwardRef, useMemo } from 'react';
import type { GeneralReportViewData } from '@/lib/types';
import type { PeriodDefinition } from '@/lib/config/periods';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DollarSign, Hash, ReceiptText, PlusCircle, Edit, BedDouble } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { getPeriodIcon } from '@/lib/config/periods';

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
    
    // Filter out 'madrugada', control periods, and add a custom 'roomService' definition for the header
    const reportablePeriods = useMemo(() => {
      // Consolidate "Almoço Primeiro Turno" and "Almoço Segundo Turno" into a single "Almoço" column
      const periodMap = new Map<string, PeriodDefinition>();
      visiblePeriods.forEach(p => {
        if (p.type !== 'entry' || p.id === 'madrugada') return;

        if (p.id.includes('almoco')) {
            if (!periodMap.has('almoco')) {
                periodMap.set('almoco', { id: 'almoco', label: 'Almoço', icon: getPeriodIcon('almocoPrimeiroTurno'), type: 'entry' });
            }
        } else {
            periodMap.set(p.id, p);
        }
      });
      return Array.from(periodMap.values());
    }, [visiblePeriods]);
    
    const roomServiceDefinition = { id: 'roomService', label: 'Room Service', icon: BedDouble };

    // Memoize the body rows to avoid recalculating on every render
    const bodyRows = useMemo(() => {
        return data.dailyBreakdowns.map((row) => {
            const almocoTotalQtd = (row.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (row.periodTotals['almocoSegundoTurno']?.qtd ?? 0);
            const almocoTotalValor = (row.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (row.periodTotals['almocoSegundoTurno']?.valor ?? 0);

            const rowData: Record<string, { qtd: number; valor: number }> = {
                roomService: row.periodTotals.roomService || { qtd: 0, valor: 0 },
                almoco: { qtd: almocoTotalQtd, valor: almocoTotalValor }
            };

            reportablePeriods.forEach(p => {
                if (p.id !== 'almoco') {
                    rowData[p.id] = row.periodTotals[p.id as keyof typeof row.periodTotals] || { qtd: 0, valor: 0 };
                }
            });

            return {
                id: row.date,
                date: row.date,
                createdAt: row.createdAt,
                lastModifiedAt: row.lastModifiedAt,
                rowData,
                totalComCI: row.totalComCI,
                totalReajusteCI: row.totalReajusteCI,
                totalSemCI: row.totalSemCI,
                totalQtd: row.totalQtd,
                totalCIQtd: row.totalCIQtd
            };
        });
    }, [data.dailyBreakdowns, reportablePeriods]);
    
    // Memoize the footer row
    const footerRow = useMemo(() => {
        const almocoTotalQtd = (data.summary.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.qtd ?? 0);
        const almocoTotalValor = (data.summary.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.valor ?? 0);

        const rowData: Record<string, { qtd: number; valor: number }> = {
            roomService: data.summary.periodTotals.roomService || { qtd: 0, valor: 0 },
            almoco: { qtd: almocoTotalQtd, valor: almocoTotalValor }
        };

        reportablePeriods.forEach(p => {
            if (p.id !== 'almoco') {
                rowData[p.id] = data.summary.periodTotals[p.id as keyof typeof data.summary.periodTotals] || { qtd: 0, valor: 0 };
            }
        });

        return rowData;
    }, [data.summary, reportablePeriods]);

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
                                <TableHead key={roomServiceDefinition.id} className="text-right">{roomServiceDefinition.label}</TableHead>
                                {reportablePeriods.map(p => <TableHead key={p.id} className="text-right">{p.label}</TableHead>)}
                                <TableHead className="text-right font-bold">Total GERAL</TableHead>
                                <TableHead className="text-right font-bold">Reajuste C.I</TableHead>
                                <TableHead className="text-right font-bold">Total LÍQUIDO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bodyRows.map((row, idx) => {
                                const createdAtDate = row.createdAt ? (typeof row.createdAt === 'string' ? parseISO(row.createdAt) : row.createdAt) : null;
                                const lastModifiedDate = row.lastModifiedAt ? (typeof row.lastModifiedAt === 'string' ? parseISO(row.lastModifiedAt) : row.lastModifiedAt) : null;
                                const formattedCreationTime = createdAtDate && isValid(createdAtDate) ? format(createdAtDate, 'HH:mm', { locale: ptBR }) : '--:--';
                                const formattedModificationTime = lastModifiedDate && isValid(lastModifiedDate) ? format(lastModifiedDate, 'HH:mm', { locale: ptBR }) : '--:--';

                                return (
                                <React.Fragment key={idx}>
                                    <TableRow className={idx > 0 ? "border-t-2 border-border" : ""}>
                                        <TableCell rowSpan={2} className="align-top border-r font-medium pt-3">
                                            <div className="text-sm">{row.date}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                <PlusCircle className="h-3 w-3" /> {formattedCreationTime}
                                            </div>
                                             <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                <Edit className="h-3 w-3" /> {formattedModificationTime}
                                            </div>
                                        </TableCell>
                                        <TableCell key={`${roomServiceDefinition.id}-qtd`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                            {formatQty(row.rowData['roomService']?.qtd)}
                                        </TableCell>
                                        {reportablePeriods.map(p => (
                                            <TableCell key={`${p.id}-qtd`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                                {formatQty(row.rowData[p.id]?.qtd)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalQtd)}</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">-</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalQtd - row.totalCIQtd)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell key={`${roomServiceDefinition.id}-valor`} className="text-right font-medium text-sm pb-2 pt-0">
                                            {formatCurrency(row.rowData['roomService']?.valor)}
                                        </TableCell>
                                        {reportablePeriods.map(p => (
                                            <TableCell key={`${p.id}-valor`} className="text-right font-medium text-sm pb-2 pt-0">
                                                {formatCurrency(row.rowData[p.id]?.valor)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalComCI)}</TableCell>
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalReajusteCI)}</TableCell>
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalSemCI)}</TableCell>
                                    </TableRow>
                                </React.Fragment>
                                )
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted/50 font-bold border-t-4 border-double border-foreground/50">
                                <TableCell rowSpan={2} className="align-middle border-r text-base">TOTAL</TableCell>
                                <TableCell key={`${roomServiceDefinition.id}-qtd-total`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                    {formatQty(footerRow['roomService']?.qtd)}
                                </TableCell>
                                {reportablePeriods.map(p => (
                                    <TableCell key={`${p.id}-qtd-total`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                        {formatQty(footerRow[p.id]?.qtd)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalQtd)}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">-</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalQtd - data.summary.grandTotalCIQtd)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell key={`${roomServiceDefinition.id}-valor-total`} className="text-right font-semibold text-sm pb-2 pt-0">
                                    {formatCurrency(footerRow['roomService']?.valor)}
                                </TableCell>
                                {reportablePeriods.map(p => (
                                    <TableCell key={`${p.id}-valor-total`} className="text-right font-semibold text-sm pb-2 pt-0">
                                        {formatCurrency(footerRow[p.id]?.valor)}
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
