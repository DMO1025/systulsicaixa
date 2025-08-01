

"use client";

import React, { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; 
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { CalendarIcon, Loader2, List as ListIcon, DollarSign, BrainCircuit } from 'lucide-react';
import type { DailyEntryFormData, ChannelUnitPricesConfig, PeriodId, GroupedChannelConfig } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useParams as useNextParams } from 'next/navigation';
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import ResumoLateralCard from '@/components/shared/ResumoLateralCard';
import { Textarea } from '@/components/ui/textarea';
import { useDailyEntryForm } from '@/hooks/useDailyEntryForm';

// Import all period form components
import AlmocoPrimeiroTurnoForm from '@/components/period-forms/AlmocoPrimeiroTurnoForm';
import AlmocoSegundoTurnoForm from '@/components/period-forms/AlmocoSegundoTurnoForm';
import BaliAlmocoForm from '@/components/period-forms/BaliAlmocoForm';
import BaliHappyForm from '@/components/period-forms/BaliHappyForm';
import BreakfastForm from '@/components/period-forms/BreakfastForm';
import CafeDaManhaForm from '@/components/period-forms/CafeDaManhaForm';
import CafeManhaNoShowForm from '@/components/period-forms/CafeManhaNoShowForm';
import ControleCafeDaManhaForm from '@/components/period-forms/ControleCafeDaManhaForm';
import EventosForm from '@/components/period-forms/EventosForm';
import FrigobarForm from '@/components/period-forms/FrigobarForm';
import IndianoAlmocoForm from '@/components/period-forms/IndianoAlmocoForm';
import IndianoJantarForm from '@/components/period-forms/IndianoJantarForm';
import ItalianoAlmocoForm from '@/components/period-forms/ItalianoAlmocoForm';
import ItalianoJantarForm from '@/components/period-forms/ItalianoJantarForm';
import JantarForm from '@/components/period-forms/JantarForm';
import MadrugadaForm from '@/components/period-forms/MadrugadaForm';
import NoShowHistoryCard from '@/components/period-forms/NoShowHistoryCard';
import NoShowClientList from '@/components/period-forms/NoShowClientList';

import type { PeriodFormProps as GenericPeriodFormProps } from '@/components/period-forms/MadrugadaForm'; 
import type { PeriodFormProps as EventosSpecificFormProps } from '@/components/period-forms/EventosForm'; 
import type { PeriodFormProps as CafeManhaNoShowSpecificFormProps } from '@/components/period-forms/CafeManhaNoShowForm';
import type { PeriodFormProps as ControleCafeSpecificFormProps } from '@/components/period-forms/ControleCafeDaManhaForm';


const PERIOD_FORM_COMPONENTS: Record<string, React.FC<any>> = {
  madrugada: MadrugadaForm,
  cafeDaManha: CafeDaManhaForm,
  cafeManhaNoShow: CafeManhaNoShowForm,
  controleCafeDaManha: ControleCafeDaManhaForm,
  almocoPrimeiroTurno: AlmocoPrimeiroTurnoForm,
  almocoSegundoTurno: AlmocoSegundoTurnoForm,
  jantar: JantarForm,
  baliAlmoco: BaliAlmocoForm,
  baliHappy: BaliHappyForm,
  eventos: EventosForm,
  frigobar: FrigobarForm,
  italianoAlmoco: ItalianoAlmocoForm,
  italianoJantar: ItalianoJantarForm,
  indianoAlmoco: IndianoAlmocoForm,
  indianoJantarForm: IndianoJantarForm,
  breakfast: BreakfastForm,
};

export default function PeriodEntryPage() {
  const { userRole, operatorShift } = useAuth();
  const params = useNextParams(); 
  const activePeriodId = params.periodId as PeriodId;

  const {
    form, isLoading, isDataLoading, unitPricesConfig, datesWithEntries, activeSubTabs, setActiveSubTabs,
    activePeriodDefinition, activePeriodConfig, calculatePeriodTotal, calculateSubTabTotal, onSubmit, router
  } = useDailyEntryForm(activePeriodId, operatorShift, userRole);

  const renderChannelInputs = useCallback((
    groupedChannels: GroupedChannelConfig[],
    basePath: string,
    totalValue: number, 
    currentForm: UseFormReturn<DailyEntryFormData>,
    currentUnitPrices: ChannelUnitPricesConfig,
    formPeriodId: PeriodId 
  ) => {
    return (
      <div className="border rounded-md overflow-hidden">
        <div className="flex items-center justify-between font-semibold text-sm text-muted-foreground bg-muted/50 px-3 py-2 border-b">
          <span className="w-[50%] pr-2">OPERAÇÃO</span>
          <div className="flex w-[50%]">
            <span className="w-1/2 text-right pr-2">QTD</span>
            <span className="w-1/2 text-right pr-2">R$ TOTAL</span>
          </div>
        </div>
        <div className="divide-y divide-border">
          {groupedChannels.map((group) => {
            const unitPriceForChannel = group.qtd ? currentUnitPrices[group.qtd] : undefined;
            const isVtotalDisabledByUnitPrice = typeof unitPriceForChannel === 'number' && !isNaN(unitPriceForChannel);

            return (
              <div key={group.label} className="flex items-center justify-between px-3 py-3 hover:bg-muted/20 transition-colors min-h-[60px]">
                <div className="w-[50%] pr-2">
                  <span className="text-base font-bold uppercase">{group.label}</span>
                </div>
                <div className="flex w-[50%] items-start gap-2">
                    <div className="w-1/2">
                        {group.qtd && (
                        <FormField
                            control={currentForm.control}
                            name={`${basePath}.${group.qtd}.qtd` as any}
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <div className="relative">
                                    <ListIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                    type="number" 
                                    placeholder="0" 
                                    {...field} 
                                    value={field.value ?? ''}
                                    onFocus={(e) => e.target.select()}
                                    onChange={e => {
                                        const rawValue = e.target.value;
                                        const newQty = rawValue === '' ? undefined : parseFloat(rawValue);
                                        field.onChange(newQty);

                                        if (isVtotalDisabledByUnitPrice && group.vtotal) {
                                          const calculatedVtotal = (Number(newQty) || 0) * unitPriceForChannel;
                                          currentForm.setValue(`${basePath}.${group.vtotal}.vtotal` as any, calculatedVtotal, { shouldValidate: true, shouldDirty: true });
                                        }
                                    }} 
                                    className="h-8 text-sm text-right w-full pl-7" 
                                    />
                                </div>
                                </FormControl>
                                <FormMessage className="text-xs mt-1 text-right" />
                            </FormItem>
                            )}
                        />
                        )}
                    </div>
                     <div className="w-1/2">
                        {group.vtotal && (
                        <FormField
                            control={currentForm.control}
                            name={`${basePath}.${group.vtotal}.vtotal` as any}
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
                                        style: 'currency',
                                        currency: 'BRL',
                                    });
                                };

                                return (
                                    <FormItem>
                                        <FormControl>
                                        <div className="relative">
                                            <Input
                                            type="text"
                                            placeholder="R$ 0,00"
                                            value={formatCurrencyForDisplay(field.value)}
                                            onChange={handleCurrencyChange}
                                            onFocus={(e) => e.target.select()}
                                            className="h-8 text-sm text-right w-full"
                                            disabled={isVtotalDisabledByUnitPrice}
                                            />
                                        </div>
                                        </FormControl>
                                    <FormMessage className="text-xs mt-1 text-right" />
                                    </FormItem>
                                )
                            }}
                        />
                        )}
                     </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-3 py-3 bg-muted/50 border-t">
          <span className="w-[50%] font-semibold text-sm text-foreground pr-2">
            TOTAL ACUMULADO
          </span>
          <div className="flex w-[50%]">
              <div className="w-1/2"></div>
              <div className="w-1/2 text-right pr-2">
                <span className="font-semibold text-sm text-foreground">
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
          </div>
        </div>
      </div>
    );
  }, []); 

  if (!activePeriodDefinition || !activePeriodConfig) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const PeriodSpecificFormComponent = PERIOD_FORM_COMPONENTS[activePeriodId];
  const isControlPage = activePeriodDefinition.type === 'control';
  const pageTitle = isControlPage ? `Controle Diário: ${activePeriodDefinition.label}` : `Lançamento Diário: ${activePeriodDefinition.label}`;
  
  const formPropsForComponent: GenericPeriodFormProps | EventosSpecificFormProps | CafeManhaNoShowSpecificFormProps | ControleCafeSpecificFormProps = {
    form,
    periodId: activePeriodId as any, // Cast as any to satisfy specific props like EventosForm
    periodDefinition: activePeriodDefinition,
    periodConfig: activePeriodConfig,
    unitPricesConfig,
    calculatePeriodTotal,
    renderChannelInputs,
    operatorShift,
    activeSubTabs,
    setActiveSubTabs,
    calculateSubTabTotal,
    triggerMainSubmit: form.handleSubmit(onSubmit),
    isMainFormLoading: isLoading || isDataLoading,
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-lg text-muted-foreground pt-2">{form.getValues('date') ? format(form.getValues('date'), "PPP", { locale: ptBR }) : 'Carregando data...'}</p>
        </div>
        <Button variant="outline" onClick={() => router.push(isControlPage ? '/controls' : '/entry')}>Voltar para Seleção</Button>
      </div>
      
      <div className={cn("flex flex-col space-y-6", !isControlPage && "lg:flex-row lg:space-x-6 lg:space-y-0")}>
        <div className={cn("space-y-6", !isControlPage && "lg:w-1/2")}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className={cn(isControlPage ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6")}>
                 {userRole === 'administrator' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Data do Lançamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full max-w-xs sm:max-w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value && format(field.value, "PPP", {locale: ptBR})}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => date && field.onChange(date)}
                                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                  initialFocus
                                  locale={ptBR}
                                  modifiers={{ hasEntry: datesWithEntries }}
                                  modifiersClassNames={{ hasEntry: 'has-entry-dot' }}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-6 w-6 text-primary" />
                      <CardTitle>Observações Gerais</CardTitle>
                    </div>
                     <CardDescription>Notas sobre o dia que não pertençam a um período específico.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField control={form.control} name="generalObservations" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder="Descreva aqui as observações gerais do dia..." className="resize-y min-h-[100px]" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {isDataLoading ? (
                 <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /> Carregando dados...</div>
              ) : PeriodSpecificFormComponent ? (
                 React.createElement(PeriodSpecificFormComponent, formPropsForComponent) 
              ) : (
                <Card>
                  <CardHeader><CardTitle>Erro de Configuração</CardTitle></CardHeader>
                  <CardContent><p>Componente para '{activePeriodDefinition.label}' não encontrado.</p></CardContent>
                </Card>
              )}
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isDataLoading}>
                {(isLoading || isDataLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Lançamento
              </Button>
            </form>
          </Form>
        </div>
        
        {!isControlPage && (
          <div className="lg:w-1/2 lg:sticky lg:top-24 h-fit">
            <ResumoLateralCard dailyData={form.watch()} />
          </div>
        )}
      </div>
    </div>
  );
}
