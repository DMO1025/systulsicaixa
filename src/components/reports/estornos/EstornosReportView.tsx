
"use client";

import React, { useMemo } from 'react';
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
  view?: 'geral' | 'consolidado';
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || (value > -0.001 && value < 0.001)) return '-';
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
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


const EstornosReportView: React.FC<EstornosReportViewProps> = ({ estornos, category, reason, view = 'geral' }) => {
  
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
  
  const { relaunchedDebitIds, neutralizedCreditIds } = useMemo(() => {
    const debitIds = new Set<string>();
    const creditIds = new Set<string>();
    
    const credits = sortedEstornos.filter(i => i.reason === 'relancamento' && i.uh && i.nf);
    const debits = sortedEstornos.filter(i => (i.reason === 'erro de lancamento' || i.reason === 'nao consumido') && i.uh && i.nf);

    credits.forEach(credit => {
        const matchingDebitIndex = debits.findIndex(debit => 
            debit.uh === credit.uh && 
            debit.nf === credit.nf &&
            Math.abs(credit.valorEstorno) === Math.abs(debit.valorEstorno) &&
            !debitIds.has(debit.id) // Ensure a debit is only matched once
        );

        if (matchingDebitIndex !== -1) {
            const originalDebit = debits[matchingDebitIndex];
            debitIds.add(originalDebit.id);
            creditIds.add(credit.id);
            // Remove the matched debit so it can't be matched again
            debits.splice(matchingDebitIndex, 1);
        }
    });

    return { relaunchedDebitIds: debitIds, neutralizedCreditIds: creditIds };
  }, [sortedEstornos]);
  
  const consolidatedData = React.useMemo(() => {
    if (view !== 'consolidado') return [];

    const byDate: Record<string, { credit: number; debit: number; qtd: number, controle: number }> = {};
    
    sortedEstornos.forEach(item => {
        if (!byDate[item.date]) {
            byDate[item.date] = { credit: 0, debit: 0, qtd: 0, controle: 0 };
        }
        const hasBeenRelaunched = relaunchedDebitIds.has(item.id);
        const isDebit = (item.reason === 'erro de lancamento' || item.reason === 'nao consumido');
        const isCredit = item.reason === 'relancamento';

        if (isCredit) {
            if (!neutralizedCreditIds.has(item.id)) {
                byDate[item.date].credit += item.valorEstorno;
            }
            byDate[item.date].controle += 0; // Relançamentos não entram no controle
        } else if (isDebit) {
            if (hasBeenRelaunched) {
                 byDate[item.date].controle += item.valorEstorno;
            } else {
                 byDate[item.date].debit += item.valorEstorno;
                 byDate[item.date].qtd += item.quantity || 0;
            }
        } else { // Control
             byDate[item.date].controle += item.valorEstorno;
        }
    });

    return Object.entries(byDate).map(([date, data]) => ({
        date: format(parseISO(date), 'dd/MM/yyyy'),
        ...data,
    }));
  }, [sortedEstornos, view, relaunchedDebitIds, neutralizedCreditIds]);
  
  const categoryTitles: Record<string, string> = {
    'restaurante': 'Restaurante',
    'frigobar': 'Frigobar',
    'room-service': 'Room Service',
  }

  const title = `Relatório de Estornos${category && category !== 'all' ? ` - ${categoryTitles[category] || category}` : ''}`;
  const description = `Lista de todos os estornos registrados para o período e filtros selecionados.`;


  const renderGeralView = () => {
    const footerTotals = sortedEstornos.reduce((acc, item) => {
        const isNeutralizedPair = relaunchedDebitIds.has(item.id) || neutralizedCreditIds.has(item.id);
        if (isNeutralizedPair) {
            return acc; 
        }

        if (item.reason !== 'relancamento') {
          acc.qtd += item.quantity || 0;
          acc.valorTotalNota += item.valorTotalNota || 0;
        }
        
        const isDebit = (item.reason === 'erro de lancamento' || item.reason === 'nao consumido');
        if (isDebit) {
            acc.debitadoValor += item.valorEstorno || 0;
        } else {
            acc.controleValor += item.valorEstorno || 0;
        }

        let diferenca = 0;
        if ((item.valorTotalNota || 0) !== 0 && (item.valorEstorno || 0) !== 0) {
            if(item.reason === 'relancamento') {
                 diferenca = (item.valorTotalNota || 0) - Math.abs(item.valorEstorno || 0);
            } else {
                 diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
            }
        }
        acc.diferenca += diferenca;
        
        return acc;
    }, { qtd: 0, controleValor: 0, debitadoValor: 0, valorTotalNota: 0, diferenca: 0 });

    return (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário/Data</TableHead>
          <TableHead>Detalhes (UH/NF)</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Observação</TableHead>
          <TableHead className="text-right">Qtd.</TableHead>
          <TableHead className="text-right">Valor Nota</TableHead>
          <TableHead className="text-right">Estorno (Controle)</TableHead>
          <TableHead className="text-right">Estorno (Débito)</TableHead>
          <TableHead className="text-right">Diferença</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedEstornos.length > 0 ? sortedEstornos.map((item) => {
            const isDebit = item.reason === 'erro de lancamento' || item.reason === 'nao consumido';
            const isCredit = item.reason === 'relancamento';
            const hasBeenRelaunched = relaunchedDebitIds.has(item.id);
            const isNeutralizedCredit = neutralizedCreditIds.has(item.id);

            let diferenca = 0;
            if ((item.valorTotalNota || 0) !== 0 && (item.valorEstorno || 0) !== 0) {
              if (isCredit) {
                  diferenca = (item.valorTotalNota || 0) - Math.abs(item.valorEstorno || 0);
              } else {
                  diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
              }
            }
            
            const showNotaValue = item.reason !== 'relancamento' || (item.reason === 'relancamento' && (item.valorTotalNota || 0) > 0);

            return (
                <TableRow key={item.id} className={cn(
                    (hasBeenRelaunched || isNeutralizedCredit) && "bg-purple-100 dark:bg-purple-900/40 opacity-70",
                    isDebit && !hasBeenRelaunched && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}>
                    <TableCell className="text-xs">
                        <div className="font-medium capitalize">{item.registeredBy || '-'}</div>
                        <div className="text-muted-foreground">{format(parseISO(item.date), 'dd/MM/yyyy')}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.uh && <div>UH: {item.uh}</div>}
                      {item.nf && <div>NF: {item.nf}</div>}
                    </TableCell>
                    <TableCell className="text-xs font-medium capitalize">{ESTORNO_REASON_LABELS[item.reason] || item.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap">{item.observation}</TableCell>
                    <TableCell className="text-right text-xs">{item.reason === 'relancamento' ? '-' : formatQty(item.quantity)}</TableCell>
                    <TableCell className="text-right text-xs">{showNotaValue ? formatCurrency(item.valorTotalNota) : '-'}</TableCell>
                    
                    <TableCell className={cn("text-right text-xs font-semibold", (item.valorEstorno > 0 && !isCredit) && "text-green-600", (item.valorEstorno < 0 && (hasBeenRelaunched || !isDebit)) && "text-destructive" )}>
                      {(!isDebit || hasBeenRelaunched) ? formatCurrency(item.valorEstorno) : '-'}
                    </TableCell>
                    <TableCell className={cn("text-right text-xs font-semibold", isDebit && !hasBeenRelaunched && "text-white")}>
                      {(isDebit && !hasBeenRelaunched) ? formatCurrency(item.valorEstorno) : '-'}
                    </TableCell>

                    <TableCell className="text-right text-xs font-bold">{formatCurrency(diferenca)}</TableCell>
                </TableRow>
            )
        }) : (
          <TableRow>
            <TableCell colSpan={10} className="text-center text-muted-foreground">
              Nenhum estorno encontrado para o período e filtros selecionados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {sortedEstornos.length > 0 && (
          <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={4}>TOTAIS (NÃO-NEUTRALIZADOS)</TableCell>
                  <TableCell className="text-right">{formatQty(footerTotals.qtd)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(footerTotals.valorTotalNota)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(footerTotals.controleValor)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(footerTotals.debitadoValor)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(footerTotals.diferenca)}</TableCell>
              </TableRow>
          </TableFooter>
      )}
    </Table>
  )};

  const renderConsolidadoView = () => {
    const consolidatedTotals = consolidatedData.reduce((acc, row) => {
        acc.qtd += row.qtd;
        acc.debit += row.debit;
        acc.credit += row.credit;
        acc.controle += row.controle;
        return acc;
    }, { qtd: 0, credit: 0, debit: 0, controle: 0 });

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Qtd Itens (Débito)</TableHead>
                    <TableHead className="text-right">Total Estornos debitado final (R$)</TableHead>
                    <TableHead className="text-right">Total Créditos (R$)</TableHead>
                    <TableHead className="text-right">Estorno (somente controle) (R$)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {consolidatedData.length > 0 ? consolidatedData.map((row, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium text-xs">{row.date}</TableCell>
                        <TableCell className="text-right text-xs">{formatQty(row.qtd)}</TableCell>
                        <TableCell className="text-right text-xs text-destructive">{formatCurrency(row.debit)}</TableCell>
                        <TableCell className="text-right text-xs text-green-600">{formatCurrency(row.credit)}</TableCell>
                        <TableCell className={cn("text-right text-xs font-bold", row.controle < 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(row.controle)}
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado consolidado.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            {consolidatedData.length > 0 && (
                <TableFooter>
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{formatQty(consolidatedTotals.qtd)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(consolidatedTotals.debit)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(consolidatedTotals.credit)}</TableCell>
                        <TableCell className={cn("text-right", consolidatedTotals.controle < 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(consolidatedTotals.controle)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            )}
        </Table>
    );
  };
  
  const totals = React.useMemo(() => {
    const result = {
        debitosReais: { qtd: 0, valor: 0 },
        creditos: { qtd: 0, valor: 0 },
        estornosControle: { qtd: 0, valor: 0 },
    };

    sortedEstornos.forEach(item => {
        const isDebit = item.reason === 'erro de lancamento' || item.reason === 'nao consumido';
        const isCredit = item.reason === 'relancamento';
        const hasBeenRelaunched = relaunchedDebitIds.has(item.id);
        const isNeutralizedCredit = neutralizedCreditIds.has(item.id);

        if (isDebit && !hasBeenRelaunched) {
            result.debitosReais.qtd += item.quantity || 0;
            result.debitosReais.valor += item.valorEstorno || 0;
        } else if (isCredit && !isNeutralizedCredit) {
            result.creditos.qtd += item.quantity || 0;
            result.creditos.valor += item.valorEstorno || 0;
        } else {
            result.estornosControle.qtd += item.quantity || 0;
            result.estornosControle.valor += item.valorEstorno || 0;
        }
    });

    return result;
  }, [sortedEstornos, relaunchedDebitIds, neutralizedCreditIds]);
  
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
            {view === 'consolidado' ? renderConsolidadoView() : renderGeralView()}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
         <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-semibold text-foreground">Resumo Financeiro</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Qtd</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>Débitos Reais (Estorno)</TableCell>
                        <TableCell className="text-right">{formatQty(totals.debitosReais.qtd)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(totals.debitosReais.valor)}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell>Créditos (Relançamento)</TableCell>
                        <TableCell className="text-right">{formatQty(totals.creditos.qtd)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(totals.creditos.valor)}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell>Estornos (Controle)</TableCell>
                        <TableCell className="text-right">{formatQty(totals.estornosControle.qtd)}</TableCell>
                        <TableCell className={cn("text-right", totals.estornosControle.valor < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(totals.estornosControle.valor)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
          </Card>
      </div>
    </div>
  );
};

export default EstornosReportView;
