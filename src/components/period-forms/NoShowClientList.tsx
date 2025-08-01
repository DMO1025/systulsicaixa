

"use client"

import React from 'react';
import type { DailyLogEntry, ControleCafeItem, ChannelUnitPricesConfig, CafeManhaNoShowItem, FilterType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Users, DollarSign } from 'lucide-react';


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
    
    if(type === 'controle-cafe-no-show') {
      const allItems = entries.flatMap(entry => (entry.cafeManhaNoShow as any)?.items || []);
      const totalValor = allItems.reduce((sum, item: CafeManhaNoShowItem) => sum + (item.valor || 0), 0);
      return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-primary" />
                    <CardTitle>Resumo do Controle</CardTitle>
                </div>
                <CardDescription>Valor total de no-show para o período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableBody>
                        <TableRow className="bg-muted/50">
                            <TableCell className="font-bold text-lg">VALOR TOTAL FATURADO</TableCell>
                            <TableCell className="text-right text-xl font-extrabold text-primary">{formatCurrency(totalValor)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      );
    }
    
    const totals = entries.reduce((acc, entry) => {
        const data = entry.controleCafeDaManha as ControleCafeItem | undefined;
        if (data) {
            acc.adultoQtd += data.adultoQtd || 0;
            acc.crianca01Qtd += data.crianca01Qtd || 0;
            acc.crianca02Qtd += data.crianca02Qtd || 0;
            acc.contagemManual += data.contagemManual || 0;
            acc.semCheckIn += data.semCheckIn || 0;
        }
        return acc;
    }, { 
        adultoQtd: 0, 
        crianca01Qtd: 0, 
        crianca02Qtd: 0, 
        contagemManual: 0, 
        semCheckIn: 0 
    });

    const totalPessoas = totals.adultoQtd + totals.crianca01Qtd + totals.crianca02Qtd + totals.contagemManual + totals.semCheckIn;
    const cafePrice = unitPrices?.cdmListaHospedes || 0;
    const totalValor = totalPessoas * cafePrice;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <CardTitle>Resumo do Controle</CardTitle>
                </div>
                <CardDescription>Total de pessoas e valor estimado para o período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Total de Pessoas</TableCell>
                            <TableCell className="text-right text-lg font-bold">{totalPessoas.toLocaleString('pt-BR')}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="font-medium">Preço Unitário do Café</TableCell>
                            <TableCell className="text-right">{formatCurrency(cafePrice)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50">
                            <TableCell className="font-bold text-lg">VALOR TOTAL ESTIMADO</TableCell>
                            <TableCell className="text-right text-xl font-extrabold text-primary">{formatCurrency(totalValor)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default NoShowClientList;

