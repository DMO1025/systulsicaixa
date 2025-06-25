
"use client";

import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Building, Briefcase, DollarSign, Hash, Info, Loader2, Save } from 'lucide-react';
import type { DailyEntryFormData, EventServiceTypeKey, EventItemData, SubEventItem } from '@/lib/types';
import type { PeriodId, PeriodDefinition, IndividualPeriodConfig as PeriodConfig } from '@/lib/constants';
import { getPeriodIcon, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS, type EventLocationKey } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

// Funções fábrica para objetos padrão
const createDefaultSubEvent = (): SubEventItem => ({
  id: uuidv4(),
  location: undefined,
  serviceType: undefined,
  customServiceDescription: '',
  quantity: undefined,
  totalValue: undefined,
});

const createDefaultEventItem = (): EventItemData => ({
  id: uuidv4(),
  eventName: '',
  subEvents: [createDefaultSubEvent()],
});


export interface PeriodFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  periodId: "eventos";
  periodDefinition: PeriodDefinition;
  periodConfig: PeriodConfig;
  calculatePeriodTotal: (periodId: PeriodId) => number;
  triggerMainSubmit?: () => Promise<void>;
  isMainFormLoading?: boolean;
}


const EventosForm: React.FC<PeriodFormProps> = ({
  form,
  periodId,
  periodDefinition,
  periodConfig,
  calculatePeriodTotal,
  triggerMainSubmit,
  isMainFormLoading,
}) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const periodTotal = calculatePeriodTotal(periodId);
  const cardDescriptionText = periodConfig.description || `Registre os eventos do dia.`;

  const { fields: eventItems, prepend: prependEvent, remove: removeEvent } = useFieldArray({
    control: form.control,
    name: "eventos.items",
    keyName: "fieldId", // Garante um ID estável para cada item do array
  });


  const addNewEvent = () => {
    const newEvent = createDefaultEventItem();
    prependEvent(newEvent, { shouldFocus: false });

    setTimeout(() => {
      const newEventBasePath = `eventos.items.0`;
      const newSubEventBasePath = `${newEventBasePath}.subEvents.0`;

      form.setValue(`${newEventBasePath}.eventName` as const, '', { shouldDirty: true });
      form.trigger(`${newEventBasePath}.eventName` as const);

      form.setValue(`${newSubEventBasePath}.location` as const, undefined, { shouldDirty: true });
      form.trigger(`${newSubEventBasePath}.location` as const);
      form.setValue(`${newSubEventBasePath}.serviceType` as const, undefined, { shouldDirty: true });
      form.trigger(`${newSubEventBasePath}.serviceType` as const);
      form.setValue(`${newSubEventBasePath}.customServiceDescription` as const, '', { shouldDirty: true });
      form.trigger(`${newSubEventBasePath}.customServiceDescription` as const);
      form.setValue(`${newSubEventBasePath}.quantity` as const, undefined, { shouldDirty: true });
      form.trigger(`${newSubEventBasePath}.quantity` as const);
      form.setValue(`${newSubEventBasePath}.totalValue` as const, undefined, { shouldDirty: true });
      form.trigger(`${newSubEventBasePath}.totalValue` as const);
    }, 0);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ActivePeriodMainIcon className="h-6 w-6 text-primary" />
            <CardTitle>{periodDefinition.label}</CardTitle>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Total de Todos Eventos: <span className="font-semibold text-foreground">R$ {periodTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          </div>
        </div>
        <CardDescription>{cardDescriptionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button type="button" variant="outline" onClick={addNewEvent} className="w-full sm:w-auto mb-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Evento
        </Button>

        {eventItems.map((eventItem, eventIndex) => (
          <Card 
            key={eventItem.fieldId} 
            className={cn(
              "bg-muted/20 border-border shadow-sm",
              eventIndex === 0 && "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
            )}
          >
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name={`eventos.items.${eventIndex}.eventName`}
                  render={({ field }) => (
                    <FormItem className="flex-grow mr-4">
                      <FormLabel className="text-base font-semibold">Nome do Evento #{eventItems.length - eventIndex}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Confraternização Empresa X" {...field} value={field.value ?? ''} className="h-9 text-sm bg-background" onFocus={(e) => e.target.select()} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button variant="ghost" size="icon" onClick={() => removeEvent(eventIndex)} className="text-destructive hover:bg-destructive/10 mt-6">
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Remover Evento</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <SubEventArrayComponent
                form={form}
                eventIndex={eventIndex}
                triggerMainSubmit={triggerMainSubmit}
                isMainFormLoading={isMainFormLoading}
              />
            </CardContent>
          </Card>
        ))}

        {periodConfig.observations && (
          <FormField
            control={form.control}
            name="eventos.periodObservations"
            render={({ field }) => (
              <FormItem className="mt-6 pt-4 border-t">
                <FormLabel className="text-base">Observações Gerais do Período de Eventos</FormLabel>
                <FormControl>
                  <Textarea placeholder="Notas gerais sobre todos os eventos do dia..." {...field} value={field.value ?? ''} onFocus={(e) => e.target.select()} />
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


interface SubEventArrayProps {
  form: UseFormReturn<DailyEntryFormData>;
  eventIndex: number;
  triggerMainSubmit?: () => Promise<void>;
  isMainFormLoading?: boolean;
}

const SubEventArrayComponent: React.FC<SubEventArrayProps> = ({
  form,
  eventIndex,
  triggerMainSubmit,
  isMainFormLoading,
}) => {
  const {
    fields: subEventFields,
    prepend: prependSubEvent,
    remove: removeSubEvent,
  } = useFieldArray({
    control: form.control,
    name: `eventos.items.${eventIndex}.subEvents`,
    keyName: "fieldId", 
  });

  const addNewSubEvent = () => {
    const newSubItem = createDefaultSubEvent();
    prependSubEvent(newSubItem, { shouldFocus: false });
  
    setTimeout(() => {
      const novoSubEventoPathPrefix = `eventos.items.${eventIndex}.subEvents.0`;
      form.setValue(`${novoSubEventoPathPrefix}.location` as const, undefined, { shouldDirty: true });
      form.trigger(`${novoSubEventoPathPrefix}.location` as const);
      form.setValue(`${novoSubEventoPathPrefix}.serviceType` as const, undefined, { shouldDirty: true });
      form.trigger(`${novoSubEventoPathPrefix}.serviceType` as const);
      form.setValue(`${novoSubEventoPathPrefix}.customServiceDescription` as const, '', { shouldDirty: true });
      form.trigger(`${novoSubEventoPathPrefix}.customServiceDescription` as const);
      form.setValue(`${novoSubEventoPathPrefix}.quantity` as const, undefined, { shouldDirty: true });
      form.trigger(`${novoSubEventoPathPrefix}.quantity` as const);
      form.setValue(`${novoSubEventoPathPrefix}.totalValue` as const, undefined, { shouldDirty: true });
      form.trigger(`${novoSubEventoPathPrefix}.totalValue` as const);
    }, 0);
  };
  

  const handleInternalSave = () => {
    if (triggerMainSubmit) {
      triggerMainSubmit().catch((error) => {
        console.error(
          'Erro ao tentar salvar internamente o formulário de eventos:',
          error
        );
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <FormLabel className="text-sm font-medium">Serviços/Itens do Evento:</FormLabel>
        <Button type="button" variant="outline" size="sm" onClick={addNewSubEvent} className="text-xs w-full sm:w-auto">
          <PlusCircle className="mr-2 h-3.5 w-3.5" /> Adicionar Serviço/Item
        </Button>
      </div>

      {subEventFields.map((subEventItem, subEventIndex) => {
        const currentServiceType = form.watch(`eventos.items.${eventIndex}.subEvents.${subEventIndex}.serviceType`);
        return (
          <div 
            key={subEventItem.fieldId} 
            className={cn(
              "p-3 border rounded-md bg-background space-y-3 shadow-sm relative",
              subEventIndex === 0 && "bg-accent/5 border-accent/20 ring-1 ring-accent/10" 
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeSubEvent(subEventIndex)}
              className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 h-7 w-7"
              aria-label="Remover Serviço"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remover Serviço</span>
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
              <FormField
                control={form.control}
                name={`eventos.items.${eventIndex}.subEvents.${subEventIndex}.location`}
                render={({ field }) => (
                  <FormItem className="min-w-[120px]">
                    <FormLabel className="text-xs flex items-center"><Building className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Local</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_LOCATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`eventos.items.${eventIndex}.subEvents.${subEventIndex}.serviceType`}
                render={({ field }) => (
                  <FormItem className="min-w-[150px]">
                    <FormLabel className="text-xs flex items-center"><Briefcase className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Serviço/Item</FormLabel>
                     <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        defaultValue={field.value || undefined}
                     >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_SERVICE_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )}
              />
              {currentServiceType === 'OUTRO' && (
                <FormField
                  control={form.control}
                  name={`eventos.items.${eventIndex}.subEvents.${subEventIndex}.customServiceDescription`}
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2 xl:col-span-1 min-w-[150px]">
                      <FormLabel className="text-xs flex items-center"><Info className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Descrição (Outro)</FormLabel>
                      <FormControl><Input placeholder="Especifique o serviço" {...field} value={field.value ?? ''} className="h-8 text-xs" onFocus={(e) => e.target.select()} /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name={`eventos.items.${eventIndex}.subEvents.${subEventIndex}.quantity`}
                render={({ field }) => (
                  <FormItem className="min-w-[80px]">
                    <FormLabel className="text-xs flex items-center"><Hash className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Qtd</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          field.onChange(val);
                        }}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-xs"
                      />
                    </FormControl>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`eventos.items.${eventIndex}.subEvents.${subEventIndex}.totalValue`}
                render={({ field }) => {
                    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        const rawValue = e.target.value;
                        const digitsOnly = rawValue.replace(/\D/g, '');
                        if (digitsOnly === '') {
                            field.onChange(undefined);
                        } else {
                            const numberValue = parseInt(digitsOnly, 10);
                            field.onChange(numberValue / 100);
                        }
                    };

                    const formatCurrencyForDisplay = (val: number | undefined) => {
                        if (val === undefined || val === null) return '';
                        return val.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        });
                    };

                    return (
                        <FormItem className="min-w-[100px]">
                          <FormLabel className="text-xs flex items-center"><DollarSign className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>V. Total</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="0,00"
                              value={formatCurrencyForDisplay(field.value)}
                              onChange={handleCurrencyChange}
                              onFocus={(e) => e.target.select()}
                              className="h-8 text-xs"
                            />
                          </FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                    )
                }}
              />
            </div>
          </div>
          );
      })}
        {subEventFields.length > 0 && triggerMainSubmit && (
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleInternalSave}
                disabled={isMainFormLoading}
                className="mt-3 w-full sm:w-auto"
            >
                {isMainFormLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Confirmar Serviços e Salvar Lançamento
            </Button>
        )}
    </div>
  );
};

export default EventosForm;
