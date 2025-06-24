
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar as RechartsBar, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { MonthlyEvolutionDataItem, EvolutionChartConfig } from '@/lib/types';

interface MonthlyEvolutionChartProps {
  data: MonthlyEvolutionDataItem[];
  chartConfig: EvolutionChartConfig;
  isLoading: boolean;
}

const MonthlyEvolutionChart: React.FC<MonthlyEvolutionChartProps> = ({ data, chartConfig, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Mensal (Últimos 3 Meses)</CardTitle>
        <CardDescription>Valores COM CI, SEM CI e Reajustes CI.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
              />
              <YAxis 
                tickFormatter={(value) => `R$${(value / 1000).toLocaleString('pt-BR')}k`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <Tooltip 
                content={<ChartTooltipContent 
                            formatter={(value, name, props) => {
                              const { payload } = props;
                              let displayValue = `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                              let qtyLabel = "";
                              if (name === chartConfig.valorComCI.label && payload.qtdComCI !== undefined) {
                                qtyLabel = ` (Qtd: ${payload.qtdComCI.toLocaleString('pt-BR')})`;
                              } else if (name === chartConfig.valorSemCI.label && payload.qtdSemCI !== undefined) {
                                qtyLabel = ` (Qtd: ${payload.qtdSemCI.toLocaleString('pt-BR')})`;
                              }
                              return (
                                <div className="flex flex-col">
                                  <span>{displayValue}</span>
                                  {qtyLabel && <span className="text-xs text-muted-foreground">{qtyLabel}</span>}
                                </div>
                              );
                            }}
                            labelKey="month"
                          />} 
              />
              <Legend />
              <RechartsBar dataKey="valorComCI" fill="var(--color-valorComCI)" radius={[4, 4, 0, 0]} name={chartConfig.valorComCI.label as string} />
              <RechartsBar dataKey="valorSemCI" fill="var(--color-valorSemCI)" radius={[4, 4, 0, 0]} name={chartConfig.valorSemCI.label as string} />
              <RechartsBar dataKey="reajusteCIValor" fill="var(--color-reajusteCIValor)" radius={[4, 4, 0, 0]} name={chartConfig.reajusteCIValor.label as string} />
            </RechartsBarChart>
          </ChartContainer>
        ) : (
           <p className="text-muted-foreground text-center py-4">
              {isLoading ? "Carregando dados da evolução mensal..." : "Dados insuficientes ou nenhum lançamento encontrado para exibir a evolução mensal."}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyEvolutionChart;
