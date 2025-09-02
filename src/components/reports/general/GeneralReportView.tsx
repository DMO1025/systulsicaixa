
"use client";

import React, { forwardRef, useMemo } from 'react';
import type { GeneralReportViewData } from '@/lib/types';
import type { PeriodDefinition } from '@/lib/config/periods';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DollarSign, Hash, ReceiptText, PlusCircle, Edit, BedDouble, FileCheck2, Moon, Refrigerator } from 'lucide-react';
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
    const { 
        ticketMedioGeral, 
        ticketMedioRS, 
        ticketMedioAlmoco, 
        ticketMedioJantar, 
        ticketMedioFrigobar 
    } = useMemo(() => {
        const summary = data.summary;
        const tmGeral = (summary.grandTotalQtd - summary.grandTotalCIQtd > 0)
            ? summary.grandTotalSemCI / (summary.grandTotalQtd - summary.grandTotalCIQtd)
            : 0;
        
        const rsAlmocoPTValor = summary.periodTotals.almocoPrimeiroTurno?.valor || 0;
        const rsAlmocoSTValor = summary.periodTotals.almocoSegundoTurno?.valor || 0;
        const rsJantarValor = summary.periodTotals.jantar?.valor || 0;
        
        const rsTotalValor = rsAlmocoPTValor + rsAlmocoSTValor + rsJantarValor;
        const rsTotalQtd = (summary.periodTotals.almocoPrimeiroTurno?.qtd || 0) + (summary.periodTotals.almocoSegundoTurno?.qtd || 0) + (summary.periodTotals.jantar?.qtd || 0);

        const tmRS = rsTotalQtd > 0 ? rsTotalValor / rsTotalQtd : 0;
        
        const almocoPT = summary.periodTotals.almocoPrimeiroTurno || { qtd: 0, valor: 0 };
        const almocoST = summary.periodTotals.almocoSegundoTurno || { qtd: 0, valor: 0 };
        const almocoQtd = almocoPT.qtd + almocoST.qtd;
        const almocoValor = almocoPT.valor + almocoST.valor;
        const tmAlmoco = almocoQtd > 0 ? almocoValor / almocoQtd : 0;

        const jantarTotal = summary.periodTotals.jantar || { qtd: 0, valor: 0 };
        const tmJantar = jantarTotal.qtd > 0 ? jantarTotal.valor / jantarTotal.qtd : 0;

        const frigobarTotal = summary.periodTotals.frigobar || { qtd: 0, valor: 0 };
        const tmFrigobar = frigobarTotal.qtd > 0 ? frigobarTotal.valor / frigobarTotal.qtd : 0;
        
        return {
            ticketMedioGeral: tmGeral,
            ticketMedioRS: tmRS,
            ticketMedioAlmoco: tmAlmoco,
            ticketMedioJantar: tmJantar,
            ticketMedioFrigobar: tmFrigobar,
        };
    }, [data.summary]);
    
    const allHeaders = useMemo(() => {
      const periodMap = new Map<string, any>();
      
      periodMap.set('madrugada', { id: 'madrugada', label: 'Madrugada', icon: Moon });
      periodMap.set('roomService', { id: 'roomService', label: 'Room Service', icon: BedDouble });

      visiblePeriods.forEach(p => {
        if (p.type !== 'entry' || p.id === 'madrugada' || p.id === 'frigobar') return;
        
        if (p.id.includes('almoco')) {
            if (!periodMap.has('almoco')) {
                periodMap.set('almoco', { id: 'almoco', label: 'Almoço', icon: getPeriodIcon('almocoPrimeiroTurno'), type: 'entry' });
            }
        } else {
            periodMap.set(p.id, p);
        }
      });
      
      periodMap.set('frigobar', { id: 'frigobar', label: 'Frigobar', icon: Refrigerator });

      return Array.from(periodMap.values());
    }, [visiblePeriods]);
    
    const bodyRows = useMemo(() => {
        return data.dailyBreakdowns.map((row) => {
            const almocoTotal = {
              qtd: (row.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (row.periodTotals['almocoSegundoTurno']?.qtd ?? 0),
              valor: (row.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (row.periodTotals['almocoSegundoTurno']?.valor ?? 0)
            };
            
            const rsTotalDiurno = {
                qtd: (row.periodTotals['almocoPrimeiroTurno']?.qtd || 0) + (row.periodTotals['almocoSegundoTurno']?.qtd || 0) + (row.periodTotals['jantar']?.qtd || 0),
                valor: (row.periodTotals['almocoPrimeiroTurno']?.valor || 0) + (row.periodTotals['almocoSegundoTurno']?.valor || 0) + (row.periodTotals['jantar']?.valor || 0)
            };
            
            const rowData: Record<string, { qtd: number; valor: number }> = {
                ...row.periodTotals,
                almoco: almocoTotal,
                roomService: rsTotalDiurno,
            };

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
                totalCIQtd: row.totalCIQtd,
                totalCIValor: row.totalCIValor,
            };
        });
    }, [data.dailyBreakdowns]);
    
    const footerRow = useMemo(() => {
        const almocoTotal = {
            qtd: (data.summary.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.qtd ?? 0),
            valor: (data.summary.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.valor ?? 0)
        };
        const rsTotalDiurno = {
            qtd: (data.summary.periodTotals['almocoPrimeiroTurno']?.qtd || 0) + (data.summary.periodTotals['almocoSegundoTurno']?.qtd || 0) + (data.summary.periodTotals['jantar']?.qtd || 0),
            valor: (data.summary.periodTotals['almocoPrimeiroTurno']?.valor || 0) + (data.summary.periodTotals['almocoSegundoTurno']?.valor || 0) + (data.summary.periodTotals['jantar']?.valor || 0)
        };
        const rowData: Record<string, { qtd: number; valor: number }> = {
            ...data.summary.periodTotals,
            almoco: almocoTotal,
            roomService: rsTotalDiurno,
        };

        return rowData;
    }, [data.summary]);

    return (
        <div className="space-y-6" ref={ref}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                        <div className="text-2xl font-bold">{formatCurrency(ticketMedioGeral)}</div>
                         <p className="text-xs text-muted-foreground">
                            Valor médio por item vendido
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
                                {allHeaders.map(p => <TableHead key={p.id} className="text-right">{p.label}</TableHead>)}
                                <TableHead className="text-right font-bold">Consumo Interno</TableHead>
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
                                        {allHeaders.map(p => (
                                            <TableCell key={`${p.id}-qtd`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                                {formatQty(row.rowData[p.id]?.qtd)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalCIQtd)}</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalQtd)}</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">-</TableCell>
                                        <TableCell className="text-right font-bold text-xs text-muted-foreground pt-2 pb-0">{formatQty(row.totalQtd - row.totalCIQtd)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        {allHeaders.map(p => (
                                            <TableCell key={`${p.id}-valor`} className="text-right font-medium text-sm pb-2 pt-0">
                                                {formatCurrency(row.rowData[p.id]?.valor)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(row.totalCIValor)}</TableCell>
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
                                {allHeaders.map(p => (
                                    <TableCell key={`${p.id}-qtd-total`} className="text-right text-xs text-muted-foreground pt-2 pb-0">
                                        {formatQty(footerRow[p.id]?.qtd)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalCIQtd)}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalQtd)}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">-</TableCell>
                                <TableCell className="text-right text-xs font-bold text-muted-foreground pt-2 pb-0">{formatQty(data.summary.grandTotalQtd - data.summary.grandTotalCIQtd)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/50 font-bold">
                                {allHeaders.map(p => (
                                    <TableCell key={`${p.id}-valor-total`} className="text-right font-semibold text-sm pb-2 pt-0">
                                        {formatCurrency(footerRow[p.id]?.valor)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right font-bold text-sm pb-2 pt-0">{formatCurrency(data.summary.grandTotalComCI - data.summary.grandTotalSemCI - data.summary.grandTotalReajusteCI)}</TableCell>
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

    