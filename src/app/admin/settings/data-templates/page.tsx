
"use client";

import React from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Download } from 'lucide-react';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { PERIOD_FORM_CONFIG, SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import type { PeriodId, SalesChannelId } from '@/lib/types';
import { format, eachDayOfInterval, startOfYear } from 'date-fns';

export default function DataTemplatesPage() {
  
  const generateHeaders = (periodId: PeriodId): { sheetName: string; data: (string | number)[][] }[] => {
    const periodConfig = PERIOD_FORM_CONFIG[periodId];
    if (!periodConfig) return [];
    
    const sheets = [];
    
    const startDate = new Date(2025, 0, 1); // January 1, 2025
    const endDate = new Date(2025, 5, 30); // June 30, 2025
    const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

    if (periodId === 'eventos') {
      const headers = [
        "Data (AAAA-MM-DD)", "Nome do Evento", "Local", "Tipo de Serviço",
        "Descrição (se Outro)", "Quantidade", "Valor Total (R$)"
      ];
      const exampleData = [headers];
       for (let i = 0; i < dateInterval.length; i++) {
        const date = format(dateInterval[i], 'yyyy-MM-dd');
        const eventName = `Evento Exemplo ${i + 1}`;
        const location = EVENT_LOCATION_OPTIONS[i % EVENT_LOCATION_OPTIONS.length].label;
        const service = EVENT_SERVICE_TYPE_OPTIONS[i % (EVENT_SERVICE_TYPE_OPTIONS.length -1)].label;
        const qty = Math.floor(Math.random() * 50) + 10;
        const value = (Math.random() * 2000 + 500);
        exampleData.push([date, eventName, location, service, "", qty, value.toFixed(2)]);
      }
      sheets.push({ sheetName: 'Eventos', data: exampleData });
      return sheets;
    }

    const generateExampleRows = (headers: string[]) => {
      const rows: (string|number)[][] = [headers];
      dateInterval.forEach((dateObj, i) => {
        const date = format(dateObj, 'yyyy-MM-dd');
        const row: (string|number)[] = [date];
        headers.slice(1).forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('(qtd)')) {
            row.push(Math.floor(Math.random() * 20) + 1);
          } else if (lowerHeader.includes('(r$)')) {
            row.push((Math.random() * 100 + 10).toFixed(2));
          } else if (lowerHeader.includes('pessoa') || lowerHeader.includes('setor')) {
            row.push('Demetrios Felipe Graciano TI');
          } else if (lowerHeader.includes('tipo')) {
            const tipos = ['hotel', 'funcionario', 'outros'];
            row.push(tipos[i % tipos.length]);
          } else {
             row.push(''); // For non-numeric columns like observation
          }
        });
        rows.push(row);
      });
      return rows;
    };

    if (periodConfig.subTabs) {
      for (const subTabKey in periodConfig.subTabs) {
        const subTabConfig = periodConfig.subTabs[subTabKey];
        if (subTabKey === 'faturado') {
            const headers = ["Data (AAAA-MM-DD)", "Pessoa", "Tipo (hotel/funcionario/outros)", "Quantidade", "Valor (R$)", "Observação"];
            const exampleData = generateExampleRows(headers);
            sheets.push({ sheetName: "Faturado", data: exampleData });
        } else if (subTabKey === 'consumoInterno') {
            const headers = ["Data (AAAA-MM-DD)", "Pessoa/Setor", "Quantidade", "Valor (R$)", "Observação", "Reajuste de C.I (Valor Total do Dia)"];
            const exampleData = generateExampleRows(headers);
            sheets.push({ sheetName: "Consumo Interno", data: exampleData });
        } else {
            const headers: string[] = ["Data (AAAA-MM-DD)"];
            Object.entries(subTabConfig.groupedChannels).forEach(([channelId, config]) => {
              const channelLabel = SALES_CHANNELS[config.qtd as SalesChannelId] || SALES_CHANNELS[config.vtotal as SalesChannelId] || config.label;
              if (config.qtd) headers.push(`${channelLabel} (Qtd)`);
              if (config.vtotal) headers.push(`${channelLabel} (R$)`);
            });
            if (headers.length > 1) {
              const exampleData = generateExampleRows(headers);
              sheets.push({ sheetName: subTabConfig.label.substring(0, 31), data: exampleData });
            }
        }
      }
    } else if (periodConfig.channels) {
      const headers: string[] = ["Data (AAAA-MM-DD)"];
        Object.entries(periodConfig.channels).forEach(([channelId, config]) => {
          const channelLabel = SALES_CHANNELS[channelId as SalesChannelId];
          if (config.qtd) headers.push(`${channelLabel} (Qtd)`);
          if (config.vtotal) headers.push(`${channelLabel} (R$)`);
        });
      if (headers.length > 1) {
        const exampleData = generateExampleRows(headers);
        sheets.push({ sheetName: 'Lançamentos', data: exampleData });
      }
    }
    
    return sheets;
  };

  const handleDownloadTemplate = (periodId: PeriodId) => {
    const periodDef = PERIOD_DEFINITIONS.find(p => p.id === periodId);
    if (!periodDef) return;

    const sheetsData = generateHeaders(periodId);
    if (sheetsData.length === 0) return;

    const wb = XLSX.utils.book_new();
    sheetsData.forEach(sheetInfo => {
      const ws = XLSX.utils.aoa_to_sheet(sheetInfo.data);
      if (sheetInfo.data[0]) {
        const cols = sheetInfo.data[0].map((header: any) => ({
            wch: Math.max(String(header).length, 18)
        }));
        ws['!cols'] = cols;
      }
      XLSX.utils.book_append_sheet(wb, ws, sheetInfo.sheetName);
    });

    XLSX.writeFile(wb, `Modelo_${periodDef.label.replace(/[\s\/]/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Modelos de Dados para Importação</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Baixar Modelos</CardTitle>
          <CardDescription>
            Faça o download dos arquivos de modelo em formato Excel (XLSX) para cada período.
            Preencha esses arquivos com seus dados para importá-los posteriormente no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PERIOD_DEFINITIONS.map(period => (
            <Card key={period.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                    <div className="flex items-center gap-2">
                        <period.icon className="h-5 w-5 text-muted-foreground"/>
                        <CardTitle className="text-lg">{period.label}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                      <Button onClick={() => handleDownloadTemplate(period.id)} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Modelo
                    </Button>
                </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
