
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from '@/lib/types';
import { parseISO, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface PeriodReportLineChartProps {
  data: any[];
  config: ChartConfig;
  title: string;
  connectNulls?: boolean;
}

const PeriodReportLineChart: React.FC<PeriodReportLineChartProps> = ({ data, config, title, connectNulls = false }) => {
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
                tickFormatter={(value, index) => {
                    if (typeof value !== 'string') return '';
                    try {
                        const date = parseISO(value);
                        if (!isValid(date)) return value;
                        if (index % 2 === 0) { // Show every other label to prevent crowding
                            return format(date, "dd/MM", { locale: ptBR });
                        }
                    } catch(e) {
                        return value;
                    }
                    return "";
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
              {Object.keys(config).map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={false}
                  name={config[key].label as string}
                  connectNulls={connectNulls}
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

    