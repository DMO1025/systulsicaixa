
"use client";

import React, { useEffect, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import type { DailyEntryFormData, ChannelUnitPricesConfig, PeriodData } from '@/lib/types';
import type { PeriodId, PeriodDefinition, IndividualPeriodConfig as PeriodConfig, IndividualSubTabConfig as SubTabConfig, SalesChannelId } from '@/lib/constants';
import { getPeriodIcon, getSubTabIcon } from '@/lib/constants';
import { getSafeNumericValue } from '@/lib/utils';
import { calculatePeriodGrandTotal } from '@/lib/reportUtils';
import { Refrigerator } from 'lucide-react';

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

const AlmocoSegundoTurnoForm: React.FC<PeriodFormProps> = ({
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
  const cardDescriptionText = periodConfig.description || `Insira os dados para o período de ${periodDefinition.label.toLowerCase()}.`;

  const watchedData = form.watch();

  const periodTotal = useMemo(() => {
    const getVtotal = (path: string) => getSafeNumericValue(watchedData, path, 0);

    let almocoSTSubTabsTotal = 0;
    const almocoSTData = watchedData.almocoSegundoTurno;
    if (almocoSTData?.subTabs) {
        const { frigobar, ...restOfSubTabs } = almocoSTData.subTabs;
        const almocoSTDataWithoutFrigobar = { ...almocoSTData, subTabs: restOfSubTabs };
        let { valor } = calculatePeriodGrandTotal(almocoSTDataWithoutFrigobar as PeriodData);
        
        const totalCIValue = getSafeNumericValue(almocoSTData, 'subTabs.ciEFaturados.channels.astCiEFaturadosTotalCI.vtotal');
        valor -= totalCIValue;
        
        almocoSTSubTabsTotal = valor;
    }

    const frigobarSTTotal = getVtotal('almocoSegundoTurno.subTabs.frigobar.channels.frgSTPagRestaurante.vtotal') + getVtotal('almocoSegundoTurno.subTabs.frigobar.channels.frgSTPagHotel.vtotal');

    return almocoSTSubTabsTotal + frigobarSTTotal;
  }, [watchedData]);


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
            <p className="text-sm font-semibold text-foreground">Total do Turno (Acumulado): <span className="font-bold text-lg text-primary">R$ {periodTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
            <p className="text-xs text-muted-foreground mt-1">(Almoço 2º Turno + Frigobar 2º Turno)</p>
          </div>
        </div>
        <CardDescription>{cardDescriptionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {periodConfig.subTabs ? (
          <Tabs value={activeSubTabs[periodId]} onValueChange={(value) => setActiveSubTabs(prev => ({...prev, [periodId]: value}))} className="w-full">
            <TabsList className="mb-4 h-auto flex-wrap justify-start">
              {Object.entries(periodConfig.subTabs).map(([subTabKey, subTabConfig]) => {
                const SubIcon = subTabKey === 'frigobar' ? Refrigerator : getSubTabIcon(periodId, subTabKey);
                return (
                  <TabsTrigger key={subTabKey} value={subTabKey} className="flex items-center gap-1 px-2 py-1 text-xs">
                    <SubIcon className="h-4 w-4" />
                    {subTabConfig.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
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
      </CardContent>
    </Card>
  );
};
export default AlmocoSegundoTurnoForm;
