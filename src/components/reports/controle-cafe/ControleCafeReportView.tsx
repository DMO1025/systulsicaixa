

"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry, CafeManhaNoShowItem, ControleCafeItem, ChannelUnitPricesConfig } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format, parseISO, getDate, getMonth, getYear, lastDayOfMonth, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ControleCafeReportViewProps {
  entries: DailyLogEntry[];
  type: 'no-show' | 'controle';
  unitPrices: ChannelUnitPricesConfig;
}

const ControleCafeReportView: React.FC<ControleCafeReportViewProps> = ({ entries, type, unitPrices }) => {

    const formatCurrency = (value?: number) => {
        return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

    const consolidatedEntries = useMemo(() => {
      const entryMap = new Map<string, DailyLogEntry>();
      for (const entry of entries) {
        if(entry.id) {
          entryMap.set(entry.id, entry);
        }
      }
      return Array.from(entryMap.values()).sort((a,b) => a.id.localeCompare(b.id));
    }, [entries]);


    const dezenas = useMemo(() => {
        if (consolidatedEntries.length === 0) {
            return [];
        }
        
        const mesSelecionado = getMonth(parseISO(String(consolidatedEntries[0].id)));
        const anoSelecionado = getYear(parseISO(String(consolidatedEntries[0].id)));
        const proximoMes = addMonths(new Date(anoSelecionado, mesSelecionado, 1), 1);
        const mesDoProximoMes = getMonth(proximoMes);
        const anoDoProximoMes = getYear(proximoMes);
        
        const isNoShowReport = type === 'no-show';

        const primeiraDezenaEntries = consolidatedEntries.filter(e => {
            const dataLancamento = parseISO(String(e.id));
            const dia = getDate(dataLancamento);
            return isNoShowReport ? (dia >= 1 && dia <= 10) : (dia >= 2 && dia <= 11);
        });

        const segundaDezenaEntries = consolidatedEntries.filter(e => {
            const dataLancamento = parseISO(String(e.id));
            const dia = getDate(dataLancamento);
             return isNoShowReport ? (dia >= 11 && dia <= 20) : (dia >= 12 && dia <= 21);
        });

        const terceiraDezenaEntries = consolidatedEntries.filter(e => {
            const dataLancamento = parseISO(String(e.id));
            const mesLancamento = getMonth(dataLancamento);
            const anoLancamento = getYear(dataLancamento);
            const dia = getDate(dataLancamento);

            if (isNoShowReport) {
                return dia >= 21;
            }

            if (mesLancamento === mesSelecionado && anoLancamento === anoSelecionado && dia >= 22) {
                return true;
            }
            if (mesLancamento === mesDoProximoMes && anoLancamento === anoDoProximoMes && dia === 1) {
                return true;
            }
            return false;
        });

        return [
            { label: '1ª Dezena', entries: primeiraDezenaEntries },
            { label: '2ª Dezena', entries: segundaDezenaEntries },
            { label: '3ª Dezena', entries: terceiraDezenaEntries },
        ];
    }, [consolidatedEntries, type]);
    
    const cafeNoShowPrice = unitPrices?.cdmNoShow || 0;
    const cafePrice = unitPrices?.cdmListaHospedes || 0;

    const getControleCafeItems = (entries: DailyLogEntry[], type: 'no-show' | 'controle'): (CafeManhaNoShowItem & { entryDate: string })[] | (Partial<ControleCafeItem> & { entryDate: string })[] => {
        if (type === 'no-show') {
          const items: (CafeManhaNoShowItem & { entryDate: string })[] = [];
          entries.forEach(entry => {
              const noShowData = entry.cafeManhaNoShow as any;
              if (noShowData?.items && Array.isArray(noShowData.items)) {
                  noShowData.items.forEach((item: CafeManhaNoShowItem) => {
                      items.push({
                          ...item,
                          entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                      });
                  });
              }
          });
          return items.sort((a, b) => {
            const dateA = a.data ? parseISO(String(a.data)) : new Date(0);
            const dateB = b.data ? parseISO(String(b.data)) : new Date(0);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA.getTime() - dateB.getTime();
            }
            return (a.horario || "").localeCompare(b.horario || "");
          });
        } else {
            const items: (Partial<ControleCafeItem> & { entryDate: string })[] = [];
            entries.forEach(entry => {
                const controleData = entry.controleCafeDaManha as any;
                if (controleData) {
                    items.push({
                        ...controleData,
                        entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                    });
                }
            });
            return items.sort((a,b) => a.entryDate.localeCompare(b.entryDate));
        }
    };


    if (type === 'no-show') {
       return (
            <div className="space-y-6">
                {dezenas.map(dezena => {
                    const allItems = getControleCafeItems(dezena.entries, 'no-show') as (CafeManhaNoShowItem & { entryDate: string })[];

                    if (allItems.length === 0) return null;
                    
                    const totalValor = allItems.reduce((sum, item) => sum + (item.valor || 0), 0);

                    return (
                        <Card key={dezena.label}>
                            <CardHeader><CardTitle>{dezena.label}</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Hóspede</TableHead><TableHead>UH</TableHead><TableHead>Reserva</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {allItems.map((item, index) => (
                                            <TableRow key={item.id || index}><TableCell className="text-xs">{item.entryDate}</TableCell><TableCell className="text-xs">{item.horario || '-'}</TableCell><TableCell className="font-medium text-xs">{item.hospede || '-'}</TableCell><TableCell className="text-xs">{item.uh || '-'}</TableCell><TableCell className="text-xs">{item.reserva || '-'}</TableCell><TableCell className="text-right text-xs">{formatCurrency(item.valor)}</TableCell><TableCell className="text-xs text-muted-foreground">{item.observation || '-'}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter><TableRow className="font-bold"><TableCell colSpan={5}>TOTAL ({dezena.label})</TableCell><TableCell className="text-right">{formatCurrency(totalValor)}</TableCell><TableCell></TableCell></TableRow></TableFooter>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    }

    if (type === 'controle') {
        return (
            <div className="space-y-6">
                {dezenas.map(dezena => {
                    const allItems = getControleCafeItems(dezena.entries, 'controle') as (Partial<ControleCafeItem> & { entryDate: string })[];

                    if (allItems.length === 0) return null;
                    
                    const totals = allItems.reduce((acc, item) => {
                        acc.adultoQtd += item.adultoQtd || 0;
                        acc.crianca01Qtd += item.crianca01Qtd || 0;
                        acc.crianca02Qtd += item.crianca02Qtd || 0;
                        acc.contagemManual += item.contagemManual || 0;
                        acc.semCheckIn += item.semCheckIn || 0;
                        return acc;
                    }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });

                    const grandTotalPessoas = totals.adultoQtd + totals.crianca01Qtd + totals.crianca02Qtd + totals.contagemManual + totals.semCheckIn;

                    return (
                        <Card key={dezena.label}>
                            <CardHeader><CardTitle>{dezena.label}</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Adultos</TableHead><TableHead className="text-right">Criança 01</TableHead><TableHead className="text-right">Criança 02</TableHead><TableHead className="text-right">Cont. Manual</TableHead><TableHead className="text-right">Sem Check-in</TableHead><TableHead className="text-right font-bold">Total Dia</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {allItems.map((item, index) => {
                                            const totalDia = (item.adultoQtd ?? 0) + (item.crianca01Qtd ?? 0) + (item.crianca02Qtd ?? 0) + (item.contagemManual ?? 0) + (item.semCheckIn ?? 0);
                                            return (<TableRow key={index}><TableCell className="text-xs">{item.entryDate}</TableCell><TableCell className="text-right text-xs">{item.adultoQtd ?? '-'}</TableCell><TableCell className="text-right text-xs">{item.crianca01Qtd ?? '-'}</TableCell><TableCell className="text-right text-xs">{item.crianca02Qtd ?? '-'}</TableCell><TableCell className="text-right text-xs">{item.contagemManual ?? '-'}</TableCell><TableCell className="text-right text-xs">{item.semCheckIn ?? '-'}</TableCell><TableCell className="text-right text-xs font-bold">{totalDia}</TableCell></TableRow>)
                                        })}
                                    </TableBody>
                                    <TableFooter><TableRow className="font-bold"><TableCell>TOTAL ({dezena.label})</TableCell><TableCell className="text-right">{totals.adultoQtd}</TableCell><TableCell className="text-right">{totals.crianca01Qtd}</TableCell><TableCell className="text-right">{totals.crianca02Qtd}</TableCell><TableCell className="text-right">{totals.contagemManual}</TableCell><TableCell className="text-right">{totals.semCheckIn}</TableCell><TableCell className="text-right">{grandTotalPessoas}</TableCell></TableRow></TableFooter>
                                </Table>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    }

    return null;
};

export default ControleCafeReportView;
