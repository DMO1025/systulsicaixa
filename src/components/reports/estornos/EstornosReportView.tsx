

"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import type { EstornoItem, EstornoReason } from '@/lib/types';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';


interface EstornosReportViewProps {
  estornos: EstornoItem[];
  category?: string;
  reason?: string;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

const ESTORNO_REASON_LABELS: Record<EstornoReason, string> = {
    'duplicidade': 'Duplicidade',
    'erro de lancamento': 'Erro de Lançamento',
    'pagamento direto': 'Pagamento Direto',
    'nao consumido': 'Não Consumido',
    'assinatura divergente': 'Assinatura Divergente',
    'cortesia': 'Cortesia',
    'relancamento': 'Relançamento',
};


const EstornosReportView: React.FC<EstornosReportViewProps> = ({ estornos, category, reason }) => {
  
  const filteredEstornos = React.useMemo(() => {
    let items = estornos;
    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }
    if (reason && reason !== 'all') {
      items = items.filter(item => item.reason === reason);
    }
    return items;
  }, [estornos, category, reason]);

  const sortedEstornos = React.useMemo(() => {
    return filteredEstornos.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [filteredEstornos]);
  
  const categoryTitles: Record<string, string> = {
    'restaurante': 'Restaurante',
    'frigobar': 'Frigobar',
    'room-service': 'Room Service',
  }

  const title = `Relatório de Estornos${category && category !== 'all' ? ` - ${categoryTitles[category] || category}` : ''}`;
  const description = `Lista de todos os estornos registrados para o período e filtros selecionados.`;


  const totals = React.useMemo(() => {
    return sortedEstornos.reduce((acc, item) => {
        if (item.reason !== 'relancamento') {
            acc.qtd += item.quantity || 0;
            acc.valorTotalNota += item.valorTotalNota || 0;
        }
        acc.valorEstorno += item.valorEstorno || 0;
        
        let diferenca;
        if (!item.valorTotalNota || item.valorTotalNota === 0) {
            diferenca = 0;
        } else if (item.reason === 'relancamento') {
             diferenca = (item.valorTotalNota || 0) - (item.valorEstorno || 0);
        } else {
             diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
        }
        acc.diferenca += diferenca;
        
        return acc;
    }, { qtd: 0, valorTotalNota: 0, valorEstorno: 0, diferenca: 0 });
  }, [sortedEstornos]);
  
  const summaryByReason = React.useMemo(() => {
    const reasonSummary: Record<string, { qtd: number; valor: number }> = {};
    sortedEstornos.forEach(item => {
        const reasonLabel = ESTORNO_REASON_LABELS[item.reason] || item.reason;
        if (!reasonSummary[reasonLabel]) {
            reasonSummary[reasonLabel] = { qtd: 0, valor: 0 };
        }
        if(item.reason !== 'relancamento') {
             reasonSummary[reasonLabel].qtd += item.quantity || 0;
        }
        reasonSummary[reasonLabel].valor += item.valorEstorno || 0;
    });
    return Object.entries(reasonSummary);
  }, [sortedEstornos]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-primary"/>
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Detalhes (UH/NF)</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor Total Nota</TableHead>
                  <TableHead className="text-right">Valor do Estorno</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEstornos.length > 0 ? sortedEstornos.map((item) => {
                    const isCredit = item.reason === 'relancamento';
                    
                    let diferenca;
                    if (!item.valorTotalNota || item.valorTotalNota === 0) {
                        diferenca = 0;
                    } else if (isCredit) {
                        diferenca = (item.valorTotalNota || 0) - (item.valorEstorno || 0);
                    } else {
                        diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
                    }

                    return (
                        <TableRow key={item.id}>
                            <TableCell className="text-xs font-medium">{format(parseISO(item.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-xs capitalize">{item.registeredBy || '-'}</TableCell>
                            <TableCell className="text-xs">
                              {item.uh && <div>UH: {item.uh}</div>}
                              {item.nf && <div>NF: {item.nf}</div>}
                            </TableCell>
                            <TableCell className="text-xs font-medium capitalize">{ESTORNO_REASON_LABELS[item.reason] || item.reason}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap">{item.observation}</TableCell>
                            <TableCell className="text-right text-xs">{formatQty(item.quantity)}</TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(item.valorTotalNota)}</TableCell>
                            <TableCell className={cn("text-right text-xs font-semibold", isCredit ? "text-green-600" : "text-destructive")}>{formatCurrency(item.valorEstorno)}</TableCell>
                            <TableCell className="text-right text-xs font-bold">{formatCurrency(diferenca)}</TableCell>
                        </TableRow>
                    )
                }) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhum estorno encontrado para o período e filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {sortedEstornos.length > 0 && (
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={5}>TOTAIS</TableCell>
                    <TableCell className="text-right">{formatQty(totals.qtd)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.valorTotalNota)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.valorEstorno)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.diferenca)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
         <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-semibold text-foreground">Resumo Financeiro</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow><TableCell>Total de Itens Estornados</TableCell><TableCell className="text-right">{formatQty(totals.qtd)}</TableCell></TableRow>
                    <TableRow><TableCell>Valor Total das Notas</TableCell><TableCell className="text-right">{formatCurrency(totals.valorTotalNota)}</TableCell></TableRow>
                    <TableRow><TableCell>Balanço de Estornos</TableCell><TableCell className="text-right">{formatCurrency(totals.valorEstorno)}</TableCell></TableRow>
                    <TableRow className="font-bold bg-muted/50"><TableCell>Diferença Final</TableCell><TableCell className="text-right">{formatCurrency(totals.diferenca)}</TableCell></TableRow>
                </TableBody>
            </Table>
          </Card>
          <Card>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-semibold text-foreground">Resumo por Motivo</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Qtd</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {summaryByReason.map(([reasonLabel, data]) => (
                        <TableRow key={reasonLabel}>
                            <TableCell>{reasonLabel}</TableCell>
                            <TableCell className="text-right">{formatQty(data.qtd)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.valor)}</TableCell>
                        </TableRow>
                    ))}
                    {summaryByReason.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum dado.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </Card>
      </div>
    </div>
  );
};

export default EstornosReportView;
