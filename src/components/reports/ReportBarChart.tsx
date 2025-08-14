
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { GeneralReportDailyItem } from '@/lib/types';
import { parseISO, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

interface ReportLineChartProps {
  data: GeneralReportDailyItem[];
  title: string;
  description: string;
}

const chartConfig = {
  valorSemCI: { label: "Valor Líquido", color: "hsl(var(--chart-1))" },
  valorCI: { label: "Consumo Interno", color: "hsl(var(--chart-2))" },
  reajusteCIValor: { label: "Reajuste C.I.", color: "hsl(var(--chart-3))" },
};

const ReportLineChart: React.FC<ReportLineChartProps> = ({ data, title, description }) => {
  const chartData = data.map(item => ({
    date: item.date.split('/').reverse().join('-'), // Convert DD/MM/YYYY to YYYY-MM-DD for parsing
    valorSemCI: item.totalSemCI,
    valorCI: item.totalComCI - item.totalSemCI - item.totalReajusteCI,
    reajusteCIValor: item.totalReajusteCI,
  }));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                tickFormatter={(value) => {
                  if (typeof value !== 'string') return '';
                  try {
                    const date = parseISO(value);
                    if (!isValid(date)) return value;
                    return format(date, "dd/MM", { locale: ptBR });
                  } catch(e) {
                    return value;
                  }
                }}
              />
              <YAxis
                tickFormatter={(value) => `R$${(value / 1000).toLocaleString('pt-BR')}k`}
                width={80}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item, index) => {
                        if (index !== 0) {
                            return (
                                <>
                                    <div className="w-full border-t border-border my-1.5"></div>
                                    <div className="grid gap-1.5">
                                        <div className="font-bold text-foreground">
                                            {`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{name}</div>
                                    </div>
                                </>
                            );
                        }
                        return (
                            <div className="grid gap-1.5">
                                <div className="font-bold text-foreground">
                                    {`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </div>
                                <div className="text-sm text-muted-foreground">{name}</div>
                            </div>
                        );
                    }}
                     labelFormatter={(label) => {
                      if (typeof label !== 'string') return '';
                      try {
                          const date = parseISO(label);
                          if (!isValid(date)) return label;
                          return format(date, "PPP", { locale: ptBR });
                      } catch(e) {
                          return label;
                      }
                    }}
                    />
                }
              />
              <Legend />
              <Line type="monotone" dataKey="valorSemCI" stroke="var(--color-valorSemCI)" name={chartConfig.valorSemCI.label as string} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="valorCI" stroke="var(--color-valorCI)" name={chartConfig.valorCI.label as string} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="reajusteCIValor" stroke="var(--color-reajusteCIValor)" name={chartConfig.reajusteCIValor.label as string} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ReportLineChart;
