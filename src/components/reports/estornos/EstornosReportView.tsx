"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import type { EstornoItem } from '@/lib/types';
import { Undo2, Hash, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


interface EstornosReportViewProps {
  estornos: EstornoItem[];
  category?: string;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

const EstornosReportView: React.FC<EstornosReportViewProps> = ({ estornos, category }) => {
  
  const filteredEstornos = React.useMemo(() => {
    if (!category || category === 'all') {
      return estornos;
    }
    return estornos.filter(item => item.category === category);
  }, [estornos, category]);

  const sortedEstornos = React.useMemo(() => {
    return filteredEstornos.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [filteredEstornos]);
  
  const categoryTitles: Record<string, string> = {
    'restaurante': 'Restaurante',
    'frigobar': 'Frigobar',
    'room-service': 'Room Service',
  }

  const title = `Relatório de Estornos${category && category !== 'all' ? ` - ${categoryTitles[category] || category}` : ''}`;
  const description = `Lista de todos os estornos registrados para o período e categoria selecionados.`;


  const totals = React.useMemo(() => {
    return sortedEstornos.reduce((acc, item) => {
      acc.qtd += item.quantity || 0;
      acc.valorTotalNota += item.valorTotalNota || 0;
      acc.valorEstorno += item.valorEstorno || 0;
      acc.diferenca += (item.valorTotalNota || 0) - (item.valorEstorno || 0);
      return acc;
    }, { qtd: 0, valorTotalNota: 0, valorEstorno: 0, diferenca: 0 });
  }, [sortedEstornos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
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
                {sortedEstornos.length > 0 ? sortedEstornos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-medium">{format(parseISO(item.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-xs capitalize">{item.registeredBy || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {item.uh && <div>UH: {item.uh}</div>}
                      {item.nf && <div>NF: {item.nf}</div>}
                    </TableCell>
                    <TableCell className="text-xs font-medium capitalize">{item.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.observation}</TableCell>
                    <TableCell className="text-right text-xs">{formatQty(item.quantity)}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(item.valorTotalNota)}</TableCell>
                    <TableCell className="text-right text-xs text-destructive font-semibold">{formatCurrency(item.valorEstorno)}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{formatCurrency((item.valorTotalNota || 0) - (item.valorEstorno || 0))}</TableCell>
                  </TableRow>
                )) : (
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

      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Resumo de Estornos</CardTitle>
            <Undo2 className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex justify-between items-baseline pt-2">
                <p className="text-sm text-muted-foreground">Itens Estornados</p>
                <p className="text-lg font-bold">{formatQty(totals.qtd)}</p>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-sm text-muted-foreground">Valor Total das Notas</p>
                <p className="text-lg font-bold">{formatCurrency(totals.valorTotalNota)}</p>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-sm text-muted-foreground">Valor Total Estornado</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(totals.valorEstorno)}</p>
              </div>
              <div className="flex justify-between items-baseline border-t pt-2 mt-2">
                <p className="text-sm font-bold">DIFERENÇA</p>
                <p className="text-lg font-bold">{formatCurrency(totals.diferenca)}</p>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstornosReportView;
