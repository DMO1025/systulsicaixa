
"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry, PeriodData, EventosPeriodData, SalesChannelId } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_DEFINITIONS, SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/constants';
import { calculatePeriodGrandTotal } from '@/lib/reportUtils';
import { getSafeNumericValue } from '@/lib/utils';
import { DollarSign, Hash } from 'lucide-react';

interface SingleDayReportViewProps {
  entry: DailyLogEntry;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatNumber = (value: number | undefined) => (value || 0).toLocaleString('pt-BR');

const SingleDayReportView: React.FC<SingleDayReportViewProps> = ({ entry }) => {

    const totals = useMemo(() => {
        let totalComCI = 0;
        let totalQtd = 0;

        PERIOD_DEFINITIONS.forEach(pDef => {
            const periodId = pDef.id;
            const { qtd, valor } = calculatePeriodGrandTotal(entry[periodId] as PeriodData | EventosPeriodData | undefined);
            totalQtd += qtd;
            totalComCI += valor;
        });

        const almocoCIValor = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosTotalCI.vtotal') +
                            getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosTotalCI.vtotal');
        const jantarCIValor = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosTotalCI.vtotal');

        const reajusteCIAlmoco = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosReajusteCI.vtotal') +
                                getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosReajusteCI.vtotal');
        const reajusteCIJantar = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosReajusteCI.vtotal');

        const totalCIValor = almocoCIValor + jantarCIValor;
        const totalReajusteCI = reajusteCIAlmoco + reajusteCIJantar;

        const totalSemCI = totalComCI - totalCIValor - totalReajusteCI;

        return {
            totalComCI,
            totalSemCI,
            totalQtd
        };
    }, [entry]);

    const renderPeriodData = (periodData: PeriodData) => {
        const rows: React.ReactNode[] = [];

        const processChannels = (channels: PeriodData['channels'], prefix = "") => {
            if (!channels) return;
            Object.entries(channels).forEach(([channelId, values]) => {
                if (values && (values.qtd !== undefined && values.qtd !== 0 || values.vtotal !== undefined && values.vtotal !== 0)) {
                    rows.push(
                        <TableRow key={prefix + channelId}>
                            <TableCell className="pl-4 text-xs">{SALES_CHANNELS[channelId as SalesChannelId] || channelId}</TableCell>
                            <TableCell className="text-right text-xs">{values.qtd !== undefined ? formatNumber(values.qtd) : '-'}</TableCell>
                            <TableCell className="text-right text-xs">{values.vtotal !== undefined ? formatCurrency(values.vtotal) : '-'}</TableCell>
                        </TableRow>
                    );
                }
            });
        };

        if (periodData.channels) {
            processChannels(periodData.channels);
        }

        if (periodData.subTabs) {
            Object.entries(periodData.subTabs).forEach(([subTabKey, subTabData]) => {
                if (subTabData && subTabData.channels && Object.values(subTabData.channels).some(ch => (ch?.qtd !== undefined && ch.qtd !== 0) || (ch?.vtotal !== undefined && ch.vtotal !== 0))) {
                    rows.push(
                        <TableRow key={subTabKey} className="bg-muted/50">
                            <TableCell colSpan={3} className="font-semibold text-sm">{subTabKey.toUpperCase()}</TableCell>
                        </TableRow>
                    );
                    processChannels(subTabData.channels, `${subTabKey}-`);
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total (com CI)</CardTitle>
                            <div className="text-2xl font-bold">{formatCurrency(totals.totalComCI)}</div>
                        </div>
                        <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total (sem CI)</CardTitle>
                            <div className="text-2xl font-bold">{formatCurrency(totals.totalSemCI)}</div>
                        </div>
                        <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <div>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens/Transações</CardTitle>
                            <div className="text-2xl font-bold">{formatNumber(totals.totalQtd)}</div>
                        </div>
                        <Hash className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                </Card>
            </div>

            {PERIOD_DEFINITIONS.map(pDef => {
                const periodData = entry[pDef.id];
                
                let hasVisibleContent = false;
                if(periodData && typeof periodData === 'string') {
                    hasVisibleContent = periodData.length > 2; // Not just "{}"
                } else if (periodData) {
                    if (pDef.id === 'eventos') {
                        const evData = periodData as EventosPeriodData;
                        hasVisibleContent = (evData.items?.length > 0) || (!!evData.periodObservations && evData.periodObservations.trim() !== '');
                    } else {
                        const pData = periodData as PeriodData;
                        const hasChannelsData = pData.channels && Object.values(pData.channels).some(v => (v?.qtd !== undefined && v.qtd !== 0) || (v?.vtotal !== undefined && v.vtotal !== 0));
                        const hasSubTabsData = pData.subTabs && Object.values(pData.subTabs).some(st => st?.channels && Object.values(st.channels).some(v => (v?.qtd !== undefined && v.qtd !== 0) || (v?.vtotal !== undefined && v.vtotal !== 0)));
                        const hasObservations = !!pData.periodObservations && pData.periodObservations.trim() !== '';
                        hasVisibleContent = !!(hasChannelsData || hasSubTabsData || hasObservations);
                    }
                }
                
                if (!hasVisibleContent) return null;

                const { valor: periodTotal } = calculatePeriodGrandTotal(periodData as any);

                return (
                    <Card key={pDef.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                                <CardTitle>{pDef.label}</CardTitle>
                                {periodTotal > 0 && (
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm text-muted-foreground">Total do Período</p>
                                        <p className="text-xl font-bold">{formatCurrency(periodTotal)}</p>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6">
                            {pDef.id === 'eventos' 
                                ? renderEventosData(periodData as EventosPeriodData)
                                : renderPeriodData(periodData as PeriodData)}

                            {(periodData && typeof periodData !== 'string' && 'periodObservations' in periodData && periodData.periodObservations) && (
                                <div className="mt-4 pt-3 border-t px-6 sm:px-0">
                                    <h5 className="font-semibold text-sm">Observações:</h5>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{periodData.periodObservations}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
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
