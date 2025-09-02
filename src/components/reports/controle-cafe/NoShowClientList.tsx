
"use client"

import React, { useMemo } from 'react';
import type { DailyLogEntry, ControleCafeItem, ChannelUnitPricesConfig, CafeManhaNoShowItem, FilterType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import { Users, DollarSign } from 'lucide-react';
import { getMonth, getDate, parseISO, getYear, addMonths } from 'date-fns';


interface NoShowClientListProps {
  entries: DailyLogEntry[];
  unitPrices: ChannelUnitPricesConfig;
  type: FilterType;
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const NoShowClientList: React.FC<NoShowClientListProps> = ({ entries, unitPrices, type }) => {
    
    const mesSelecionado = entries.length > 0 ? getMonth(parseISO(String(entries[0].id))) : new Date().getMonth();
    const anoSelecionado = entries.length > 0 ? getYear(parseISO(String(entries[0].id))) : new Date().getFullYear();
    
    const isNoShowReport = type === 'controle-cafe-no-show';

    const dezenas = useMemo(() => {
        const proximoMes = addMonths(new Date(anoSelecionado, mesSelecionado, 1), 1);
        const mesDoProximoMes = getMonth(proximoMes);
        const anoDoProximoMes = getYear(proximoMes);

        const filterByDezena = (entry: DailyLogEntry, dezena: string) => {
            const dataLancamento = parseISO(String(entry.id));
            const dia = getDate(dataLancamento);
            const mes = getMonth(dataLancamento);
            const ano = getYear(dataLancamento);
            
             if (isNoShowReport) {
                if (dezena === '1') return dia >= 1 && dia <= 10;
                if (dezena === '2') return dia >= 11 && dia <= 20;
                if (dezena === '3') return dia >= 21;
            } else { // Controle Café (dia 2 a dia 1 do proximo mes)
                if (dezena === '1') return dia >= 2 && dia <= 11;
                if (dezena === '2') return dia >= 12 && dia <= 21;
                if (dezena === '3') {
                    if (mes === mesSelecionado && ano === anoSelecionado && dia >= 22) return true;
                    if (mes === mesDoProximoMes && ano === anoDoProximoMes && dia === 1) return true;
                }
            }
            return false;
        };
        
        const primeiraDezenaEntries = entries.filter(e => filterByDezena(e, '1'));
        const segundaDezenaEntries = entries.filter(e => filterByDezena(e, '2'));
        const terceiraDezenaEntries = entries.filter(e => filterByDezena(e, '3'));

        const calculateNoShowTotals = (dezenaEntries: DailyLogEntry[]) => {
            const allItems = dezenaEntries.flatMap(entry => (entry.cafeManhaNoShow as any)?.items || []);
            const valorTotal = allItems.reduce((sum: number, item: CafeManhaNoShowItem) => sum + (item.valor || 0), 0);
            return {
                pessoas: allItems.length,
                valor: valorTotal,
            };
        };

        const calculateControleCafeTotals = (dezenaEntries: DailyLogEntry[]) => {
          const cafePrice = unitPrices?.cdmListaHospedes || 0;
          const totals = dezenaEntries.reduce((acc, entry) => {
              const data = entry.controleCafeDaManha as ControleCafeItem | undefined;
              if (data) {
                  acc.adultoQtd += data.adultoQtd || 0;
                  acc.crianca01Qtd += data.crianca01Qtd || 0;
                  acc.crianca02Qtd += data.crianca02Qtd || 0;
                  acc.contagemManual += data.contagemManual || 0;
                  acc.semCheckIn += data.semCheckIn || 0;
              }
              return acc;
          }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });
          
          const totalPessoas = totals.adultoQtd + totals.crianca01Qtd + totals.crianca02Qtd + totals.contagemManual + totals.semCheckIn;
          return {
            pessoas: totalPessoas,
            valor: totalPessoas * cafePrice
          };
        };
        
        const calculateTotals = isNoShowReport ? calculateNoShowTotals : calculateControleCafeTotals;

        return {
            primeira: calculateTotals(primeiraDezenaEntries),
            segunda: calculateTotals(segundaDezenaEntries),
            terceira: calculateTotals(terceiraDezenaEntries),
        };

    }, [entries, unitPrices, type, mesSelecionado, anoSelecionado, isNoShowReport]);

    const totalGeral = {
      pessoas: dezenas.primeira.pessoas + dezenas.segunda.pessoas + dezenas.terceira.pessoas,
      valor: dezenas.primeira.valor + dezenas.segunda.valor + dezenas.terceira.valor
    }
    
    const cafePrice = type === 'controle-cafe-no-show' ? (unitPrices?.cdmNoShow || 0) : (unitPrices?.cdmListaHospedes || 0);
    const cardTitle = type === 'controle-cafe-no-show' ? 'Resumo do No-Show' : 'Resumo do Controle';
    const cardDescription = type === 'controle-cafe-no-show' 
        ? 'Valor total de no-show para o período selecionado, dividido por dezenas.'
        : 'Total de pessoas e valor estimado para o período selecionado, dividido por dezenas.';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <CardTitle>{cardTitle}</CardTitle>
                </div>
                <CardDescription>{cardDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Dezena</TableHead>
                            <TableHead className="text-right">Total de Pessoas/Itens</TableHead>
                            <TableHead className="text-right">Valor Estimado/No-Show</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">1ª Dezena</TableCell>
                            <TableCell className="text-right text-sm">{dezenas.primeira.pessoas.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(dezenas.primeira.valor)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">2ª Dezena</TableCell>
                            <TableCell className="text-right text-sm">{dezenas.segunda.pessoas.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(dezenas.segunda.valor)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">3ª Dezena</TableCell>
                            <TableCell className="text-right text-sm">{dezenas.terceira.pessoas.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(dezenas.terceira.valor)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                <div className="border-t mt-4 pt-4 space-y-2">
                    {type === 'controle-cafe' && 
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Preço Unitário Aplicado</span>
                            <span className="text-sm font-semibold">{formatCurrency(cafePrice)}</span>
                        </div>
                    }
                     <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                        <span className="font-bold text-base">VALOR TOTAL GERAL</span>
                        <span className="text-lg font-extrabold text-primary">{formatCurrency(totalGeral.valor)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default NoShowClientList;
