"use client";

import React, { useState, useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, PlusCircle, Trash2, History, Loader2, Save } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DailyEntryFormData, CafeManhaNoShowItem, DailyLogEntry, ChannelUnitPricesConfig } from '@/lib/types';
import { getPeriodIcon, type PeriodDefinition } from '@/lib/config/periods';
import type { PeriodId } from '@/lib/config/periods';
import { type IndividualPeriodConfig as PeriodConfig } from '@/lib/config/forms';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';
import { getAllDailyEntries, getDailyEntry, saveDailyEntry } from '@/services/dailyEntryService';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { getSetting } from '@/services/settingsService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export interface PeriodFormProps {
  form: UseFormReturn<DailyEntryFormData>;
  periodId: "cafeManhaNoShow";
  periodDefinition: PeriodDefinition;
  periodConfig: PeriodConfig;
  selectedMonth: Date;
  setSelectedMonth: React.Dispatch<React.SetStateAction<Date>>;
  triggerMainSubmit: () => Promise<void>;
}

const createDefaultNoShowItem = (date: Date): Omit<CafeManhaNoShowItem, 'id' | 'valor'> => ({
  data: date,
  horario: '',
  hospede: '',
  uh: '',
  reserva: '',
  observation: ''
});

const CafeManhaNoShowForm: React.FC<PeriodFormProps> = ({ form, periodId, periodDefinition, periodConfig, selectedMonth, setSelectedMonth, triggerMainSubmit }) => {
  const ActivePeriodMainIcon = getPeriodIcon(periodId);
  const cardDescriptionText = periodConfig.description || `Registre as ocorrências do café da manhã.`;
  const { toast } = useToast();
  
  const [historyItems, setHistoryItems] = useState<(CafeManhaNoShowItem & { entryDate: string })[]>([]);
  const [unitPricesConfig, setUnitPricesConfig] = useState<ChannelUnitPricesConfig>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [newItem, setNewItem] = useState<Omit<CafeManhaNoShowItem, 'id' | 'valor'>>(createDefaultNoShowItem(new Date()));

  const fetchHistoryAndPrices = async () => {
    setIsLoadingHistory(true);
    const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    try {
        const [entries, prices] = await Promise.all([
          getAllDailyEntries(startDate, endDate),
          getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig')
        ]);
        
        setUnitPricesConfig(prices || {});

        const allNoShowItems: (CafeManhaNoShowItem & { entryDate: string })[] = [];
        
        (entries as DailyLogEntry[]).forEach(entry => {
            if(entry.cafeManhaNoShow && Array.isArray((entry.cafeManhaNoShow as any).items)) {
                (entry.cafeManhaNoShow as any).items.forEach((item: CafeManhaNoShowItem) => {
                    allNoShowItems.push({
                        ...item,
                        entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                    });
                });
            }
        });

        setHistoryItems(allNoShowItems.sort((a,b) => {
            const dateA = a.data ? (a.data instanceof Date ? a.data : parseISO(String(a.data))) : new Date(0);
            const dateB = b.data ? (b.data instanceof Date ? b.data : parseISO(String(b.data))) : new Date(0);
            if(dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
            return (a.horario || "").localeCompare(b.horario || "");
        }));

    } catch (error) {
        toast({ title: "Erro ao Carregar Histórico", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndPrices();
  }, [selectedMonth, toast]);
  
  useEffect(() => {
    const mainDate = form.getValues('date');
    if (mainDate && isValid(mainDate)) {
      setNewItem(prev => ({...prev, data: mainDate}));
    }
  }, [form.watch('date')]);

  const handleInputChange = (field: keyof Omit<CafeManhaNoShowItem, 'id' | 'valor'>, value: any) => {
    setNewItem(prev => ({...prev, [field]: value}));
  };

  const handleAddItem = async () => {
    const itemDate = newItem.data;
    const noShowPrice = unitPricesConfig?.cdmNoShow || 0;

    if (!itemDate || !isValid(itemDate)) {
        toast({ title: "Data Inválida", description: "Por favor, selecione uma data válida para o item.", variant: "destructive"});
        return;
    }
    if(!newItem.hospede?.trim()) {
      toast({ title: "Nome do Hóspede", description: "O nome do hóspede é obrigatório.", variant: "destructive"});
      return;
    }
    
    setIsAddingItem(true);
    
    try {
        const existingEntryForDate = await getDailyEntry(itemDate);
        const newDailyData: DailyEntryFormData = existingEntryForDate 
            ? { ...existingEntryForDate } as DailyEntryFormData
            : { date: itemDate } as DailyEntryFormData;

        if (!newDailyData.cafeManhaNoShow) newDailyData.cafeManhaNoShow = { items: [] };
        if (!newDailyData.cafeManhaNoShow.items) newDailyData.cafeManhaNoShow.items = [];

        newDailyData.cafeManhaNoShow.items.push({ ...newItem, id: uuidv4(), valor: noShowPrice });
        
        await saveDailyEntry(itemDate, newDailyData);
        
        toast({ title: "Sucesso!", description: "Registro de no-show salvo com sucesso." });
        setNewItem(createDefaultNoShowItem(new Date())); 
        await fetchHistoryAndPrices(); 
    } catch(error) {
        toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemToDelete: CafeManhaNoShowItem) => {
    const itemDate = itemToDelete.data instanceof Date ? itemToDelete.data : parseISO(String(itemToDelete.data));
    if (!itemDate || !isValid(itemDate)) {
      toast({ title: "Erro", description: "O item a ser excluído não tem uma data válida.", variant: "destructive" });
      return;
    }

    try {
        const entryForDate = await getDailyEntry(itemDate);
        if (!entryForDate || !entryForDate.cafeManhaNoShow || !Array.isArray(entryForDate.cafeManhaNoShow.items)) {
            toast({ title: "Erro", description: "Não foi possível encontrar o registro para excluir o item.", variant: "destructive" });
            return;
        }

        const updatedItems = entryForDate.cafeManhaNoShow.items.filter(item => item.id !== itemToDelete.id);
        const updatedEntry = {
            ...entryForDate,
            cafeManhaNoShow: {
                ...entryForDate.cafeManhaNoShow,
                items: updatedItems,
            }
        };

        await saveDailyEntry(itemDate, updatedEntry);
        toast({ title: "Item Removido", description: "O registro de no-show foi removido com sucesso." });
        await fetchHistoryAndPrices();

    } catch (error) {
        toast({ title: "Erro ao Remover", description: (error as Error).message, variant: "destructive" });
    }
  };


  const currentSystemYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentSystemYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i), 'MMMM', { locale: ptBR }),
  }));
  
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
        <CardDescription>{cardDescriptionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <h4 className="font-semibold text-md">Adicionar Novo Registro de No-Show</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
              <FormItem>
                <FormLabel>Data do Item</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9", !newItem.data && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newItem.data ? format(newItem.data, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={newItem.data} onSelect={(d) => handleInputChange('data', d)} initialFocus />
                    </PopoverContent>
                </Popover>
              </FormItem>
             <FormItem>
                <FormLabel>Horário</FormLabel>
                <Input value={newItem.horario ?? ''} onChange={e => handleInputChange('horario', e.target.value)} type="time" onFocus={(e) => e.target.select()} />
              </FormItem>
              <FormItem>
                <FormLabel>Hóspede</FormLabel>
                <Input value={newItem.hospede ?? ''} onChange={e => handleInputChange('hospede', e.target.value)} placeholder="Nome do hóspede" onFocus={(e) => e.target.select()} />
              </FormItem>
              <FormItem>
                <FormLabel>UH</FormLabel>
                <Input value={newItem.uh ?? ''} onChange={e => handleInputChange('uh', e.target.value)} placeholder="Nº" onFocus={(e) => e.target.select()} />
              </FormItem>
              <FormItem>
                <FormLabel>Reserva</FormLabel>
                <Input value={newItem.reserva ?? ''} onChange={e => handleInputChange('reserva', e.target.value)} placeholder="Nº" onFocus={(e) => e.target.select()} />
              </FormItem>
              <FormItem className="col-span-2 lg:col-span-4">
                <FormLabel>Observação</FormLabel>
                <Input value={newItem.observation ?? ''} onChange={e => handleInputChange('observation', e.target.value)} placeholder="Opcional" onFocus={(e) => e.target.select()} />
              </FormItem>
              <Button type="button" onClick={handleAddItem} className="col-span-2 lg:col-span-1" disabled={isAddingItem}>
                {isAddingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                Adicionar e Salvar
              </Button>
          </div>
        </div>

        <div className="border rounded-lg mt-6">
            <div className="p-4 border-b">
                <h4 className="font-semibold text-md flex items-center gap-2"><History className="h-5 w-5 text-primary"/> Histórico de Lançamentos ({format(selectedMonth, 'MMMM yyyy', {locale: ptBR})})</h4>
            </div>
            {isLoadingHistory ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block"/></div>
            ) : historyItems.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-[50px]">Ação</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {historyItems.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell className="text-xs font-medium">{item.entryDate}</TableCell>
                        <TableCell className="text-sm font-medium">{item.hospede || '-'}</TableCell>
                        <TableCell className="text-xs">
                        <div>Horário: {item.horario || '-'}</div>
                        <div>Reserva: {item.reserva || '-'}</div>
                        <div className="text-muted-foreground">UH: {item.uh || '-'}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.observation || '-'}</TableCell>
                        <TableCell className="text-right text-sm">{ (item.valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }</TableCell>
                        <TableCell className="text-center">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja remover este registro de no-show para o hóspede <strong>{item.hospede}</strong> do dia <strong>{item.entryDate}</strong>? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteItem(item)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
                </div>
            ) : (
                <p className="text-sm text-center text-muted-foreground p-8">Nenhum registro de no-show encontrado para {format(selectedMonth, 'MMMM yyyy', {locale: ptBR})}.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CafeManhaNoShowForm;
