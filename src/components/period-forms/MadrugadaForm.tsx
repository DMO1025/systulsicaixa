
"use client";

import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import type { DailyEntryFormData, ChannelUnitPricesConfig, OperatorShift } from '@/lib/types';
import { getPeriodIcon, type PeriodDefinition } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/config/periods';
import type { IndividualPeriodConfig as PeriodConfig, IndividualSubTabConfig as SubTabConfig, SalesChannelId } from '@/lib/config/forms';

export interface PeriodFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  periodId: PeriodId;
  periodDefinition: PeriodDefinition;
  periodConfig: PeriodConfig;
  unitPricesConfig: ChannelUnitPricesConfig;
  calculatePeriodTotal: (periodId: PeriodId) => number;
  renderChannelInputs: (
    channelsConfig: NonNullable<PeriodConfig['channels'] | SubTabConfig['channels']>,
    basePath: string,
    totalValue: number,
    currentForm: UseFormReturn<DailyEntryFormData>,
    currentUnitPrices: ChannelUnitPricesConfig,
    currentPeriodId: PeriodId
  ) => JSX.Element;
  activeSubTabs?: Record<PeriodId, string>; // Optional, not used by Madrugada
  setActiveSubTabs?: React.Dispatch<React.SetStateAction<Record<PeriodId, string>>>; // Optional
  calculateSubTabTotal?: (periodId: PeriodId, subTabId: string) => number; // Optional
  operatorShift?: OperatorShift | null;
}

const MadrugadaForm: React.FC<PeriodFormProps> = ({
  form,
  periodId,
  periodDefinition,
  periodConfig,
  unitPricesConfig,
  calculatePeriodTotal,
  renderChannelInputs
}) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const periodTotal = calculatePeriodTotal(periodId);
  let cardDescriptionText = periodConfig.description || `Insira os dados para o período de ${periodDefinition.label.toLowerCase()}.`;
   if (periodId === 'madrugada' && !periodConfig.subTabs) {
    cardDescriptionText = "ROOM SERVICE MADRUGADA";
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ActivePeriodMainIcon className="h-6 w-6 text-primary" />
            <CardTitle>{periodDefinition.label}</CardTitle>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Total Vendas (Período): <span className="font-semibold text-foreground">R$ {periodTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          </div>
        </div>
        <CardDescription>{cardDescriptionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {periodConfig.channels && Object.keys(periodConfig.channels).length > 0 ? (
          <div className="space-y-4">
            {renderChannelInputs(
              periodConfig.channels,
              `${periodId}.channels`,
              periodTotal,
              form,
              unitPricesConfig,
              periodId
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum canal de venda configurado para este período.</p>
        )}
      </CardContent>
    </Card>
  );
};
export default MadrugadaForm;
