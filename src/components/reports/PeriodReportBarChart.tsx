"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from '@/lib/types';


interface PeriodReportLineChartProps {
  data: any[];
  config: ChartConfig;
  title: string;
}

const PeriodReportLineChart: React.FC<PeriodReportLineChartProps> = ({ data, config, title }) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Evolução diária das categorias no período.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
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
                    labelKey="date"
                  />
                }
              />
              <Legend />
              {Object.keys(config).map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={false}
                  name={config[key].label as string}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PeriodReportLineChart;
