
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, ResponsiveContainer, XAxis, Legend, Bar, CartesianGrid, LabelList } from 'recharts';
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
  
  const chartDataWithTotal = data.map(item => ({
    ...item,
    total: item.valorSemCI + item.valorCI + item.reajusteCIValor,
  }));

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Mensal (Últimos 3 Meses)</CardTitle>
        <CardDescription>Receita mensal por categoria.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartDataWithTotal.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartDataWithTotal} margin={{ top: 30, right: 20, left: 20, bottom: 5 }} barGap={10} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
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
                <Bar dataKey="valorSemCI" stackId="a" fill="var(--color-valorSemCI)" name={chartConfig.valorSemCI.label as string} radius={[4, 4, 0, 0]}>
                   <LabelList
                      dataKey="total"
                      position="top"
                      offset={10}
                      formatter={formatCurrency}
                      className="fill-foreground font-semibold text-sm"
                    />
                </Bar>
                <Bar dataKey="valorCI" stackId="a" fill="var(--color-valorCI)" name={chartConfig.valorCI.label as string} />
                <Bar dataKey="reajusteCIValor" stackId="a" fill="var(--color-reajusteCIValor)" name={chartConfig.reajusteCIValor.label as string} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

    