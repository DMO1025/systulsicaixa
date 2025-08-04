

"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry, PeriodData, EventosPeriodData, SalesChannelId } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import { processEntryForTotals } from '@/lib/utils/calculations';
import { DollarSign, ReceiptText, ChevronDown, PlusCircle, Edit } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';

interface SingleDayReportViewProps {
  entry: DailyLogEntry;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatNumber = (value: number | undefined) => (value || 0).toLocaleString('pt-BR');


const StyledLabel = ({ text }: { text: string }) => {
    const parentheticalMatch = text.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (parentheticalMatch) {
        const mainText = parentheticalMatch[1].trim();
        const subText = parentheticalMatch[2].trim();
        return (
            <>
                <span className="uppercase">{mainText}</span>
                <span className="block text-xs italic text-muted-foreground mt-0.5">
                    ({subText})
                </span>
            </>
        );
    }
    return <span className="uppercase">{text}</span>;
};


const SingleDayReportView: React.FC<SingleDayReportViewProps> = ({ entry }) => {

    const totals = useMemo(() => {
        const processed = processEntryForTotals(entry);
        const ticketMedio = processed.grandTotal.semCI.qtd > 0 
            ? processed.grandTotal.semCI.valor / processed.grandTotal.semCI.qtd 
            : 0;

        return {
            totalComCI: processed.grandTotal.comCI.valor,
            totalSemCI: processed.grandTotal.semCI.valor,
            totalQtd: processed.grandTotal.comCI.qtd,
            totalSemCIQtd: processed.grandTotal.semCI.qtd,
            ticketMedio,
        };
    }, [entry]);

    const renderPeriodData = (periodData: PeriodData) => {
        const rows: React.ReactNode[] = [];

        const processChannels = (subTabData: any | undefined, subTabKey: string) => {
            if (!subTabData?.channels) return;
            
            Object.entries(subTabData.channels).forEach(([channelId, values]) => {
                if (values && (values.qtd !== undefined || values.vtotal !== undefined)) {
                    rows.push(
                        <TableRow key={`${subTabKey}-${channelId}`}>
                            <TableCell className="pl-8 text-xs"><StyledLabel text={SALES_CHANNELS[channelId as SalesChannelId] || channelId} /></TableCell>
                            <TableCell className="text-right text-xs">{values.qtd !== undefined ? formatNumber(values.qtd) : '-'}</TableCell>
                            <TableCell className="text-right text-xs">{values.vtotal !== undefined ? formatCurrency(values.vtotal) : '-'}</TableCell>
                        </TableRow>
                    );
                }
            });
        };
        
        const processNewItems = (items: any[] | undefined, label: string) => {
            if (items && items.length > 0) {
                rows.push(
                    <TableRow key={`${label}-header`} className="bg-muted/50">
                        <TableCell colSpan={3} className="font-semibold text-sm pl-4 uppercase">{label}</TableCell>
                    </TableRow>
                );
                items.forEach((item, index) => {
                    rows.push(
                        <TableRow key={`${label}-${item.id || index}`}>
                            <TableCell className="pl-8 text-xs">{item.clientName} <span className="text-muted-foreground text-xs italic">{item.observation || ''}</span></TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(item.quantity)}</TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(item.value)}</TableCell>
                        </TableRow>
                    );
                });
            }
        };

        if (periodData.channels) {
            Object.entries(periodData.channels).forEach(([channelId, values]) => {
                if (values && (values.qtd !== undefined || values.vtotal !== undefined)) {
                    rows.push(
                        <TableRow key={channelId}>
                            <TableCell className="pl-4 text-xs"><StyledLabel text={SALES_CHANNELS[channelId as SalesChannelId] || channelId} /></TableCell>
                            <TableCell className="text-right text-xs">{values.qtd !== undefined ? formatNumber(values.qtd) : '-'}</TableCell>
                            <TableCell className="text-right text-xs">{values.vtotal !== undefined ? formatCurrency(values.vtotal) : '-'}</TableCell>
                        </TableRow>
                    );
                }
            });
        }

        if (periodData.subTabs) {
            Object.entries(periodData.subTabs).forEach(([subTabKey, subTabData]) => {
                const subTabHasChannels = subTabData?.channels && Object.keys(subTabData.channels).length > 0;
                const subTabHasFaturado = subTabData?.faturadoItems && subTabData.faturadoItems.length > 0;
                const subTabHasConsumo = subTabData?.consumoInternoItems && subTabData.consumoInternoItems.length > 0;

                if (subTabHasChannels || subTabHasFaturado || subTabHasConsumo) {
                     rows.push(
                        <TableRow key={subTabKey} className="bg-muted/50">
                            <TableCell colSpan={3} className="font-semibold text-sm pl-4 uppercase">{subTabKey}</TableCell>
                        </TableRow>
                    );
                    if(subTabHasChannels) processChannels(subTabData, subTabKey);
                    if(subTabHasFaturado) processNewItems(subTabData.faturadoItems, 'Faturado');
                    if(subTabHasConsumo) processNewItems(subTabData.consumoInternoItems, 'Consumo Interno');
                }
            });
        }
        
        if (rows.length === 0) {
             return <p className="text-muted-foreground px-4 pb-4 text-sm">Nenhum lançamento neste período.</p>;
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>{rows}</TableBody>
            </Table>
        );
    };

    const renderEventosData = (eventosData: EventosPeriodData) => {
        if (!eventosData.items || eventosData.items.length === 0) {
            return <p className="text-muted-foreground px-4 pb-4 text-sm">Nenhum evento lançado neste dia.</p>;
        }

        return (
            <div className="space-y-4">
                {eventosData.items.map((eventItem, index) => (
                    <div key={eventItem.id || index} className="border rounded-md p-3">
                         <h4 className="font-semibold mb-2">{eventItem.eventName || `Evento #${index + 1}`}</h4>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Serviço</TableHead>
                                    <TableHead>Local</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {eventItem.subEvents.map((sub, subIndex) => {
                                    const serviceLabel = sub.serviceType === 'OUTRO' 
                                        ? sub.customServiceDescription || 'Outro' 
                                        : EVENT_SERVICE_TYPE_OPTIONS.find(opt => opt.value === sub.serviceType)?.label || sub.serviceType;
                                    
                                    const locationLabel = EVENT_LOCATION_OPTIONS.find(opt => opt.value === sub.location)?.label || sub.location;

                                    return (
                                        <TableRow key={sub.id || subIndex}>
                                            <TableCell className="text-xs">{serviceLabel}</TableCell>
                                            <TableCell className="text-xs">{locationLabel}</TableCell>
                                            <TableCell className="text-right text-xs">{formatNumber(sub.quantity)}</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(sub.totalValue)}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                         </Table>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total (com CI)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.totalComCI)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatNumber(totals.totalQtd)} Itens
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Líquida (sem CI)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.totalSemCI)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatNumber(totals.totalSemCIQtd)} Itens
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Médio (sem CI)</CardTitle>
                        <ReceiptText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.ticketMedio)}</div>
                         <p className="text-xs text-muted-foreground">
                            Valor médio por item
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            <Accordion type="multiple" className="w-full space-y-4">
            {PERIOD_DEFINITIONS.map(pDef => {
                const periodData = entry[pDef.id];
                
                let hasVisibleContent = false;
                if(periodData && typeof periodData === 'string') {
                    try {
                        const parsedData = JSON.parse(periodData);
                        if (Object.keys(parsedData).length > 0) hasVisibleContent = true;
                    } catch(e) { hasVisibleContent = false; }
                } else if (periodData) {
                    if (pDef.id === 'eventos') {
                        const evData = periodData as EventosPeriodData;
                        hasVisibleContent = (evData.items?.length > 0) || (!!evData.periodObservations && evData.periodObservations.trim() !== '');
                    } else {
                        const pData = periodData as PeriodData;
                        const hasChannelsData = pData.channels && Object.values(pData.channels).some(v => (v?.qtd !== undefined && v.qtd !== 0) || (v?.vtotal !== undefined && v.vtotal !== 0));
                        const hasSubTabsData = pData.subTabs && Object.values(pData.subTabs).some(st => st?.channels && Object.values(st.channels).some(v => (v?.qtd !== undefined && v.qtd !== 0) || (v?.vtotal !== undefined && v.vtotal !== 0)));
                        hasVisibleContent = !!(hasChannelsData || hasSubTabsData);
                    }
                }
                
                if (!hasVisibleContent) return null;

                const periodTotals = processEntryForTotals(entry);
                const periodTotal = (periodTotals as any)[pDef.id]?.valor || 0;
                const periodQtd = (periodTotals as any)[pDef.id]?.qtd || 0;

                return (
                    <Card key={pDef.id}>
                        <AccordionItem value={pDef.id} className="border-b-0">
                            <AccordionTrigger asChild>
                                <Button variant="ghost" className="w-full p-4 h-auto justify-between hover:bg-muted/50">
                                    <div className="flex items-center gap-4 text-left">
                                        <pDef.icon className="h-6 w-6 text-primary" />
                                        <span className="text-lg font-semibold">{pDef.label}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(periodTotal)}</p>
                                            <p className="text-xs text-muted-foreground">{formatNumber(periodQtd)} itens</p>
                                        </div>
                                        <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200" />
                                    </div>
                                </Button>
                            </AccordionTrigger>
                            <AccordionContent>
                                <CardContent className="px-4 pt-0 pb-4">
                                    {pDef.id === 'eventos' 
                                        ? renderEventosData(periodData as EventosPeriodData)
                                        : renderPeriodData(periodData as PeriodData)}
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                    </Card>
                );
            })}
            </Accordion>

             {entry.generalObservations && (
                <Card>
                    <CardHeader>
                        <CardTitle>Observações Gerais do Dia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.generalObservations}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SingleDayReportView;
