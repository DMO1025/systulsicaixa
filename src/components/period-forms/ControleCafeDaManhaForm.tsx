

"use client";

import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Hash, Building, MessageSquare, Users, User, UserCheck } from 'lucide-react';
import type { DailyEntryFormData } from '@/lib/types';
import { getPeriodIcon, type PeriodDefinition } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/config/periods';
import { type IndividualPeriodConfig as PeriodConfig } from '@/lib/config/forms';

export interface PeriodFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  periodId: "controleCafeDaManha";
  periodDefinition: PeriodDefinition;
  periodConfig: PeriodConfig;
}

const ControleCafeDaManhaForm: React.FC<PeriodFormProps> = ({ form, periodId, periodDefinition, periodConfig }) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const cardDescriptionText = periodConfig.description || `Registre os controles do café da manhã.`;

  const handleNumericChange = (field: any, value: string) => {
    if (value === '') {
        field.onChange(0);
    } else {
        const num = parseInt(value.replace(/\D/g, ''), 10);
        field.onChange(isNaN(num) ? 0 : num);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ActivePeriodMainIcon className="h-6 w-6 text-primary" />
            <CardTitle>{periodDefinition.label}</CardTitle>
          </div>
        </div>
        <CardDescription>{cardDescriptionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-md">Lançamento de Contagem</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={form.control} name={`controleCafeDaManha.adultoQtd`} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Users className="h-4 w-4 mr-1"/>Adulto (Qtd)</FormLabel>
                <FormControl><Input 
                    {...field} 
                    value={field.value ?? 0}
                    type="number"
                    min={0}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={e => handleNumericChange(field, e.target.value)}
                /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name={`controleCafeDaManha.crianca01Qtd`} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><User className="h-4 w-4 mr-1"/>Criança 01 (Qtd)</FormLabel>
                <FormControl><Input 
                    {...field} 
                    value={field.value ?? 0}
                    type="number"
                    min={0}
                    placeholder="0" 
                    onFocus={(e) => e.target.select()}
                    onChange={e => handleNumericChange(field, e.target.value)}
                /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name={`controleCafeDaManha.crianca02Qtd`} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><User className="h-4 w-4 mr-1"/>Criança 02 (Qtd)</FormLabel>
                <FormControl><Input 
                    {...field} 
                    value={field.value ?? 0}
                    type="number"
                    min={0}
                    placeholder="0" 
                    onFocus={(e) => e.target.select()}
                    onChange={e => handleNumericChange(field, e.target.value)}
                /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name={`controleCafeDaManha.contagemManual`} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><UserCheck className="h-4 w-4 mr-1"/>Contagem Manual</FormLabel>
                <FormControl><Input 
                    {...field} 
                    value={field.value ?? 0}
                    type="number"
                    min={0}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={e => handleNumericChange(field, e.target.value)}
                /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name={`controleCafeDaManha.semCheckIn`} render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><UserCheck className="h-4 w-4 mr-1"/>Sem Check-in</FormLabel>
                <FormControl><Input 
                    {...field} 
                    value={field.value ?? 0}
                    type="number"
                    min={0}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={e => handleNumericChange(field, e.target.value)}
                /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControleCafeDaManhaForm;
