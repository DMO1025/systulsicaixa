
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { PeriodReportViewData, DailyCategoryDataItem, PeriodId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    ListChecks, Truck, Utensils, Building, Package, FileCheck2, UtensilsCrossed, HelpCircle
} from "lucide-react";

interface PeriodSpecificReportViewProps {
    data: PeriodReportViewData;
    periodId: PeriodId | 'all';
}

const tabDefinitions = [
    { id: 'faturados', label: 'FATURADOS', IconComp: ListChecks,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD FAT.', isNum: true}, {key: 'hotel', label: 'R$ HOTEL', isCurrency: true}, {key: 'funcionario', label: 'R$ FUNC.', isCurrency: true}, {key: 'total', label: 'TOTAL FAT.', isCurrency: true}] },
    { id: 'ifood', label: 'IFOOD', IconComp: Truck,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'rappi', label: 'RAPPI', IconComp: Truck,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'mesa', label: 'MESA', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD TOTAIS', isNum: true}, {key: 'dinheiro', label: 'R$ DINHEIRO', isCurrency: true}, {key: 'credito', label: 'R$ CRÉDITO', isCurrency: true}, {key: 'debito', label: 'R$ DÉBITO', isCurrency: true}, {key: 'pix', label: 'R$ PIX', isCurrency: true}, {key: 'ticket', label: 'R$ TICKET', isCurrency: true}, {key: 'total', label: 'TOTAL MESA', isCurrency: true}] },
    { id: 'hospedes', label: 'HÓSPEDES', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD HÓSP.', isNum: true}, {key: 'valor', label: 'R$ PAG.', isCurrency: true}] },
    { id: 'retirada', label: 'RETIRADA', IconComp: Package,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'ci', label: 'C.I.', IconComp: FileCheck2,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD CI', isNum: true}, {key: 'reajuste', label: 'R$ REAJ.', isCurrency: true}, {key: 'total', label: 'R$ TOTAL CI', isCurrency: true}] },
    { id: 'roomService', label: 'ROOM SERVICE', IconComp: UtensilsCrossed,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'generic', label: 'DIVERSOS', IconComp: HelpCircle,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    // Tabs for Café da Manhã
    { id: 'cdmHospedes', label: 'HÓSPEDES (CAFÉ)', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'listaQtd', label: 'LISTA QTD', isNum: true}, {key: 'listaValor', label: 'LISTA VLR', isCurrency: true}, {key: 'noShowQtd', label: 'NO-SHOW QTD', isNum: true}, {key: 'noShowValor', label: 'NO-SHOW VLR', isCurrency: true}, {key: 'semCheckInQtd', label: 'S/ CHECK-IN QTD', isNum: true}, {key: 'semCheckInValor', label: 'S/ CHECK-IN VLR', isCurrency: true}, {key: 'total', label: 'TOTAL', isCurrency: true}] },
    { id: 'cdmAvulsos', label: 'AVULSOS (CAFÉ)', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'assinadoQtd', label: 'ASSINADO QTD', isNum: true}, {key: 'assinadoValor', label: 'ASSINADO VLR', isCurrency: true}, {key: 'diretoQtd', label: 'DIRETO QTD', isNum: true}, {key: 'diretoValor', label: 'DIRETO VLR', isCurrency: true}, {key: 'total', label: 'TOTAL', isCurrency: true}] },
];

const summaryTableItems = [
    { item: "FATURADOS", dataKey: "faturados" }, { item: "IFOOD", dataKey: "ifood" },
    { item: "RAPPI", dataKey: "rappi" }, { item: "MESA", dataKey: "mesa" },
    { item: "HÓSPEDES", dataKey: "hospedes" }, { item: "RETIRADA", dataKey: "retirada" },
    { item: "ROOM SERVICE", dataKey: "roomService" }, { item: "CONSUMO INTERNO", dataKey: "consumoInterno" },
    { item: "DIVERSOS", dataKey: "generic" },
    // Summary Items for Café da Manhã
    { item: "HÓSPEDES (CAFÉ)", dataKey: "cdmHospedes" },
    { item: "AVULSOS (CAFÉ)", dataKey: "cdmAvulsos" },
];

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const PeriodSpecificReportView: React.FC<PeriodSpecificReportViewProps> = ({ data, periodId }) => {
    const [activeDetailTab, setActiveDetailTab] = useState<string>('');

    const availableTabs = useMemo(() => {
        if (periodId === 'cafeDaManha') {
            return tabDefinitions.filter(tab => 
                (tab.id === 'cdmHospedes' || tab.id === 'cdmAvulsos') && data.dailyBreakdowns[tab.id] && data.dailyBreakdowns[tab.id].length > 0
            );
        }
        return tabDefinitions.filter(tab => 
            !(tab.id === 'cdmHospedes' || tab.id === 'cdmAvulsos') && data.dailyBreakdowns[tab.id] && data.dailyBreakdowns[tab.id].length > 0
        );
    }, [data.dailyBreakdowns, periodId]);

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

    const showCISubtotals = useMemo(() => 
        ['almocoPrimeiroTurno', 'almocoSegundoTurno', 'jantar'].includes(periodId as string),
        [periodId]
    );

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
                                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 mb-4">
                                    {availableTabs.map(tab => (
                                        <TabsTrigger key={tab.id} value={tab.id} className="text-xs px-1"><tab.IconComp className="h-3.5 w-3.5 mr-1 hidden sm:inline"/>{tab.label}</TabsTrigger>
                                    ))}
                                    </TabsList>
                                    {availableTabs.map(tab => {
                                        const breakdownData = data.dailyBreakdowns[tab.id] || [];
                                        return (
                                            <TabsContent key={tab.id} value={tab.id}>
                                                <div className="max-h-[300px] overflow-y-auto">
                                                    <Table>
                                                    <TableHeader><TableRow>{tab.cols.map(col => <TableHead key={col.key} className={cn("text-xs", col.isNum || col.isCurrency ? "text-right" : "")}>{col.label}</TableHead>)}</TableRow></TableHeader>
                                                    <TableBody>
                                                        {breakdownData.map((item: DailyCategoryDataItem, idx: number) => (
                                                        <TableRow key={idx}>
                                                            {tab.cols.map(col => (
                                                            <TableCell key={col.key} className={cn("text-xs py-1.5 px-2", col.isNum || col.isCurrency ? "text-right" : "")}>
                                                                {col.isCurrency ? formatCurrency(Number(item[col.key] || 0)) : (item[col.key] ?? (col.isNum ? '0' : '-'))}
                                                            </TableCell>
                                                            ))}
                                                        </TableRow>
                                                        ))}
                                                        {breakdownData.length === 0 && 
                                                        <TableRow><TableCell colSpan={tab.cols.length} className="text-center text-xs py-3">Nenhum dado para esta categoria.</TableCell></TableRow>}
                                                    </TableBody>
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
                        <Table>
                            <TableHeader><TableRow><TableHead className="text-xs">ITEM</TableHead><TableHead className="text-xs text-right">QTD</TableHead><TableHead className="text-xs text-right">TOTAL</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {summaryTableItems.map(sItem => (
                                (data.summary[sItem.dataKey] && (data.summary[sItem.dataKey].qtd > 0 || data.summary[sItem.dataKey].total > 0 || (sItem.dataKey === 'consumoInterno' && data.summary[sItem.dataKey].reajuste != 0 ))) ?
                                <TableRow key={sItem.dataKey}>
                                <TableCell className="font-medium text-xs py-1.5 px-2">{sItem.item}</TableCell>
                                <TableCell className="text-right text-xs py-1.5 px-2">{(data.summary[sItem.dataKey])?.qtd.toLocaleString('pt-BR') ?? '0'}</TableCell>
                                <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency((data.summary[sItem.dataKey])?.total ?? 0)}</TableCell>
                                </TableRow>
                                : null
                            ))}
                            {showCISubtotals ? (
                                <>
                                    <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL COM CI</TableCell>
                                        <TableCell className="text-right text-xs py-1.5 px-2">{data.subtotalGeralComCI.qtd.toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(data.subtotalGeralComCI.total)}</TableCell>
                                    </TableRow>
                                    <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL SEM CI</TableCell>
                                        <TableCell className="text-right text-xs py-1.5 px-2">{data.subtotalGeralSemCI.qtd.toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(data.subtotalGeralSemCI.total)}</TableCell>
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL</TableCell>
                                    <TableCell className="text-right text-xs py-1.5 px-2">{data.subtotalGeralComCI.qtd.toLocaleString('pt-BR')}</TableCell>
                                    <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(data.subtotalGeralComCI.total)}</TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default PeriodSpecificReportView;
