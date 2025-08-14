
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, User, UserCheck, Loader2, Save } from 'lucide-react';
import type { DailyEntryFormData, DailyLogEntry, ControleCafeItem, ChannelUnitPricesConfig } from '@/lib/types';
import { getPeriodIcon, type PeriodDefinition } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/config/periods';
import { type IndividualPeriodConfig as PeriodConfig } from '@/lib/config/forms';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isValid, getDate, getMonth, getYear, addMonths } from 'date-fns';
import { getAllDailyEntries, saveDailyEntry } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Table, TableBody, TableCell, TableRow, TableFooter, TableHead, TableHeader } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ControleCafeFiscalSummary from './ControleCafeFiscalSummary';


export interface PeriodFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  periodId: "controleCafeDaManha";
  periodDefinition: PeriodDefinition;
  periodConfig: PeriodConfig;
  selectedMonth: Date;
  setSelectedMonth: React.Dispatch<React.SetStateAction<Date>>;
}

type DailyControlState = Record<string, ControleCafeItem>;

const formatCurrency = (value?: number) => {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ControleCafeDaManhaForm: React.FC<PeriodFormProps> = ({ form, periodId, periodDefinition, periodConfig, selectedMonth, setSelectedMonth }) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [allEntriesForMonth, setAllEntriesForMonth] = useState<DailyLogEntry[]>([]);
  const [dailyStates, setDailyStates] = useState<DailyControlState>({});
  const [unitPricesConfig, setUnitPricesConfig] = useState<ChannelUnitPricesConfig>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const currentSystemYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentSystemYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i), 'MMMM', { locale: ptBR }),
  }));

  useEffect(() => {
    const fetchMonthData = async () => {
        setIsLoading(true);
        const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
        
        try {
            const [entries, prices] = await Promise.all([
              getAllDailyEntries(startDate, endDate),
              getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig')
            ]);
            setAllEntriesForMonth(entries as DailyLogEntry[]);
            
            const entriesMap = entries.reduce((acc, entry) => {
                if(entry.id && entry.controleCafeDaManha) {
                    acc[entry.id] = entry.controleCafeDaManha as ControleCafeItem;
                }
                return acc;
            }, {} as DailyControlState);
            
            setDailyStates(entriesMap);
            setUnitPricesConfig(prices || {});

        } catch (error) {
            console.error("Failed to fetch monthly data", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchMonthData();
  }, [selectedMonth]);

  const daysInMonth = useMemo(() => eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  }), [selectedMonth]);

   const dezenas = useMemo(() => {
    const mesSelecionado = getMonth(selectedMonth);
    const anoSelecionado = getYear(selectedMonth);
    const proximoMes = addMonths(new Date(anoSelecionado, mesSelecionado, 1), 1);
    const mesDoProximoMes = getMonth(proximoMes);
    const anoDoProximoMes = getYear(proximoMes);

    const filterByDezena = (date: Date, dezena: string) => {
        const dia = getDate(date);
        const mes = getMonth(date);
        const ano = getYear(date);

        if (dezena === '1') return dia >= 2 && dia <= 11;
        if (dezena === '2') return dia >= 12 && dia <= 21;
        if (dezena === '3') {
            if (mes === mesSelecionado && ano === anoSelecionado && dia >= 22) return true;
            if (mes === mesDoProximoMes && ano === anoDoProximoMes && dia === 1) return true;
        }
        return false;
    };

    return [
        { label: '1ª Dezena', days: daysInMonth.filter(d => filterByDezena(d, '1')) },
        { label: '2ª Dezena', days: daysInMonth.filter(d => filterByDezena(d, '2')) },
        { label: '3ª Dezena', days: daysInMonth.filter(d => filterByDezena(d, '3')) },
    ];
  }, [daysInMonth, selectedMonth]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, daysInMonth.length);
  }, [daysInMonth]);

  const cafePrice = unitPricesConfig?.cdmListaHospedes || 0;

  const monthTotals = useMemo(() => {
    return daysInMonth.reduce((acc, day) => {
      const dateString = format(day, 'yyyy-MM-dd');
      const entry = dailyStates[dateString];
      if (!entry) return acc;

      const adultoQtd = entry?.adultoQtd || 0;
      const crianca01Qtd = entry?.crianca01Qtd || 0;
      const crianca02Qtd = entry?.crianca02Qtd || 0;
      const contagemManual = entry?.contagemManual || 0;
      const semCheckIn = entry?.semCheckIn || 0;
      
      const totalPessoas = adultoQtd + crianca01Qtd + crianca02Qtd + contagemManual + semCheckIn;
      
      acc.adultoQtd += adultoQtd;
      acc.crianca01Qtd += crianca01Qtd;
      acc.crianca02Qtd += crianca02Qtd;
      acc.contagemManual += contagemManual;
      acc.semCheckIn += semCheckIn;
      acc.totalPessoas += totalPessoas;
      acc.totalValor += totalPessoas * cafePrice;

      return acc;
    }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0, totalPessoas: 0, totalValor: 0 });
  }, [daysInMonth, dailyStates, cafePrice]);

  const handleInputChange = (dateString: string, fieldName: keyof ControleCafeItem, value: string) => {
    const numericValue = value === '' ? 0 : parseInt(value, 10);
    if(isNaN(numericValue)) return;
    
    setDailyStates(prev => {
        const newDayState = { ...(prev[dateString] || {}) };
        (newDayState as any)[fieldName] = numericValue;
        return { ...prev, [dateString]: newDayState };
    });
  };

  const handleSave = async (dateString: string, index: number) => {
    setSavingStates(prev => ({...prev, [dateString]: true}));
    try {
        const dateToSave = parseISO(dateString);
        if(!isValid(dateToSave)) throw new Error("Data inválida para salvar.");

        const existingEntry = allEntriesForMonth.find(e => e.id === dateString);
        const dataToSave: DailyEntryFormData = {
            ...(existingEntry || {}),
            date: dateToSave,
            controleCafeDaManha: dailyStates[dateString]
        };
        
        await saveDailyEntry(dateToSave, dataToSave);

        toast({ 
          title: `Salvo!`, 
          description: existingEntry 
            ? `Lançamento para ${format(dateToSave, "dd/MM/yyyy")} atualizado com sucesso.`
            : `Lançamento para ${format(dateToSave, "dd/MM/yyyy")} criado com sucesso.`
        });
        
        if (!existingEntry) {
            const newEntry = await getAllDailyEntries(dateString, dateString);
            if (newEntry[0]) {
                setAllEntriesForMonth(prev => [...prev, newEntry[0] as DailyLogEntry]);
            }
        }


        const nextInputRef = inputRefs.current.find((ref, i) => i > index && ref !== null);
        nextInputRef?.focus();
        nextInputRef?.select();

    } catch (error: any) {
        toast({ title: 'Erro ao Salvar', description: error.message, variant: 'destructive' });
    } finally {
        setSavingStates(prev => ({...prev, [dateString]: false}));
    }
  }
  
  const handleMonthChange = (monthValue: string) => {
    const newMonthIndex = parseInt(monthValue, 10);
    setSelectedMonth(new Date(selectedMonth.getFullYear(), newMonthIndex, 1));
  };

  const handleYearChange = (yearValue: string) => {
    const newYear = parseInt(yearValue, 10);
    setSelectedMonth(new Date(newYear, selectedMonth.getMonth(), 1));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <ActivePeriodMainIcon className="h-6 w-6 text-primary" />
            <CardTitle>{periodDefinition.label}</CardTitle>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={selectedMonth.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="flex-1"><SelectValue/></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedMonth.getFullYear().toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="flex-1"><SelectValue/></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>{periodConfig.description || `Registre os controles do café da manhã.`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dezenas.map(dezena => (
                    <ControleCafeFiscalSummary key={dezena.label} title={dezena.label} days={dezena.days} dailyStates={dailyStates} unitPrice={cafePrice} />
                ))}
            </div>

            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Data</TableHead>
                            <TableHead>Adultos</TableHead>
                            <TableHead>Criança 01</TableHead>
                            <TableHead>Criança 02</TableHead>
                            <TableHead>Cont. Manual</TableHead>
                            <TableHead>Sem Check-in</TableHead>
                            <TableHead className="text-right font-semibold">Total Pessoas</TableHead>
                            <TableHead className="text-right font-semibold">Total do Dia (R$)</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {daysInMonth.map((day, index) => {
                        const dateString = format(day, 'yyyy-MM-dd');
                        const dayState = dailyStates[dateString] || {};
                        
                        const adultoQtd = dayState.adultoQtd || 0;
                        const crianca01Qtd = dayState.crianca01Qtd || 0;
                        const crianca02Qtd = dayState.crianca02Qtd || 0;
                        const contagemManual = dayState.contagemManual || 0;
                        const semCheckIn = dayState.semCheckIn || 0;
                        
                        const totalPessoas = adultoQtd + crianca01Qtd + crianca02Qtd + contagemManual + semCheckIn;
                        const totalValor = totalPessoas * cafePrice;
                        
                        const showSaveButton = totalPessoas > 0;
                        const isSaving = savingStates[dateString];

                        return (
                            <TableRow key={dateString}>
                                <TableCell className="font-semibold text-sm py-2">{format(day, 'dd/MM (eee)', {locale: ptBR})}</TableCell>
                                <TableCell className="p-1">
                                    <Input 
                                        type="number" min={0} value={adultoQtd} 
                                        onChange={(e) => handleInputChange(dateString, 'adultoQtd', e.target.value)} 
                                        className="h-8"
                                        ref={el => (inputRefs.current[index] = el)}
                                    />
                                </TableCell>
                                <TableCell className="p-1"><Input type="number" min={0} value={crianca01Qtd} onChange={(e) => handleInputChange(dateString, 'crianca01Qtd', e.target.value)} className="h-8"/></TableCell>
                                <TableCell className="p-1"><Input type="number" min={0} value={crianca02Qtd} onChange={(e) => handleInputChange(dateString, 'crianca02Qtd', e.target.value)} className="h-8"/></TableCell>
                                <TableCell className="p-1"><Input type="number" min={0} value={contagemManual} onChange={(e) => handleInputChange(dateString, 'contagemManual', e.target.value)} className="h-8"/></TableCell>
                                <TableCell className="p-1"><Input type="number" min={0} value={semCheckIn} onChange={(e) => handleInputChange(dateString, 'semCheckIn', e.target.value)} className="h-8"/></TableCell>
                                <TableCell className="text-right text-sm font-bold align-middle">{totalPessoas}</TableCell>
                                <TableCell className="text-right text-sm font-bold align-middle">{formatCurrency(totalValor)}</TableCell>
                                <TableCell className="p-1 text-center">
                                    {showSaveButton && (
                                        <Button size="sm" onClick={() => handleSave(dateString, index)} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="font-bold text-base bg-muted/50">
                            <TableCell>TOTAL MENSAL</TableCell>
                            <TableCell>{monthTotals.adultoQtd}</TableCell>
                            <TableCell>{monthTotals.crianca01Qtd}</TableCell>
                            <TableCell>{monthTotals.crianca02Qtd}</TableCell>
                            <TableCell>{monthTotals.contagemManual}</TableCell>
                            <TableCell>{monthTotals.semCheckIn}</TableCell>
                            <TableCell className="text-right">{monthTotals.totalPessoas}</TableCell>
                            <TableCell className="text-right">{formatCurrency(monthTotals.totalValor)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default ControleCafeDaManhaForm;
