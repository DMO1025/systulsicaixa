

"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry, PeriodData, EventosPeriodData, SalesChannelId } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import { processEntryForTotals } from '@/lib/reportUtils';
import { DollarSign, ReceiptText, ChevronDown } from 'lucide-react';
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

        const processChannels = (subTabData: SubTabData | undefined, subTabKey: string) => {
            if (!subTabData?.channels) return;
            
            const channelEntries = Object.entries(subTabData.channels);
            const qtyRows: React.ReactNode[] = [];
            const vtotalRows: React.ReactNode[] = [];
        
            const addRow = (label: string, qtd?: number, vtotal?: number) => {
                const row = (
                    <TableRow key={`${subTabKey}-${label}`}>
                        <TableCell className="pl-8 text-xs"><StyledLabel text={label} /></TableCell>
                        <TableCell className="text-right text-xs">{qtd !== undefined ? formatNumber(qtd) : '-'}</TableCell>
                        <TableCell className="text-right text-xs">{vtotal !== undefined ? formatCurrency(vtotal) : '-'}</TableCell>
                    </TableRow>
                );
                 if (label.toLowerCase().includes('quantidade') || label.toLowerCase().includes('totais cliente mesa') || label.toLowerCase().includes('total de quartos')) {
                    qtyRows.push(row);
                } else {
                    vtotalRows.push(row);
                }
            };
            
            const consolidatedLabels: { [key: string]: { label: string; findKeys: (keys: string[]) => { qtdKey?: string; valorKey?: string } } } = {
                hospedes: {
                    label: 'Hóspedes Atendidos',
                    findKeys: (keys) => ({
                        qtdKey: keys.find(k => k.toLowerCase().includes('hospedesqtdhospedes')),
                        valorKey: keys.find(k => k.toLowerCase().includes('hospedespagamentohospedes'))
                    })
                },
                ifood: {
                    label: 'iFood',
                    findKeys: (keys) => ({
                        qtdKey: keys.find(k => k.toLowerCase().includes('ifoodqtd')),
                        valorKey: keys.find(k => k.toLowerCase().includes('ifoodvalor'))
                    })
                },
                rappi: {
                    label: 'Rappi',
                    findKeys: (keys) => ({
                        qtdKey: keys.find(k => k.toLowerCase().includes('rappiqtd')),
                        valorKey: keys.find(k => k.toLowerCase().includes('rappivalor'))
                    })
                },
                retirada: {
                    label: 'Retirada',
                    findKeys: (keys) => ({
                        qtdKey: keys.find(k => k.toLowerCase().includes('retiradaqtd')),
                        valorKey: keys.find(k => k.toLowerCase().includes('retiradavalor'))
                    })
                },
            };

            const checkAndAddConsolidated = (baseKey: keyof typeof consolidatedLabels) => {
                const allChannelKeys = Object.keys(subTabData.channels || {});
                const { qtdKey, valorKey } = consolidatedLabels[baseKey].findKeys(allChannelKeys);
                
                if (qtdKey && valorKey) {
                    const qtd = subTabData.channels?.[qtdKey as SalesChannelId]?.qtd;
                    const vtotal = subTabData.channels?.[valorKey as SalesChannelId]?.vtotal;
                    if (qtd || vtotal) {
                         let turnoLabel = "";
                         if (qtdKey.startsWith('apt')) turnoLabel = " (Almoço PT)";
                         if (qtdKey.startsWith('ast')) turnoLabel = " (Almoço ST)";
                         if (qtdKey.startsWith('jnt')) turnoLabel = " (Jantar)";
                        addRow(`${consolidatedLabels[baseKey].label}${turnoLabel}`, qtd, vtotal);
                        // Mark as processed by removing from entries
                        delete subTabData.channels?.[qtdKey as SalesChannelId];
                        delete subTabData.channels?.[valorKey as SalesChannelId];
                    }
                }
            };
            
            checkAndAddConsolidated('hospedes');
            checkAndAddConsolidated('ifood');
            checkAndAddConsolidated('rappi');
            checkAndAddConsolidated('retirada');
            
            Object.entries(subTabData.channels).forEach(([channelId, values]) => {
                if (values && (values.qtd !== undefined || values.vtotal !== undefined)) {
                    addRow(SALES_CHANNELS[channelId as SalesChannelId] || channelId, values.qtd, values.vtotal);
                }
            });

            if (qtyRows.length > 0 || vtotalRows.length > 0) {
                 rows.push(
                    <TableRow key={subTabKey} className="bg-muted/50">
                        <TableCell colSpan={3} className="font-semibold text-sm pl-4 uppercase">{subTabKey}</TableCell>
                    </TableRow>
                );
                rows.push(...qtyRows, ...vtotalRows);
            }
        };

        if (periodData.channels) {
            const channelRows = Object.entries(periodData.channels).map(([channelId, values]) => (
                <TableRow key={channelId}>
                    <TableCell className="pl-4 text-xs"><StyledLabel text={SALES_CHANNELS[channelId as SalesChannelId] || channelId} /></TableCell>
                    <TableCell className="text-right text-xs">{values?.qtd !== undefined ? formatNumber(values.qtd) : '-'}</TableCell>
                    <TableCell className="text-right text-xs">{values?.vtotal !== undefined ? formatCurrency(values.vtotal) : '-'}</TableCell>
                </TableRow>
            ));
            rows.push(...channelRows);
        }

        if (periodData.subTabs) {
            const processFaturadoECI = (subTabData: any, subTabKey: string, label: string) => {
                 const items: {key: string, label: string, type: 'qtd'|'vtotal'}[] = [];
                if (label === 'FATURADO') {
                    items.push({key: 'FaturadosQtd', label: 'FATURADOS (QTD)', type: 'qtd'}, {key: 'ValorHotel', label: 'VALOR HOTEL (FATURADO)', type: 'vtotal'}, {key: 'ValorFuncionario', label: 'VALOR FUNCIONÁRIO (FATURADO)', type: 'vtotal'});
                } else if (label === 'CONSUMO INTERNO') {
                    items.push({key: 'ConsumoInternoQtd', label: '* CONSUMO INTERNO - CI (QTD)', type: 'qtd'}, {key: 'ReajusteCI', label: 'REAJUSTE DE C.I', type: 'vtotal'}, {key: 'TotalCI', label: 'TOTAL C.I', type: 'vtotal'});
                } else if (label === 'FRIGOBAR') {
                    if (subTabKey.includes('PT')) { items.push({key: 'frgPTTotalQuartos', label: 'TOTAL DE QUARTOS (1º Turno)', type: 'qtd'}, {key: 'frgPTPagRestaurante', label: 'PAGAMENTO RESTAURANTE (1º Turno)', type: 'vtotal'}, {key: 'frgPTPagHotel', label: 'PAGAMENTO HOTEL (1º Turno)', type: 'vtotal'}); }
                    if (subTabKey.includes('ST')) { items.push({key: 'frgSTTotalQuartos', label: 'TOTAL DE QUARTOS (2º Turno)', type: 'qtd'}, {key: 'frgSTPagRestaurante', label: 'PAGAMENTO RESTAURANTE (2º Turno)', type: 'vtotal'}, {key: 'frgSTPagHotel', label: 'PAGAMENTO HOTEL (2º Turno)', type: 'vtotal'}); }
                    if (subTabKey.includes('JNT')) { items.push({key: 'frgJNTTotalQuartos', label: 'TOTAL DE QUARTOS (Jantar)', type: 'qtd'}, {key: 'frgJNTPagRestaurante', label: 'PAGAMENTO RESTAURANTE (Jantar)', type: 'vtotal'}, {key: 'frgJNTPagHotel', label: 'PAGAMENTO HOTEL (Jantar)', type: 'vtotal'}); }
                }

                const sectionRows: React.ReactNode[] = [];
                items.forEach(item => {
                    const channelKey = Object.keys(subTabData.channels).find(k => k.toLowerCase().includes(item.key.toLowerCase()));
                    if (channelKey) {
                        const values = subTabData.channels[channelKey as SalesChannelId];
                        sectionRows.push(
                             <TableRow key={`${subTabKey}-${item.key}`}>
                                <TableCell className="pl-8 text-xs"><StyledLabel text={item.label} /></TableCell>
                                <TableCell className="text-right text-xs">{item.type === 'qtd' ? formatNumber(values?.qtd) : '-'}</TableCell>
                                <TableCell className="text-right text-xs">{item.type === 'vtotal' ? formatCurrency(values?.vtotal) : '-'}</TableCell>
                            </TableRow>
                        );
                    }
                });

                if (sectionRows.length > 0) {
                    rows.push(<TableRow key={`${subTabKey}-header`} className="bg-muted/50"><TableCell colSpan={3} className="font-semibold text-sm pl-4 uppercase">{label}</TableCell></TableRow>, ...sectionRows);
                }
            };
            
            const allSubTabsForProcessing = {...periodData.subTabs };
            
            const orderedSubTabs = ['roomService', 'hospedes', 'clienteMesa', 'delivery'];
            orderedSubTabs.forEach(subTabKey => {
                if (allSubTabsForProcessing[subTabKey]) {
                    processChannels(allSubTabsForProcessing[subTabKey], subTabKey);
                    delete allSubTabsForProcessing[subTabKey];
                }
            });

            if (allSubTabsForProcessing.ciEFaturados) {
                processFaturadoECI(allSubTabsForProcessing.ciEFaturados, 'ciEFaturados', 'FATURADO');
                processFaturadoECI(allSubTabsForProcessing.ciEFaturados, 'ciEFaturados', 'CONSUMO INTERNO');
                delete allSubTabsForProcessing.ciEFaturados;
            }
             if (allSubTabsForProcessing.frigobar) {
                let shiftKey = '';
                if(Object.keys(allSubTabsForProcessing.frigobar.channels ?? {}).some(k => k.startsWith('frgPT'))) shiftKey = 'PT';
                else if(Object.keys(allSubTabsForProcessing.frigobar.channels ?? {}).some(k => k.startsWith('frgST'))) shiftKey = 'ST';
                else if(Object.keys(allSubTabsForProcessing.frigobar.channels ?? {}).some(k => k.startsWith('frgJNT'))) shiftKey = 'JNT';
                processFaturadoECI(allSubTabsForProcessing.frigobar, `frigobar${shiftKey}`, 'FRIGOBAR');
                delete allSubTabsForProcessing.frigobar;
            }

            Object.entries(allSubTabsForProcessing).forEach(([subTabKey, subTabData]) => {
                if (subTabData) processChannels(subTabData, subTabKey);
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
