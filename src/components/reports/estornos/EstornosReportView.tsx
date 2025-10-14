
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

  const consolidatedData = React.useMemo(() => {
    if (view !== 'consolidado') return [];

    const byDate: Record<string, { credit: number; debit: number; qtd: number }> = {};
    
    sortedEstornos.forEach(item => {
        if (!byDate[item.date]) {
            byDate[item.date] = { credit: 0, debit: 0, qtd: 0 };
        }
        if (item.reason === 'relancamento') {
            byDate[item.date].credit += item.valorEstorno;
        } else {
            byDate[item.date].debit += item.valorEstorno; // valorEstorno is negative for debits
            byDate[item.date].qtd += item.quantity;
        }
    });

    return Object.entries(byDate).map(([date, data]) => ({
        date: format(parseISO(date), 'dd/MM/yyyy'),
        ...data,
        balance: data.credit + data.debit
    }));
  }, [sortedEstornos, view]);
  
  const categoryTitles: Record<string, string> = {
    'restaurante': 'Restaurante',
    'frigobar': 'Frigobar',
    'room-service': 'Room Service',
  }

  const title = `Relatório de Estornos${category && category !== 'all' ? ` - ${categoryTitles[category] || category}` : ''}`;
  const description = `Lista de todos os estornos registrados para o período e filtros selecionados.`;


  const totals = React.useMemo(() => {
    const creditos = sortedEstornos.filter(item => item.reason === 'relancamento');
    
    const debitosReais = sortedEstornos.filter(debit => {
        if (debit.reason !== 'erro de lancamento' && debit.reason !== 'nao consumido') {
            return false;
        }
        const matchingCreditIndex = creditos.findIndex(credit => 
            credit.nf === debit.nf && 
            credit.uh === debit.uh &&
            Math.abs(credit.valorEstorno) === Math.abs(debit.valorEstorno)
        );
        
        if (matchingCreditIndex !== -1) {
            creditos.splice(matchingCreditIndex, 1);
            return false;
        }
        
        return true;
    });

    const totalDebitadoValue = debitosReais.reduce((sum, item) => sum + (item.valorEstorno || 0), 0);
    const totalItensDebitoValue = debitosReais.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalCreditoValue = sortedEstornos.filter(item => item.reason === 'relancamento').reduce((sum, item) => sum + item.valorEstorno, 0);
    const balancoEstornos = totalDebitadoValue + totalCreditoValue;
    const diferencaFinal = totalDebitadoValue - balancoEstornos;

    return {
      totalDebitado: totalDebitadoValue,
      totalItensDebito: totalItensDebitoValue,
      totalCredito: totalCreditoValue,
      balancoEstornos: balancoEstornos,
      diferencaFinal: diferencaFinal,
    };
}, [sortedEstornos]);
  
  const { summaryByReason, summaryTotals } = React.useMemo(() => {
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

    const totalQtd = Object.values(reasonSummary).reduce((acc, data) => acc + data.qtd, 0);
    const totalValor = Object.values(reasonSummary).reduce((acc, data) => acc + data.valor, 0);

    return {
        summaryByReason: Object.entries(reasonSummary),
        summaryTotals: { totalQtd, totalValor }
    };
  }, [sortedEstornos]);

  const renderGeralView = () => (
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
            
            let diferenca = 0;
            if (item.valorTotalNota === 0 || item.valorEstorno === 0) {
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
                    <TableCell className="text-right text-xs">{item.valorTotalNota ? formatCurrency(item.valorTotalNota) : '-'}</TableCell>
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
            <TableCell className="text-right">{formatQty(totals.totalItensDebito)}</TableCell>
            <TableCell className="text-right">{formatCurrency(0)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.balancoEstornos)}</TableCell>
            <TableCell className="text-right">{formatCurrency(0)}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );

  const renderConsolidadoView = () => {
    const consolidatedTotals = consolidatedData.reduce((acc, row) => {
        acc.qtd += row.qtd;
        acc.credit += row.credit;
        acc.debit += row.debit;
        acc.balance += row.balance;
        return acc;
    }, { qtd: 0, credit: 0, debit: 0, balance: 0 });

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Qtd Itens (Débito)</TableHead>
                    <TableHead className="text-right">Total Débitos (R$)</TableHead>
                    <TableHead className="text-right">Total Créditos (R$)</TableHead>
                    <TableHead className="text-right">Balanço do Dia (R$)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {consolidatedData.length > 0 ? consolidatedData.map((row, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium text-xs">{row.date}</TableCell>
                        <TableCell className="text-right text-xs">{formatQty(row.qtd)}</TableCell>
                        <TableCell className="text-right text-xs text-destructive">{formatCurrency(row.debit)}</TableCell>
                        <TableCell className="text-right text-xs text-green-600">{formatCurrency(row.credit)}</TableCell>
                        <TableCell className={cn("text-right text-xs font-bold", row.balance < 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(row.balance)}
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
                        <TableCell className={cn("text-right", consolidatedTotals.balance < 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(consolidatedTotals.balance)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            )}
        </Table>
    );
  };
  
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
                    <TableRow><TableCell>Total de Itens (Débito)</TableCell><TableCell className="text-right">{formatQty(totals.totalItensDebito)}</TableCell><TableCell className="text-right">-</TableCell></TableRow>
                    <TableRow><TableCell>Total Debitado (Estornos)</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right text-destructive">{formatCurrency(totals.totalDebitado)}</TableCell></TableRow>
                    <TableRow><TableCell>Total de Crédito (Relançamentos)</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right text-green-600">{formatCurrency(totals.totalCredito)}</TableCell></TableRow>
                    <TableRow><TableCell>Balanço de Estornos</TableCell><TableCell className="text-right">-</TableCell><TableCell className={cn("text-right", totals.balancoEstornos < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(totals.balancoEstornos)}</TableCell></TableRow>
                    <TableRow className="font-bold border-t-2"><TableCell>Diferença Final</TableCell><TableCell className="text-right">-</TableCell><TableCell className={cn("text-right", totals.diferencaFinal < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(totals.diferencaFinal)}</TableCell></TableRow>
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
                            <TableCell className={cn("text-right", data.valor < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(data.valor)}</TableCell>
                        </TableRow>
                    ))}
                    {summaryByReason.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum dado.</TableCell></TableRow>}
                </TableBody>
                {summaryByReason.length > 0 && (
                    <TableFooter>
                        <TableRow className="font-bold bg-muted/50">
                            <TableCell>TOTAL GERAL</TableCell>
                            <TableCell className="text-right">{formatQty(summaryTotals.totalQtd)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(summaryTotals.totalValor)}</TableCell>
                        </TableRow>
                    </TableFooter>
                )}
             </Table>
          </Card>
      </div>
    </div>
  );
};

export default EstornosReportView;

    