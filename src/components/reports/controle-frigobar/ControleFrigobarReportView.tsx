
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import type { DailyLogEntry, FrigobarConsumptionLog, FrigobarItem } from '@/lib/types';
import { getSetting } from '@/services/settingsService';
import { Users, DollarSign, Briefcase, ShoppingCart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportExportData } from '@/lib/utils/reports/types';


const formatCurrency = (value?: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value?: number) => Number(value || 0).toLocaleString('pt-BR');


const ControleFrigobarReportView: React.FC<{ entries: DailyLogEntry[], onDataCalculated: (data: ReportExportData) => void }> = ({ entries, onDataCalculated }) => {
  const [frigobarItems, setFrigobarItems] = useState<FrigobarItem[]>([]);

  useEffect(() => {
    async function fetchItems() {
      const items = await getSetting('frigobarItems');
      if (Array.isArray(items)) {
        setFrigobarItems(items.sort((a,b) => a.name.localeCompare(b.name)));
      }
    }
    fetchItems();
  }, []);

  const { allLogs, totals, checkouts, itemsSummary } = useMemo(() => {
    const logs: (FrigobarConsumptionLog & { entryDate: string })[] = [];
    const dailyData: Record<string, { previstos?: number, prorrogados?: number }> = {};
    
    entries.forEach(entry => {
      const frigobarData = entry.controleFrigobar as any;
      if (frigobarData?.logs && Array.isArray(frigobarData.logs)) {
        frigobarData.logs.forEach((log: FrigobarConsumptionLog) => {
          logs.push({
            ...log,
            entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
          });
        });
      }
      if (frigobarData) {
          dailyData[entry.id as string] = {
              previstos: frigobarData.checkoutsPrevistos,
              prorrogados: frigobarData.checkoutsProrrogados,
          };
      }
    });

    const sortedLogs = logs.sort((a, b) => {
      const uhA = parseInt(a.uh, 10);
      const uhB = parseInt(b.uh, 10);

      if (!isNaN(uhA) && !isNaN(uhB)) {
        if (uhA !== uhB) {
          return uhA - uhB;
        }
      }
      
      const uhCompare = a.uh.localeCompare(b.uh, undefined, {numeric: true});
      if (uhCompare !== 0) {
        return uhCompare;
      }
      
      return parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime();
    });


    const calculatedCheckouts = {
        previstos: Object.values(dailyData).reduce((sum, day) => sum + (day.previstos || 0), 0),
        prorrogados: Object.values(dailyData).reduce((sum, day) => sum + (day.prorrogados || 0), 0),
        antecipados: sortedLogs.filter(log => log.isAntecipado).length,
    };

    const calculatedTotals = sortedLogs.reduce((acc, log) => {
        acc.consumo += log.totalValue || 0;
        acc.recebido += log.valorRecebido || 0;
        return acc;
    }, { consumo: 0, recebido: 0 });

    const calculatedItemsSummaryMap = sortedLogs.reduce((acc, log) => {
        Object.entries(log.items).forEach(([itemId, quantity]) => {
            const itemInfo = frigobarItems.find(i => i.id === itemId);
            if (itemInfo) {
                if (!acc[itemId]) {
                    acc[itemId] = { name: itemInfo.name, qtd: 0, valor: 0 };
                }
                acc[itemId].qtd += quantity;
                acc[itemId].valor += quantity * itemInfo.price;
            }
        });
        return acc;
    }, {} as Record<string, { name: string; qtd: number; valor: number }>);
    const sortedItemsSummary = Object.values(calculatedItemsSummaryMap).sort((a,b) => a.name.localeCompare(b.name));

    const totalItems = sortedItemsSummary.reduce((sum, item) => sum + item.qtd, 0);
    const totalUhsAtendidas = new Set(sortedLogs.map(log => log.uh)).size;
    
    return { 
        allLogs: sortedLogs, 
        totals: {
            ...calculatedTotals,
            diferenca: calculatedTotals.recebido - calculatedTotals.consumo,
            totalItems,
            totalUhsAtendidas,
        },
        checkouts: calculatedCheckouts,
        itemsSummary: sortedItemsSummary,
    };
  }, [entries, frigobarItems]);
  
  useEffect(() => {
    onDataCalculated({
        summary: {
            checkouts,
            financeiro: totals,
            itemsSummary,
        },
        details: {
            allLogs,
        }
    });
  }, [allLogs, totals, checkouts, itemsSummary, onDataCalculated]);

  const totalItemsQtd = itemsSummary.reduce((acc, item) => acc + item.qtd, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatório de Controle de Frigobar</CardTitle>
            <CardDescription>
              Consumo de frigobar registrado no período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>UH</TableHead>
                  <TableHead>Itens Consumidos</TableHead>
                  <TableHead className="text-right">Valor Consumo</TableHead>
                  <TableHead className="text-right">Valor Recebido</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLogs.length > 0 ? allLogs.map((log) => (
                  <TableRow key={log.id} className={cn(log.isAntecipado && "bg-blue-50 dark:bg-blue-950/50")}>
                    <TableCell className="text-xs font-medium">{log.entryDate}</TableCell>
                    <TableCell className="text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        {log.isAntecipado && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                        {log.uh}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                       <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {Object.entries(log.items).map(([itemId, quantity]) => {
                            const itemDetails = frigobarItems.find(i => i.id === itemId);
                            return (
                              <span key={itemId} className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {itemDetails?.name || 'Item'}: <span className="font-bold text-foreground">{String(quantity)}</span>
                              </span>
                            );
                          })}
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(log.totalValue)}</TableCell>
                    <TableCell className="text-right text-xs text-green-600">{formatCurrency(log.valorRecebido)}</TableCell>
                    <TableCell className={`text-right text-xs font-bold ${(log.valorRecebido || 0) - log.totalValue < 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {formatCurrency((log.valorRecebido || 0) - log.totalValue)}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum registro de controle de frigobar encontrado no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
               {allLogs.length > 0 && (
                  <TableFooter>
                      <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={3}>TOTAIS</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.consumo)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.recebido)}</TableCell>
                          <TableCell className={`text-right font-extrabold ${totals.diferenca < 0 ? 'text-destructive' : 'text-green-600'}`}>
                              {formatCurrency(totals.diferenca)}
                          </TableCell>
                      </TableRow>
                  </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <Card>
                <Table>
                    <TableHeader><TableRow><TableHead className="font-semibold">Resumo Financeiro</TableHead><TableHead className="text-right font-semibold">Valor</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow><TableCell className="text-sm">Total de Quartos Atendidos</TableCell><TableCell className="text-right text-sm font-semibold">{formatQty(totals.totalUhsAtendidas)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-sm">Total de Itens Vendidos</TableCell><TableCell className="text-right text-sm font-semibold">{formatQty(totals.totalItems)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-sm">Total Consumido (R$)</TableCell><TableCell className="text-right text-sm font-semibold">{formatCurrency(totals.consumo)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-sm">Total Recebido (R$)</TableCell><TableCell className="text-right text-sm font-semibold">{formatCurrency(totals.recebido)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-sm font-bold">Diferença Total (R$)</TableCell><TableCell className={`text-right text-sm font-bold ${totals.diferenca < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(totals.diferenca)}</TableCell></TableRow>
                    </TableBody>
                </Table>
            </Card>
            <Card>
                <Table>
                    <TableHeader><TableRow><TableHead className="font-semibold">Resumo Check-outs</TableHead><TableHead className="text-right font-semibold">Quantidade</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow><TableCell className="text-sm">Check-outs Previstos</TableCell><TableCell className="text-right text-sm font-semibold">{formatQty(checkouts.previstos)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-sm">Check-outs Prorrogados</TableCell><TableCell className="text-right text-sm font-semibold">{formatQty(checkouts.prorrogados)}</TableCell></TableRow>
                        <TableRow><TableCell className="text-sm">Check-outs Antecipados</TableCell><TableCell className="text-right text-sm font-semibold">{formatQty(checkouts.antecipados)}</TableCell></TableRow>
                    </TableBody>
                </Table>
            </Card>
        </div>

        {itemsSummary.length > 0 && (
           <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Resumo de Itens</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsSummary.map(item => (
                          <TableRow key={item.name}>
                              <TableCell className="font-medium text-xs">{item.name}</TableCell>
                              <TableCell className="text-right text-xs">{item.qtd}</TableCell>
                              <TableCell className="text-right text-xs">{formatCurrency(item.valor)}</TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                       <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">{totalItemsQtd}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.consumo)}</TableCell>
                      </TableRow>
                    </TableFooter>
                 </Table>
              </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ControleFrigobarReportView;
