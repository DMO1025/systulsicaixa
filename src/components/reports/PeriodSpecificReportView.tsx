

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { PeriodReportViewData, DailyCategoryDataItem, PeriodId, FaturadoItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    HelpCircle
} from "lucide-react";
import { TAB_DEFINITIONS } from './tabDefinitions';

interface PeriodSpecificReportViewProps {
    data: PeriodReportViewData;
    periodId: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService';
}

const formatCurrency = (value: number) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const formatNumber = (value: number) => (value || 0).toLocaleString('pt-BR');

const PeriodSpecificReportView: React.FC<PeriodSpecificReportViewProps> = ({ data, periodId }) => {
    const [activeDetailTab, setActiveDetailTab] = useState<string>('');
    
    const availableTabs = useMemo(() => {
        return TAB_DEFINITIONS.filter(tab => 
            data.dailyBreakdowns[tab.id] && data.dailyBreakdowns[tab.id].length > 0
        );
    }, [data.dailyBreakdowns]);

    useEffect(() => {
        if (availableTabs.length > 0) {
            const currentTabIsAvailable = availableTabs.some(tab => tab.id === activeDetailTab);
            if (!currentTabIsAvailable) {
                setActiveDetailTab(availableTabs[0].id);
            }
        } else {
            setActiveDetailTab('');
        }
    }, [availableTabs, activeDetailTab]);
    
    const summaryData = useMemo(() => {
      const summaryTotals = data.summary || {};
      const hotel = summaryTotals['faturado-hotel'] || { qtd: 0, total: 0 };
      const funcionario = summaryTotals['faturado-funcionario'] || { qtd: 0, total: 0 };
      const ciAlmocoPT = summaryTotals['ci-almoco-pt'] || { qtd: 0, total: 0 };
      const ciAlmocoST = summaryTotals['ci-almoco-st'] || { qtd: 0, total: 0 };
      const ciJantar = summaryTotals['ci-jantar'] || { qtd: 0, total: 0 };
      const rsMadrugada = summaryTotals['rsMadrugada'] || { qtd: 0, total: 0 };
      const rsAlmocoPT = summaryTotals['rsAlmocoPT'] || { qtd: 0, total: 0 };
      const rsAlmocoST = summaryTotals['rsAlmocoST'] || { qtd: 0, total: 0 };
      const rsJantar = summaryTotals['rsJantar'] || { qtd: 0, total: 0 };

      const subtotalFaturado = hotel.total + funcionario.total;
      const totalFaturadoQtd = hotel.qtd + funcionario.qtd;
      const ticketMedioFaturado = totalFaturadoQtd > 0 ? subtotalFaturado / totalFaturadoQtd : 0;
      
      const subtotalCI = ciAlmocoPT.total + ciAlmocoST.total + ciJantar.total;
      const totalCIQtd = ciAlmocoPT.qtd + ciAlmocoST.qtd + ciJantar.qtd;
      const ticketMedioCI = totalCIQtd > 0 ? subtotalCI / totalCIQtd : 0;
      
      const subtotalRoomService = rsMadrugada.total + rsAlmocoPT.total + rsAlmocoST.total + rsJantar.total;
      const totalRoomServiceQtd = (summaryTotals['rsMadrugada']?.qtd || 0) + (summaryTotals['rsAlmocoPT']?.qtd || 0) + (summaryTotals['rsAlmocoST']?.qtd || 0) + (summaryTotals['rsJantar']?.qtd || 0);
      const ticketMedioRoomService = totalRoomServiceQtd > 0 ? subtotalRoomService / totalRoomServiceQtd : 0;
      
      const cdmLista = summaryTotals['cdmLista'] || { qtd: 0, total: 0 };
      const cdmNoShow = summaryTotals['cdmNoShow'] || { qtd: 0, total: 0 };
      const cdmSemCheckIn = summaryTotals['cdmSemCheckIn'] || { qtd: 0, total: 0 };
      const cdmAvulsos = summaryTotals['cdmAvulsos'] || { qtd: 0, total: 0 };
      const subtotalCafe = cdmLista.total + cdmNoShow.total + cdmSemCheckIn.total + cdmAvulsos.total;
      const totalCafeQtd = cdmLista.qtd + cdmNoShow.qtd + cdmSemCheckIn.qtd + cdmAvulsos.qtd;
      const ticketMedioCafe = totalCafeQtd > 0 ? subtotalCafe / totalCafeQtd : 0;


      return {
          faturado: { hotel, funcionario, subtotal: subtotalFaturado, ticketMedio: ticketMedioFaturado },
          consumoInterno: { ciAlmocoPT, ciAlmocoST, ciJantar, subtotal: subtotalCI, ticketMedio: ticketMedioCI },
          roomService: { rsMadrugada, rsAlmocoPT, rsAlmocoST, rsJantar, subtotal: subtotalRoomService, ticketMedio: ticketMedioRoomService },
          cafeDaManha: { cdmLista, cdmNoShow, cdmSemCheckIn, cdmAvulsos, subtotal: subtotalCafe, ticketMedio: ticketMedioCafe },
      };
    }, [data.summary]);

    const genericSummaryRows = useMemo(() => {
        const grandTotal = { qtd: 0, valor: 0 };
        const rows = availableTabs.map(tab => {
            const summary = data.summary[tab.id];
            if (!summary) return null;
            grandTotal.qtd += summary.qtd;
            grandTotal.valor += summary.total;
            return (
                <TableRow key={`summary-${tab.id}`}>
                    <TableCell className="font-medium text-xs py-1.5 px-2">{tab.label}</TableCell>
                    <TableCell className="text-right text-xs py-1.5 px-2">{formatNumber(summary.qtd)}</TableCell>
                    <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summary.total)}</TableCell>
                </TableRow>
            );
        }).filter(Boolean);

        const ticketMedio = grandTotal.qtd > 0 ? grandTotal.valor / grandTotal.qtd : 0;

        return { rows, grandTotal, ticketMedio };
    }, [availableTabs, data.summary]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento Diário</CardTitle>
                            <CardDescription>Visualize os dados detalhados por categoria navegando pelas abas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {availableTabs.length > 0 ? (
                                <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
                                    <TabsList className="mb-4 h-auto flex-wrap justify-start">
                                    {availableTabs.map(tab => {
                                        const Icon = tab.IconComp || HelpCircle;
                                        return (
                                        <TabsTrigger 
                                            key={tab.id} 
                                            value={tab.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase font-semibold data-[state=active]:text-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                                        >
                                            <Icon className="h-4 w-4" />{tab.label}
                                        </TabsTrigger>
                                        );
                                    })}
                                    </TabsList>
                                    {availableTabs.map(tab => {
                                        const breakdownData = data.dailyBreakdowns[tab.id] || [];
                                        const columnTotals = tab.cols.map(col => {
                                            if (col.isNum || col.isCurrency) {
                                                return breakdownData.reduce((acc, item) => acc + (Number((item as any)[col.key]) || 0), 0);
                                            }
                                            return null;
                                        });

                                        return (
                                            <TabsContent key={tab.id} value={tab.id}>
                                                <div className={cn("border-2 rounded-lg transition-all", activeDetailTab === tab.id ? 'border-primary/20 ring-1 ring-primary/10' : 'border-border')}>
                                                    <Table>
                                                    <TableHeader><TableRow>{tab.cols.map(col => <TableHead key={col.key} className={cn("text-xs", col.isNum || col.isCurrency ? "text-right" : "")}>{col.label}</TableHead>)}</TableRow></TableHeader>
                                                    <TableBody>
                                                        {breakdownData.map((item: DailyCategoryDataItem, idx: number) => (
                                                        <TableRow key={idx}>
                                                            {tab.cols.map(col => (
                                                            <TableCell key={col.key} className={cn("text-xs py-1.5 px-2", col.isNum || col.isCurrency ? "text-right" : "", col.key === 'observation' ? 'text-muted-foreground' : '')}>
                                                                {col.isCurrency ? formatCurrency(Number((item as any)[col.key] || 0)) : ((item as any)[col.key] ?? (col.isNum ? '0' : '-'))}
                                                            </TableCell>
                                                            ))}
                                                        </TableRow>
                                                        ))}
                                                        {breakdownData.length === 0 && 
                                                        <TableRow><TableCell colSpan={tab.cols.length} className="text-center text-xs py-3">Nenhum dado para esta categoria.</TableCell></TableRow>}
                                                    </TableBody>
                                                    {breakdownData.length > 0 && (
                                                        <TableFooter>
                                                            <TableRow className="font-bold bg-muted/50">
                                                                {tab.cols.map((col, index) => (
                                                                    <TableCell key={`total-${col.key}`} className={cn("text-xs py-1.5 px-2", col.isNum || col.isCurrency ? "text-right" : "")}>
                                                                        {index === 0 ? "TOTAL" : 
                                                                         columnTotals[index] !== null ? 
                                                                         (col.isCurrency ? formatCurrency(columnTotals[index]!) : formatNumber(columnTotals[index]!))
                                                                         : ''}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableFooter>
                                                    )}
                                                    </Table>
                                                </div>
                                            </TabsContent>
                                        );
                                    })}
                                </Tabs>
                            ) : (
                                <div className="text-center py-10 text-sm text-muted-foreground">
                                    <p>Nenhum dado detalhado encontrado para este período.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">{data.reportTitle}</CardTitle></CardHeader>
                        <CardContent>
                        {periodId === 'roomService' ? (
                           <Table>
                                <TableHeader><TableRow><TableHead className="text-xs">TURNO</TableHead><TableHead className="text-xs text-right">TOTAL</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">MADRUGADA</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.roomService.rsMadrugada.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">ALMOÇO 01</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.roomService.rsAlmocoPT.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">ALMOÇO 02</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.roomService.rsAlmocoST.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">JANTAR</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.roomService.rsJantar.total)}</TableCell></TableRow>
                                    <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.roomService.subtotal)}</TableCell></TableRow>
                                    <TableRow className="font-bold border-t-2 border-primary/50"><TableCell className="text-xs py-1.5 px-2">TICKET MÉDIO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.roomService.ticketMedio)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        ) : periodId === 'faturado' ? (
                            <Table>
                                <TableHeader><TableRow><TableHead className="text-xs">ITEM</TableHead><TableHead className="text-xs text-right">TOTAL</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">HOTEL</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.faturado.hotel.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">FUNCIONÁRIO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.faturado.funcionario.total)}</TableCell></TableRow>
                                    <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.faturado.subtotal)}</TableCell></TableRow>
                                    <TableRow className="font-bold border-t-2 border-primary/50"><TableCell className="text-xs py-1.5 px-2">TICKET MÉDIO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.faturado.ticketMedio)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                         ) : periodId === 'cafeDaManha' ? (
                            <Table>
                                <TableHeader><TableRow><TableHead className="text-xs">CATEGORIA</TableHead><TableHead className="text-xs text-right">TOTAL</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">LISTA DE HÓSPEDES</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.cafeDaManha.cdmLista.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">NO-SHOW</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.cafeDaManha.cdmNoShow.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">S/ CHECK-IN</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.cafeDaManha.cdmSemCheckIn.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">AVULSOS</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.cafeDaManha.cdmAvulsos.total)}</TableCell></TableRow>
                                    <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.cafeDaManha.subtotal)}</TableCell></TableRow>
                                    <TableRow className="font-bold border-t-2 border-primary/50"><TableCell className="text-xs py-1.5 px-2">TICKET MÉDIO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.cafeDaManha.ticketMedio)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        ) : periodId === 'consumoInterno' ? (
                           <Table>
                                <TableHeader><TableRow><TableHead className="text-xs">TURNO</TableHead><TableHead className="text-xs text-right">TOTAL</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">ALMOÇO 1º TURNO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.consumoInterno.ciAlmocoPT.total)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">ALMOÇO 2º TURNO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.consumoInterno.ciAlmocoST.total)}</TableCell></TableRow>
                                     <TableRow><TableCell className="font-medium text-xs py-1.5 px-2">JANTAR</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.consumoInterno.ciJantar.total)}</TableCell></TableRow>
                                    <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.consumoInterno.subtotal)}</TableCell></TableRow>
                                    <TableRow className="font-bold border-t-2 border-primary/50"><TableCell className="text-xs py-1.5 px-2">TICKET MÉDIO</TableCell><TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(summaryData.consumoInterno.ticketMedio)}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">CATEGORIA</TableHead>
                                        <TableHead className="text-xs text-right">QTD</TableHead>
                                        <TableHead className="text-xs text-right">VALOR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {genericSummaryRows.rows.length > 0 ? (
                                        <>
                                            {genericSummaryRows.rows}
                                            <TableRow className="font-semibold bg-muted/50">
                                                <TableCell className="text-xs py-1.5 px-2">TOTAL</TableCell>
                                                <TableCell className="text-right text-xs py-1.5 px-2">{formatNumber(genericSummaryRows.grandTotal.qtd)}</TableCell>
                                                <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(genericSummaryRows.grandTotal.valor)}</TableCell>
                                            </TableRow>
                                            <TableRow className="font-bold border-t-2 border-primary/50">
                                                <TableCell className="text-xs py-1.5 px-2">TICKET MÉDIO</TableCell>
                                                <TableCell colSpan={2} className="text-right text-xs py-1.5 px-2">{formatCurrency(genericSummaryRows.ticketMedio)}</TableCell>
                                            </TableRow>
                                        </>
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-3">
                                                Nenhum total para exibir.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default PeriodSpecificReportView;
