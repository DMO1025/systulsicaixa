
"use client";

import React, { useEffect, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import type { DailyEntryFormData, ChannelUnitPricesConfig } from '@/lib/types';
import type { PeriodId, PeriodDefinition, IndividualPeriodConfig as PeriodConfig, IndividualSubTabConfig as SubTabConfig } from '@/lib/constants';
import { getPeriodIcon, getSubTabIcon } from '@/lib/constants';
import type { PeriodFormProps } from './MadrugadaForm';

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
  renderChannelInputs,
  operatorShift,
}) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const periodTotal = calculatePeriodTotal(periodId);
  const cardDescriptionText = periodConfig.description || `Insira os dados para o período de ${periodDefinition.label.toLowerCase()}.`;

  const visibleSubTabs = useMemo(() => {
    if (!periodConfig.subTabs) {
      return {};
    }
    if (!operatorShift) {
      return periodConfig.subTabs;
    }
    
    const filteredTabs: Record<string, SubTabConfig> = {};
    Object.entries(periodConfig.subTabs).forEach(([key, value]) => {
      if (operatorShift === 'first' && key === 'primeiroTurno') {
        filteredTabs[key] = value;
      } else if (operatorShift === 'second' && (key === 'segundoTurno' || key === 'jantar')) {
        filteredTabs[key] = value;
      }
    });
    return filteredTabs;
  }, [periodConfig.subTabs, operatorShift]);


  useEffect(() => {
    if (visibleSubTabs && activeSubTabs && setActiveSubTabs && !activeSubTabs[periodId]) {
      const firstSubTabKey = Object.keys(visibleSubTabs)[0];
      if (firstSubTabKey) {
        setActiveSubTabs(prev => ({ ...prev, [periodId]: firstSubTabKey }));
      }
    }
  }, [periodId, visibleSubTabs, activeSubTabs, setActiveSubTabs]);

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
        {Object.keys(visibleSubTabs).length > 0 ? (
          <Tabs value={activeSubTabs[periodId]} onValueChange={(value) => setActiveSubTabs(prev => ({...prev, [periodId]: value}))} className="w-full">
            <TabsList className="mb-4 h-auto flex-wrap justify-start">
              {Object.entries(visibleSubTabs).map(([subTabKey, subTabConfig]) => {
                const SubIcon = getSubTabIcon(periodId, subTabKey);
                return (
                  <TabsTrigger key={subTabKey} value={subTabKey} className="flex items-center gap-1 px-2 py-1 text-xs">
                    <SubIcon className="h-4 w-4" />
                    {subTabConfig.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {Object.entries(visibleSubTabs).map(([subTabKey, subTabConfig]) => {
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
          <p className="text-sm text-muted-foreground">Nenhuma aba disponível para o seu turno.</p>
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
