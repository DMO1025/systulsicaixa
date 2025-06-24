
"use client";

import React, { useState, useMemo, forwardRef } from 'react';
import type { PeriodReportViewData, DailyCategoryDataItem, PeriodId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { SALES_CHANNELS } from '@/lib/constants';
import { 
    ListChecks, Truck, Utensils, Building, Package, FileCheck2, UtensilsCrossed, HelpCircle, BarChartHorizontal
} from "lucide-react";

interface PeriodSpecificReportViewProps {
    data: PeriodReportViewData;
    periodId: PeriodId | 'all';
    chartRef: React.RefObject<HTMLDivElement>;
}

const tabDefinitions = [
    { id: 'faturados', label: 'FATURADOS', IconComp: ListChecks, primaryValueKey: 'total',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD FAT.', isNum: true}, {key: 'hotel', label: 'R$ HOTEL', isCurrency: true}, {key: 'funcionario', label: 'R$ FUNC.', isCurrency: true}, {key: 'total', label: 'TOTAL FAT.', isCurrency: true}] },
    { id: 'ifood', label: 'IFOOD', IconComp: Truck, primaryValueKey: 'valor',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'rappi', label: 'RAPPI', IconComp: Truck, primaryValueKey: 'valor',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'mesa', label: 'MESA', IconComp: Utensils, primaryValueKey: 'total',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD TOTAIS', isNum: true}, {key: 'dinheiro', label: 'R$ DINHEIRO', isCurrency: true}, {key: 'credito', label: 'R$ CRÉDITO', isCurrency: true}, {key: 'debito', label: 'R$ DÉBITO', isCurrency: true}, {key: 'pix', label: 'R$ PIX', isCurrency: true}, {key: 'ticket', label: 'R$ TICKET', isCurrency: true}, {key: 'total', label: 'TOTAL MESA', isCurrency: true}] },
    { id: 'hospedes', label: 'HÓSPEDES', IconComp: Building, primaryValueKey: 'valor',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD HÓSP.', isNum: true}, {key: 'valor', label: 'R$ PAG.', isCurrency: true}] },
    { id: 'retirada', label: 'RETIRADA', IconComp: Package, primaryValueKey: 'valor',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'ci', label: 'C.I.', IconComp: FileCheck2, primaryValueKey: 'total',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD CI', isNum: true}, {key: 'reajuste', label: 'R$ REAJ.', isCurrency: true}, {key: 'total', label: 'R$ TOTAL CI', isCurrency: true}] },
    { id: 'roomService', label: 'ROOM SERVICE', IconComp: UtensilsCrossed, primaryValueKey: 'valor',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'generic', label: 'DIVERSOS', IconComp: HelpCircle, primaryValueKey: 'valor',
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
];

const summaryTableItems = [
    { item: "FATURADOS", dataKey: "faturados" }, { item: "IFOOD", dataKey: "ifood" },
    { item: "RAPPI", dataKey: "rappi" }, { item: "MESA", dataKey: "mesa" },
    { item: "HÓSPEDES", dataKey: "hospedes" }, { item: "RETIRADA", dataKey: "retirada" },
    { item: "ROOM SERVICE", dataKey: "roomService" }, { item: "CONSUMO INTERNO", dataKey: "consumoInterno" },
    { item: "DIVERSOS", dataKey: "generic" },
];

const chartConfig = {
    valor: {
      label: "R$",
      color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const PeriodSpecificReportView: React.FC<PeriodSpecificReportViewProps> = ({ data, periodId, chartRef }) => {
    // All hooks must be called at the top level of the component.
    const [activeDetailTab, setActiveDetailTab] = useState<string>("faturados");
    
    const cafeDaManhaChartData = useMemo(() => {
        if (periodId !== 'cafeDaManha') return [];
        const cdmBreakdown = data.dailyBreakdowns.cafeDaManhaDetails || [];
        return cdmBreakdown.map(row => ({
            day: row.date.substring(0, 2),
            valor: (row.listaHospedesValor || 0) +
                   (row.noShowValor || 0) +
                   (row.semCheckInValor || 0) +
                   (row.cafeAssinadoValor || 0) +
                   (row.diretoCartaoValor || 0),
        })).sort((a, b) => parseInt(a.day, 10) - parseInt(b.day, 10));
    }, [data, periodId]);

    const activeChartData = useMemo(() => {
        if (periodId === 'cafeDaManha') return []; // Don't compute if not needed
        const activeTabDef = tabDefinitions.find(t => t.id === activeDetailTab);
        if (!activeTabDef) return [];

        const breakdownData = data.dailyBreakdowns[activeDetailTab] || [];
        const primaryValueKey = activeTabDef.primaryValueKey;
        
        return breakdownData.map(item => ({
            day: item.date.substring(0, 2),
            valor: item[primaryValueKey] || 0,
        })).sort((a, b) => parseInt(a.day, 10) - parseInt(b.day, 10));
    }, [activeDetailTab, data.dailyBreakdowns, periodId]);

    const activeTabLabel = useMemo(() => {
        if (periodId === 'cafeDaManha') return ''; // Don't compute if not needed
        return tabDefinitions.find(t => t.id === activeDetailTab)?.label || '';
    }, [activeDetailTab, periodId]);

    // Conditional returns are now safe because all hooks are declared above.
    if (periodId === 'cafeDaManha') {
        const { summary, dailyBreakdowns, subtotalGeralComCI } = data;
        const cdmBreakdown = dailyBreakdowns.cafeDaManhaDetails || [];
        
        const summaryItems = [
            { label: SALES_CHANNELS.cdmListaHospedes, data: summary.cdmListaHospedes },
            { label: SALES_CHANNELS.cdmNoShow, data: summary.cdmNoShow },
            { label: SALES_CHANNELS.cdmSemCheckIn, data: summary.cdmSemCheckIn },
            { label: SALES_CHANNELS.cdmCafeAssinado, data: summary.cdmCafeAssinado },
            { label: SALES_CHANNELS.cdmDiretoCartao, data: summary.cdmDiretoCartao },
        ];

        return (
             <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalhamento Diário - Café da Manhã</CardTitle>
                                <CardDescription>Valores e quantidades para cada canal de venda.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Data</TableHead>
                                            <TableHead className="text-right">Lista Hósp. Qtd</TableHead>
                                            <TableHead className="text-right">Lista Hósp. Vlr</TableHead>
                                            <TableHead className="text-right">No Show Qtd</TableHead>
                                            <TableHead className="text-right">No Show Vlr</TableHead>
                                            <TableHead className="text-right">Sem Check-in Qtd</TableHead>
                                            <TableHead className="text-right">Sem Check-in Vlr</TableHead>
                                            <TableHead className="text-right">Assinado Qtd</TableHead>
                                            <TableHead className="text-right">Assinado Vlr</TableHead>
                                            <TableHead className="text-right">Direto Qtd</TableHead>
                                            <TableHead className="text-right">Direto Vlr</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cdmBreakdown.length > 0 ? cdmBreakdown.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{row.date}</TableCell>
                                                <TableCell className="text-right">{row.listaHospedesQtd}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.listaHospedesValor)}</TableCell>
                                                <TableCell className="text-right">{row.noShowQtd}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.noShowValor)}</TableCell>
                                                <TableCell className="text-right">{row.semCheckInQtd}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.semCheckInValor)}</TableCell>
                                                <TableCell className="text-right">{row.cafeAssinadoQtd}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.cafeAssinadoValor)}</TableCell>
                                                <TableCell className="text-right">{row.diretoCartaoQtd}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.diretoCartaoValor)}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-4">Nenhum dado detalhado encontrado.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader><CardTitle>{data.reportTitle}</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ITEM</TableHead>
                                            <TableHead className="text-right">QTD</TableHead>
                                            <TableHead className="text-right">TOTAL</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summaryItems.map(item => (
                                            item.data && (item.data.qtd > 0 || item.data.total > 0) ? (
                                                <TableRow key={item.label}>
                                                    <TableCell className="font-medium text-sm">{item.label}</TableCell>
                                                    <TableCell className="text-right">{item.data.qtd.toLocaleString('pt-BR')}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.data.total)}</TableCell>
                                                </TableRow>
                                            ) : null
                                        ))}
                                        <TableRow className="font-semibold bg-muted/30">
                                            <TableCell>SUBTOTAL GERAL</TableCell>
                                            <TableCell className="text-right">{subtotalGeralComCI.qtd.toLocaleString('pt-BR')}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(subtotalGeralComCI.total)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {cafeDaManhaChartData.length > 0 && (
                    <Card ref={chartRef}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><BarChartHorizontal/> Evolução Diária - {data.reportTitle}</CardTitle>
                            <CardDescription>Gráfico de valores diários totais para o período.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <BarChart accessibilityLayer data={cafeDaManhaChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                    dataKey="day"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => `Dia ${value}`}
                                    />
                                    <YAxis
                                    tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    />
                                    <RechartsTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        labelFormatter={(label) => `Dia ${label}`}
                                        formatter={(value) => formatCurrency(Number(value))}
                                    />}
                                    />
                                    <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // Default view for other periods
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento Diário</CardTitle>
                            <CardDescription>Visualize os dados detalhados por categoria navegando pelas abas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-9 mb-4">
                                {tabDefinitions.map(tab => (
                                    ((data.dailyBreakdowns[tab.id] && data.dailyBreakdowns[tab.id].length > 0) || (tab.id === 'faturados' && data.dailyBreakdowns[tab.id]?.length === 0 && activeDetailTab === 'faturados' )) ?
                                    <TabsTrigger key={tab.id} value={tab.id} className="text-xs px-1"><tab.IconComp className="h-3.5 w-3.5 mr-1 hidden sm:inline"/>{tab.label}</TabsTrigger>
                                    : null
                                ))}
                                </TabsList>
                                {tabDefinitions.map(tab => {
                                    const breakdownData = data.dailyBreakdowns[tab.id] || [];
                                    
                                    return (((breakdownData.length > 0) || (tab.id === 'faturados' && breakdownData.length === 0 && activeDetailTab === 'faturados' ))) ?
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
                                    : null
                                })}
                            </Tabs>
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
                            <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL COM CI</TableCell>
                                <TableCell className="text-right text-xs py-1.5 px-2">{data.subtotalGeralComCI.qtd.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(data.subtotalGeralComCI.total)}</TableCell>
                            </TableRow>
                            <TableRow className="font-semibold bg-muted/30"><TableCell className="text-xs py-1.5 px-2">SUBTOTAL GERAL SEM CI</TableCell>
                                <TableCell className="text-right text-xs py-1.5 px-2">{data.subtotalGeralSemCI.qtd.toLocaleString('pt-BR')}</TableCell>
                                <TableCell className="text-right text-xs py-1.5 px-2">{formatCurrency(data.subtotalGeralSemCI.total)}</TableCell>
                            </TableRow>
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {activeChartData.length > 0 && (
                <Card ref={chartRef}>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><BarChartHorizontal/> Evolução Diária - {activeTabLabel}</CardTitle>
                        <CardDescription>Gráfico de valores diários para a categoria selecionada.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                            <BarChart accessibilityLayer data={activeChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                dataKey="day"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => `Dia ${value}`}
                                />
                                <YAxis
                                tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                />
                                <RechartsTooltip
                                cursor={false}
                                content={<ChartTooltipContent 
                                    labelFormatter={(label) => `Dia ${label}`}
                                    formatter={(value) => formatCurrency(Number(value))}
                                />}
                                />
                                <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default PeriodSpecificReportView;
