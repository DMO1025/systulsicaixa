
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ControleCafeItem } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ControleCafeFiscalSummaryProps {
  title: string;
  days: Date[];
  dailyStates: Record<string, ControleCafeItem>;
  unitPrice: number;
  className?: string;
}

const ControleCafeFiscalSummary: React.FC<ControleCafeFiscalSummaryProps> = ({ title, days, dailyStates, unitPrice, className }) => {
  
  const totals = useMemo(() => {
    return days.reduce((acc, day) => {
      const dateString = format(day, 'yyyy-MM-dd');
      const entry = dailyStates[dateString];
      if (!entry) return acc;

      acc.adultoQtd += entry.adultoQtd || 0;
      acc.crianca01Qtd += entry.crianca01Qtd || 0;
      acc.crianca02Qtd += entry.crianca02Qtd || 0;
      acc.contagemManual += entry.contagemManual || 0;
      acc.semCheckIn += entry.semCheckIn || 0;
      
      return acc;
    }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });
  }, [days, dailyStates]);

  const totalCriancas = totals.crianca01Qtd + totals.crianca02Qtd;
  const totalPessoas = totals.adultoQtd + totalCriancas + totals.contagemManual + totals.semCheckIn;
  const totalValor = totalPessoas * unitPrice;

  const formatNumber = (value: number) => value.toLocaleString('pt-BR');
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


  return (
    <Card className={cn("shadow-md", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-baseline">
            <CardTitle className="text-base font-bold">RESUMO FISCAL</CardTitle>
            <span className="text-sm font-semibold text-muted-foreground">({title})</span>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2.5 pt-2">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Total Adultos:</span>
          <span className="font-bold text-lg text-primary">{formatNumber(totals.adultoQtd)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Total Crianças:</span>
          <span className="font-bold text-lg text-primary">{formatNumber(totalCriancas)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Total Contagem Manual:</span>
          <span className="font-bold text-lg text-primary">{formatNumber(totals.contagemManual)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Total Sem Check-in:</span>
          <span className="font-bold text-lg text-primary">{formatNumber(totals.semCheckIn)}</span>
        </div>
         <div className="flex justify-between items-center pt-2 border-t mt-3">
          <span className="font-bold text-foreground">Valor Total (R$):</span>
          <span className="font-bold text-lg text-primary">{formatCurrency(totalValor)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControleCafeFiscalSummary;
