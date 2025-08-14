
"use client";

import React, { useMemo } from 'react';
import type { DailyLogEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign } from 'lucide-react';
import { extractPersonTransactions } from '@/lib/reports/person/generator';

interface ClientReportSummaryProps {
  entries: DailyLogEntry[];
  consumptionType: string;
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNumber = (value: number | undefined) => {
    return Number(value || 0).toLocaleString('pt-BR');
};


const ClientReportSummary: React.FC<ClientReportSummaryProps> = ({ entries, consumptionType }) => {
    
    const { grandTotal } = useMemo(() => {
        const { allTransactions } = extractPersonTransactions(entries, consumptionType);
        const total = allTransactions.reduce((acc, t) => {
            acc.qtd += t.quantity;
            acc.valor += t.value;
            return acc;
        }, { qtd: 0, valor: 0 });
        return { grandTotal: total };
    }, [entries, consumptionType]);


    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <CardTitle>Resumo de Pessoas</CardTitle>
                </div>
                <CardDescription>Resumo de todos os itens faturados ou de consumo interno no período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">TOTAL DE ITENS</p>
                            <p className="text-2xl font-bold">{formatNumber(grandTotal.qtd)}</p>
                        </div>
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                     <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">VALOR TOTAL</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotal.valor)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ClientReportSummary;
