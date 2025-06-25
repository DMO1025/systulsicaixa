
"use client";

import React, { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import type { DailyEntryFormData, ChannelUnitPricesConfig } from '@/lib/types';
import type { PeriodId, PeriodDefinition, IndividualPeriodConfig as PeriodConfig, IndividualSubTabConfig as SubTabConfig, SalesChannelId } from '@/lib/constants';
import { getPeriodIcon, getSubTabIcon } from '@/lib/constants';

interface PeriodFormProps {
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
  activeSubTabs?: Record<PeriodId, string>;
  setActiveSubTabs?: React.Dispatch<React.SetStateAction<Record<PeriodId, string>>>;
  calculateSubTabTotal?: (periodId: PeriodId, subTabId: string) => number;
}

const FrigobarForm: React.FC<PeriodFormProps> = ({
  form,
  periodId,
  periodDefinition,
  periodConfig,
  activeSubTabs,
  setActiveSubTabs,
  unitPricesConfig,
  calculateSubTabTotal,
  calculatePeriodTotal,
  renderChannelInputs
}) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const periodTotal = calculatePeriodTotal(periodId);
  const cardDescriptionText = periodConfig.description || `Insira os dados para o período de ${periodDefinition.label.toLowerCase()}.`;

  useEffect(() => {
    if (periodConfig?.subTabs && activeSubTabs && setActiveSubTabs && !activeSubTabs[periodId]) {
      const firstSubTabKey = Object.keys(periodConfig.subTabs)[0];
      if (firstSubTabKey) {
        setActiveSubTabs(prev => ({ ...prev, [periodId]: firstSubTabKey }));
      }
    }
  }, [periodId, periodConfig, activeSubTabs, setActiveSubTabs]);

  if (!activeSubTabs || !setActiveSubTabs || !calculateSubTabTotal) {
    return <p>Erro de configuração: Props para sub-abas ausentes.</p>;
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
        {periodConfig.subTabs ? (
          <Tabs value={activeSubTabs[periodId]} onValueChange={(value) => setActiveSubTabs(prev => ({...prev, [periodId]: value}))} className="w-full">
            <ScrollArea className="pb-2">
              <TabsList className="mb-4">
                {Object.entries(periodConfig.subTabs).map(([subTabKey, subTabConfig]) => {
                  const SubIcon = getSubTabIcon(periodId, subTabKey);
                  return (
                    <TabsTrigger key={subTabKey} value={subTabKey} className="flex items-center gap-1 px-2 py-1 text-xs">
                      <SubIcon className="h-4 w-4" />
                      {subTabConfig.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
            {Object.entries(periodConfig.subTabs).map(([subTabKey, subTabConfig]) => {
              const subTabTotal = calculateSubTabTotal(periodId, subTabKey);
              return (
                <TabsContent key={subTabKey} value={subTabKey}>
                  <Card className="border-primary/30">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{subTabConfig.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {renderChannelInputs(
                        subTabConfig.channels,
                        `${periodId}.subTabs.${subTabKey}.channels`,
                        subTabTotal,
                        form,
                        unitPricesConfig,
                        periodId
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground">Configuração de sub-abas ausente.</p>
        )}

        {periodConfig.observations && (
          <FormField
            control={form.control}
            name={`${periodId}.periodObservations`}
            render={({ field }) => (
              <FormItem className="mt-6">
                <FormLabel>Observações do Período ({periodDefinition.label})</FormLabel>
                <FormControl>
                  <Textarea placeholder={`Notas específicas para ${periodDefinition.label.toLowerCase()}...`} {...field} value={field.value ?? ''} onFocus={(e) => e.target.select()} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
};
export default FrigobarForm;
