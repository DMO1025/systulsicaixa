
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
import type { DailyLogEntry, FrigobarConsumptionLog, FrigobarItem, ReportExportData } from '@/lib/types';
import { getSetting } from '@/services/settingsService';
import { ShoppingCart, Star, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';


const formatCurrency = (value?: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value?: number) => Number(value || 0).toLocaleString('pt-BR');

interface ControleFrigobarReportViewProps {
  entries: DailyLogEntry[];
  onDataCalculated: (data: ReportExportData) => void;
  view?: 'descritivo' | 'consolidado';
}

const SummaryCard = ({ title, value, icon: Icon, variant = 'default', children }: { title: string, value: string | React.ReactNode, icon: React.ElementType, variant?: 'default' | 'positive' | 'negative', children?: React.ReactNode }) => {
    const variantClasses = {
        default: 'text-primary',
        positive: 'text-green-600 dark:text-green-500',
        negative: 'text-destructive',
    };
    return (
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${variantClasses[variant]}`}>{value}</div>
                {children}
            </CardContent>
        </Card>
    )
};


const ControleFrigobarReportView: React.FC<ControleFrigobarReportViewProps> = ({ entries, onDataCalculated, view = 'descritivo' }) => {
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

  const { allLogs, dailyAggregates, totals, checkouts, itemsSummary, perdaPercentual, perdaValor } = useMemo(() => {
    const logs: (FrigobarConsumptionLog & { entryDate: string })[] = [];
    const dailyData: Record<string, { previstos?: number, prorrogados?: number, abatimento?: number, consumo: number, recebido: number }> = {};
    
    entries.forEach(entry => {
      const frigobarData = entry.controleFrigobar as any;
      if (!dailyData[entry.id as string]) {
          dailyData[entry.id as string] = { consumo: 0, recebido: 0, abatimento: 0 };
      }

      if (frigobarData?.abatimentoAvulso) {
          dailyData[entry.id as string].abatimento = frigobarData.abatimentoAvulso;
      }

      if (frigobarData?.logs && Array.isArray(frigobarData.logs)) {
        frigobarData.logs.forEach((log: FrigobarConsumptionLog) => {
          const entryDate = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
          logs.push({ ...log, entryDate });

          dailyData[entry.id as string].consumo += log.totalValue || 0;
          dailyData[entry.id as string].recebido += log.valorRecebido || 0;
        });
      }
      
      if (frigobarData) {
          dailyData[entry.id as string].previstos = frigobarData.checkoutsEfetivados;
          dailyData[entry.id as string].prorrogados = frigobarData.checkoutsProrrogados;
      }
    });

    const dailyAggregates = Object.entries(dailyData).map(([date, data]) => ({
      date: format(parseISO(date), 'dd/MM/yyyy'),
      consumo: data.consumo,
      recebido: data.recebido,
      abatimento: data.abatimento || 0,
      diferenca: (data.recebido + (data.abatimento || 0)) - data.consumo,
    })).sort((a, b) => parseISO(a.date.split('/').reverse().join('-')).getTime() - parseISO(b.date.split('/').reverse().join('-')).getTime());

    const sortedLogs = logs.sort((a, b) => {
      const dateCompare = parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.uh.localeCompare(b.uh, undefined, {numeric: true});
    });


    const calculatedCheckouts = {
        efetivados: Object.values(dailyData).reduce((sum, day) => sum + (day.previstos || 0), 0),
        prorrogados: Object.values(dailyData).reduce((sum, day) => sum + (day.prorrogados || 0), 0),
        antecipados: sortedLogs.filter(log => log.isAntecipado).length,
    };

    const calculatedTotals = sortedLogs.reduce((acc, log) => {
        acc.consumo += log.totalValue || 0;
        acc.recebido += log.valorRecebido || 0;
        return acc;
    }, { consumo: 0, recebido: 0 });

    const totalAbatimento = Object.values(dailyData).reduce((sum, day) => sum + (day.abatimento || 0), 0);
    const totalRecebidoComAbatimento = calculatedTotals.recebido + totalAbatimento;


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
    
    const diferencaFinal = totalRecebidoComAbatimento - calculatedTotals.consumo;
    const pValor = diferencaFinal < 0 ? Math.abs(diferencaFinal) : 0;
    const porcentagemPerda = calculatedTotals.consumo > 0 ? (pValor / calculatedTotals.consumo) * 100 : 0;
    
    return { 
        allLogs: sortedLogs, 
        dailyAggregates,
        totals: {
            consumo: calculatedTotals.consumo,
            recebido: calculatedTotals.recebido,
            diferenca: diferencaFinal,
            abatimento: totalAbatimento,
            totalItems,
            totalUhsAtendidas,
        },
        checkouts: calculatedCheckouts,
        itemsSummary: sortedItemsSummary,
        perdaPercentual: porcentagemPerda,
        perdaValor: pValor,
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
            dailyAggregates
        }
    });
  }, [allLogs, dailyAggregates, totals, checkouts, itemsSummary, onDataCalculated]);

  const totalItemsQtd = itemsSummary.reduce((acc, item) => acc + item.qtd, 0);
  const subtotal = totals.recebido - totals.consumo;
  const finalTotal = totals.diferenca;
  


  const renderDescritivoView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">Data</TableHead>
          <TableHead className="text-left">UH</TableHead>
          <TableHead className="text-left">Itens Consumidos</TableHead>
          <TableHead className="text-left">Vlr. Consumo</TableHead>
          <TableHead className="text-left">Vlr. Recebido</TableHead>
          <TableHead className="text-left">Diferença</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allLogs.length > 0 ? allLogs.map((log) => (
          <TableRow key={log.id} className={cn(log.isAntecipado && "bg-blue-50 dark:bg-blue-950/50")}>
            <TableCell className="text-xs font-medium text-left">{log.entryDate}</TableCell>
            <TableCell className="text-sm font-semibold text-left">
              <div className="flex items-center gap-2">
                {log.isAntecipado && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                {log.uh}
              </div>
            </TableCell>
            <TableCell className="text-xs text-left">
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
            <TableCell className="text-xs text-left">{formatCurrency(log.totalValue)}</TableCell>
            <TableCell className="text-xs text-green-600 text-left">{formatCurrency(log.valorRecebido)}</TableCell>
            <TableCell className={`text-xs font-bold ${(log.valorRecebido || 0) - log.totalValue < 0 ? 'text-destructive' : 'text-green-600'} text-left`}>
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
                  <TableCell colSpan={3} className="text-left">TOTAIS</TableCell>
                  <TableCell className="text-left">{formatCurrency(totals.consumo)}</TableCell>
                  <TableCell className="text-left">{formatCurrency(totals.recebido)}</TableCell>
                  <TableCell className={`font-extrabold ${subtotal < 0 ? 'text-destructive' : 'text-green-600'} text-left`}>
                      {formatCurrency(subtotal)}
                  </TableCell>
              </TableRow>
          </TableFooter>
      )}
    </Table>
  );

  const renderConsolidadoView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">Data</TableHead>
          <TableHead className="text-right">Valor Consumo</TableHead>
          <TableHead className="text-right">Valor Recebido</TableHead>
          <TableHead className="text-right">Valor Abatido</TableHead>
          <TableHead className="text-right">Diferença</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dailyAggregates.length > 0 ? dailyAggregates.map((day) => (
          <TableRow key={day.date}>
            <TableCell className="font-medium text-left">{day.date}</TableCell>
            <TableCell className="text-right">{formatCurrency(day.consumo)}</TableCell>
            <TableCell className="text-right">{formatCurrency(day.recebido)}</TableCell>
            <TableCell className="text-right">{formatCurrency(day.abatimento)}</TableCell>
            <TableCell className={`font-bold ${day.diferenca < 0 ? 'text-destructive' : 'text-green-600'} text-right`}>
              {formatCurrency(day.diferenca)}
            </TableCell>
          </TableRow>
        )) : (
           <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Nenhum dado para consolidar.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {dailyAggregates.length > 0 && (
        <TableFooter>
          <TableRow className="font-bold bg-muted/50">
            <TableCell className="text-left">TOTAL GERAL</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.consumo)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.recebido)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.abatimento)}</TableCell>
            <TableCell className={`font-extrabold ${totals.diferenca < 0 ? 'text-destructive' : 'text-green-600'} text-right`}>{formatCurrency(totals.diferenca)}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatório de Controle de Frigobar</CardTitle>
            <CardDescription>
              {view === 'descritivo' 
                ? 'Consumo de frigobar registrado no período selecionado.'
                : 'Consumo de frigobar consolidado por dia.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === 'descritivo' ? renderDescritivoView() : renderConsolidadoView()}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-4">
        <Card>
             <CardHeader className="pb-2"><CardTitle className="text-base">Resumo Geral</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm"><span>Total de Quartos Atendidos</span><span className="font-semibold">{formatQty(totals.totalUhsAtendidas)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Total de Itens Vendidos</span><span className="font-semibold">{formatQty(totals.totalItems)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Total Consumido (R$)</span><span className="font-semibold">{formatCurrency(totals.consumo)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Total Recebido (R$)</span><span className="font-semibold">{formatCurrency(totals.recebido)}</span></div>
                    <div className="flex justify-between items-center text-sm font-semibold border-t pt-2 mt-2"><span>Total Diferença (R$)</span><span className={cn(subtotal < 0 && 'text-destructive')}>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Valor Abatido</span><span className="font-semibold">{formatCurrency(totals.abatimento)}</span></div>
                    <div className="flex justify-between items-center text-base pt-2 border-t font-bold"><span>Total Perda</span><span className={cn(finalTotal < 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(finalTotal)}</span></div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Check-outs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm"><span>Efetivados</span><span className="font-semibold">{formatQty(checkouts.efetivados)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Prorrogados</span><span className="font-semibold">{formatQty(checkouts.prorrogados)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span>Antecipados</span><span className="font-semibold">{formatQty(checkouts.antecipados)}</span></div>
                </div>
            </CardContent>
        </Card>
        <SummaryCard 
            title="Porcentagem de Perda" 
            value={`${perdaPercentual.toFixed(2)}%`} 
            icon={AlertTriangle} 
            variant="negative"
        >
             <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p><span className="font-semibold">Valor da Perda (R$):</span> {formatCurrency(perdaValor)}</p>
                <p><span className="font-semibold">Total Consumido (R$):</span> {formatCurrency(totals.consumo)}</p>
                <p className="pt-1 italic">(Perda / Total Consumido) * 100</p>
            </div>
        </SummaryCard>
        
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
                      {itemsSummary.map((item: any) => (
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
