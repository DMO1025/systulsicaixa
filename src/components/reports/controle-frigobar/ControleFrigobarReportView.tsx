
"use client";

import React, { useMemo, useState } from 'react';
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

const formatCurrency = (value?: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ControleFrigobarReportView: React.FC<{ entries: DailyLogEntry[] }> = ({ entries }) => {
  const [frigobarItems, setFrigobarItems] = useState<FrigobarItem[]>([]);

  React.useEffect(() => {
    async function fetchItems() {
      const items = await getSetting('frigobarItems');
      if (Array.isArray(items)) {
        setFrigobarItems(items);
      }
    }
    fetchItems();
  }, []);

  const allLogs = useMemo(() => {
    const logs: (FrigobarConsumptionLog & { entryDate: string })[] = [];
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
    });
    return logs.sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());
  }, [entries]);

  const { totals, checkouts } = useMemo(() => {
    const dailyData: Record<string, { previstos?: number, prorrogados?: number }> = {};
    entries.forEach(entry => {
        const frigobarData = entry.controleFrigobar as any;
        if(frigobarData) {
            dailyData[entry.id as string] = {
                previstos: frigobarData.checkoutsPrevistos,
                prorrogados: frigobarData.checkoutsProrrogados,
            };
        }
    });

    return {
        totals: allLogs.reduce((acc, log) => {
            acc.totalConsumo += log.totalValue || 0;
            acc.totalRecebido += log.valorRecebido || 0;
            return acc;
        }, { totalConsumo: 0, totalRecebido: 0 }),
        checkouts: {
            previstos: Object.values(dailyData).reduce((sum, day) => sum + (day.previstos || 0), 0),
            prorrogados: Object.values(dailyData).reduce((sum, day) => sum + (day.prorrogados || 0), 0),
            antecipados: allLogs.filter(log => log.isAntecipado).length,
        }
    };
  }, [allLogs, entries]);

  const itemsSummary = useMemo(() => {
    const summary: Record<string, { name: string, qtd: number, valor: number }> = {};
    allLogs.forEach(log => {
      Object.entries(log.items).forEach(([itemId, quantity]) => {
        const itemInfo = frigobarItems.find(i => i.id === itemId);
        if (itemInfo) {
          if (!summary[itemId]) {
            summary[itemId] = { name: itemInfo.name, qtd: 0, valor: 0 };
          }
          summary[itemId].qtd += quantity;
          summary[itemId].valor += quantity * itemInfo.price;
        }
      });
    });
    return Object.values(summary).sort((a,b) => a.name.localeCompare(b.name));
  }, [allLogs, frigobarItems]);

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
                          <TableCell className="text-right">{formatCurrency(totals.totalConsumo)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.totalRecebido)}</TableCell>
                          <TableCell className={`text-right font-extrabold ${(totals.totalRecebido - totals.totalConsumo) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                              {formatCurrency(totals.totalRecebido - totals.totalConsumo)}
                          </TableCell>
                      </TableRow>
                  </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-4">
        <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Check-outs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="text-2xl font-bold">{checkouts.previstos}</p>
                      <p className="text-xs text-muted-foreground">Previstos</p>
                  </div>
                   <div>
                      <p className="text-2xl font-bold">{checkouts.prorrogados}</p>
                      <p className="text-xs text-muted-foreground">Prorrogados</p>
                  </div>
                   <div>
                      <p className="text-2xl font-bold">{checkouts.antecipados}</p>
                      <p className="text-xs text-muted-foreground">Antecipados</p>
                  </div>
              </CardContent>
        </Card>
        <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Totais Financeiros</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                  <div className="flex justify-between items-baseline"><p className="text-xs text-muted-foreground">Total Consumo</p><p className="text-lg font-bold text-destructive">{formatCurrency(totals.totalConsumo)}</p></div>
                  <div className="flex justify-between items-baseline"><p className="text-xs text-muted-foreground">Total Recebido</p><p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalRecebido)}</p></div>
                   <div className="flex justify-between items-baseline border-t mt-1 pt-1">
                      <p className="text-sm font-bold">DIFERENÇA</p>
                      <p className={`text-lg font-bold ${totals.totalRecebido - totals.totalConsumo < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(totals.totalRecebido - totals.totalConsumo)}</p>
                  </div>
              </CardContent>
        </Card>

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
                          <TableCell className="text-right">{formatCurrency(totals.totalConsumo)}</TableCell>
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
