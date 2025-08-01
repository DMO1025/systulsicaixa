

"use client";

import React, { useState, useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DailyEntryFormData, CafeManhaNoShowItem, BilledClient } from '@/lib/types';
import { getPeriodIcon, type PeriodDefinition } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/config/periods';
import { type IndividualPeriodConfig as PeriodConfig } from '@/lib/config/forms';

export interface PeriodFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  periodId: "cafeManhaNoShow";
  periodDefinition: PeriodDefinition;
  periodConfig: PeriodConfig;
}

const CafeManhaNoShowForm: React.FC<PeriodFormProps> = ({ form, periodId, periodDefinition, periodConfig }) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const cardDescriptionText = periodConfig.description || `Registre as ocorrências do café da manhã.`;

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
          <h4 className="font-semibold text-md">Adicionar Novo Registro</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField control={form.control} name={`cafeManhaNoShow.newItem.horario`} render={({ field }) => (
              <FormItem>
                <FormLabel>Horário</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} type="time" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name={`cafeManhaNoShow.newItem.hospede`} render={({ field }) => (
              <FormItem className="col-span-2 md:col-span-1">
                <FormLabel>Hóspede</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nome do hóspede" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name={`cafeManhaNoShow.newItem.uh`} render={({ field }) => (
              <FormItem>
                <FormLabel>UH</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nº" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name={`cafeManhaNoShow.newItem.reserva`} render={({ field }) => (
              <FormItem>
                <FormLabel>Reserva</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nº" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField
              control={form.control}
              name={`cafeManhaNoShow.newItem.valor`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        className="pl-8"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name={`cafeManhaNoShow.newItem.observation`} render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Observação</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Opcional" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CafeManhaNoShowForm;
