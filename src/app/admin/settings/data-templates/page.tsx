
"use client";

import React from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Download } from 'lucide-react';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { PERIOD_FORM_CONFIG, SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import type { PeriodId, SalesChannelId } from '@/lib/types';

export default function DataTemplatesPage() {

  const generateHeaders = (periodId: PeriodId): { sheetName: string; data: (string[])[] }[] => {
    const periodConfig = PERIOD_FORM_CONFIG[periodId];
    if (!periodConfig) return [];
    
    const sheets = [];

    if (periodId === 'eventos') {
      const headers = [
        "Data (AAAA-MM-DD)",
        "Nome do Evento",
        "Local",
        "Tipo de Serviço",
        "Descrição (se Outro)",
        "Quantidade",
        "Valor Total (R$)"
      ];
      const exampleRow = [
          "2024-12-31", 
          "Confraternização de Exemplo", 
          EVENT_LOCATION_OPTIONS[0].label, 
          EVENT_SERVICE_TYPE_OPTIONS[0].label,
          "",
          "50",
          "2500.00"
      ];
      sheets.push({
        sheetName: 'Eventos',
        data: [headers, exampleRow]
      });
      return sheets;
    }

    if (periodConfig.subTabs) {
      for (const subTabKey in periodConfig.subTabs) {
        const subTabConfig = periodConfig.subTabs[subTabKey];
        // Handle new structure for Faturado and Consumo Interno
        if (subTabKey === 'faturado') {
            const headers = ["Data (AAAA-MM-DD)", "Pessoa", "Tipo (hotel/funcionario/outros)", "Quantidade", "Valor (R$)", "Observação"];
            const exampleRow = ["2024-12-31", "Nome do Cliente", "hotel", "1", "150.00", "Referente ao jantar"];
            sheets.push({ sheetName: subTabConfig.label.substring(0, 31), data: [headers, exampleRow] });
        } else if (subTabKey === 'consumoInterno') {
            const headers = ["Data (AAAA-MM-DD)", "Pessoa/Setor", "Quantidade", "Valor (R$)", "Observação", "Reajuste de C.I (Valor Total do Dia)"];
            const exampleRow = ["2024-12-31", "Diretoria", "4", "200.00", "Jantar da diretoria", "50.00"];
            sheets.push({ sheetName: subTabConfig.label.substring(0, 31), data: [headers, exampleRow] });
        } else { // Handle other sub-tabs like Room Service, Mesa, etc.
            const headers: string[] = ["Data (AAAA-MM-DD)"];
            Object.entries(subTabConfig.groupedChannels).forEach(([channelId, config]) => {
              const channelLabel = SALES_CHANNELS[config.qtd as SalesChannelId] || SALES_CHANNELS[config.vtotal as SalesChannelId] || config.label;
              if (config.qtd) headers.push(`${channelLabel} (Qtd)`);
              if (config.vtotal) headers.push(`${channelLabel} (R$)`);
            });
            // Only add sheet if there are headers beyond just the date
            if (headers.length > 1) {
              sheets.push({ sheetName: subTabConfig.label.substring(0, 31), data: [headers] });
            }
        }
      }
    } else if (periodConfig.channels) { // Handle simple periods with direct channels
      const headers: string[] = ["Data (AAAA-MM-DD)"];
        Object.entries(periodConfig.channels).forEach(([channelId, config]) => {
          const channelLabel = SALES_CHANNELS[channelId as SalesChannelId];
          if (config.qtd) headers.push(`${channelLabel} (Qtd)`);
          if (config.vtotal) headers.push(`${channelLabel} (R$)`);
        });
      if (headers.length > 1) {
        sheets.push({ sheetName: 'Lançamentos', data: [headers] });
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
      // Auto-fit columns for better readability
      const cols = sheetInfo.data[0].map(header => ({
          wch: Math.max(header.length, 20) // Set a min-width for the column
      }));
      ws['!cols'] = cols;
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
