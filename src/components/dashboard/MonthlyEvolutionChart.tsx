
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, XAxis, YAxis, Legend, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { MonthlyEvolutionDataItem } from '@/lib/types';


const chartConfig = {
  valorSemCI: { label: "Valor Líquido", color: "hsl(var(--chart-1))" },
  valorCI: { label: "Consumo Interno", color: "hsl(var(--chart-2))" },
  reajusteCIValor: { label: "Reajuste C.I.", color: "hsl(var(--chart-3))" },
};

interface MonthlyEvolutionChartProps {
  data: MonthlyEvolutionDataItem[];
  isLoading: boolean;
}

const MonthlyEvolutionChart: React.FC<MonthlyEvolutionChartProps> = ({ data, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Mensal (Últimos 3 Meses)</CardTitle>
        <CardDescription>Receita mensal por categoria.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <LineChart data={data} margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
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
                width={80}
              />
              <ChartTooltip 
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent 
                            formatter={(value, name) => (
                              <div className="flex flex-col items-start gap-1">
                                <div className="font-bold text-foreground">
                                  {`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {name}
                                </div>
                              </div>
                            )}
                            labelKey="month"
                          />} 
              />
              <Legend />
              <Line type="monotone" dataKey="valorSemCI" stroke="var(--color-valorSemCI)" name={chartConfig.valorSemCI.label as string} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="valorCI" stroke="var(--color-valorCI)" name={chartConfig.valorCI.label as string} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="reajusteCIValor" stroke="var(--color-reajusteCIValor)" name={chartConfig.reajusteCIValor.label as string} strokeWidth={2} dot={false} />
            </LineChart>
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
