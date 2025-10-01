"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Refrigerator, History, Loader2, PlusCircle, Trash2, DollarSign, Users, Utensils, GlassWater, CalendarIcon, BrainCircuit, Star, Briefcase } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { PATHS } from '@/lib/config/navigation';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


import type { FrigobarItem, FrigobarConsumptionLog, FrigobarItemCategory, DailyLogEntry, FrigobarPeriodData } from '@/lib/types';
import { getSetting } from '@/services/settingsService';
import { saveDailyEntry, getDailyEntry, getAllDailyEntries, getAllEntryDates } from '@/services/dailyEntryService';

const createDefaultNewEntry = (): { uh: string; items: Record<string, number>; isAntecipado: boolean } => ({
  uh: '',
  items: {},
  isAntecipado: false,
});

const SummaryCard = ({ title, value, icon: Icon, variant = 'default', children }: { title: string, value: string, icon: React.ElementType, variant?: 'default' | 'positive' | 'negative', children?: React.ReactNode }) => {
    const variantClasses = {
        default: 'text-primary',
        positive: 'text-green-600 dark:text-green-500',
        negative: 'text-destructive',
    };
    return (
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${variantClasses[variant]}`}>{value}</div>
                {children}
            </CardContent>
        </Card>
    )
};

const FrigobarItemsGrid: React.FC<{
    items: FrigobarItem[];
    newEntry: { items: Record<string, number> };
    handleQuantityChange: (itemId: string, quantityStr: string) => void;
}> = ({ items, newEntry, handleQuantityChange }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map(item => (
            <div key={item.id} className={cn(
                "relative rounded-lg border p-3 space-y-1.5 transition-colors",
                (newEntry.items[item.id] || 0) > 0 ? 'bg-primary/10 border-primary/50' : 'bg-background'
            )}>
                <Label htmlFor={`item-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-center block">
                    {item.name}
                </Label>
                <Input
                    id={`item-${item.id}`}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={newEntry.items[item.id] || ''}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="h-9 w-full text-center font-bold text-lg"
                />
            </div>
        ))}
    </div>
);


export default function ControleFrigobarForm() {
  const { toast } = useToast();
  const { username } = useAuth();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyItems, setHistoryItems] = useState<FrigobarConsumptionLog[]>([]);
  const [datesWithEntries, setDatesWithEntries] = useState<Date[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [frigobarItems, setFrigobarItems] = useState<FrigobarItem[]>([]);
  const [newEntry, setNewEntry] = useState(createDefaultNewEntry());
  const [generalObservations, setGeneralObservations] = useState("");
  
  const [checkoutsPrevistos, setCheckoutsPrevistos] = useState('');
  const [checkoutsProrrogados, setCheckoutsProrrogados] = useState('');


  const fetchFrigobarItems = async () => {
    try {
      const items = await getSetting('frigobarItems');
      if (Array.isArray(items)) {
        setFrigobarItems(items.sort((a,b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      toast({ title: 'Erro ao buscar itens do frigobar', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const fetchHistoryForDay = useCallback(async (date: Date) => {
    setIsLoadingHistory(true);
    try {
        const entryData = await getDailyEntry(date);
        const frigobarData = entryData?.controleFrigobar as FrigobarPeriodData | undefined;
        
        setHistoryItems(frigobarData?.logs?.sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()) || []);
        setGeneralObservations(frigobarData?.periodObservations || '');
        setCheckoutsPrevistos(String(frigobarData?.checkoutsPrevistos ?? ''));
        setCheckoutsProrrogados(String(frigobarData?.checkoutsProrrogados ?? ''));

    } catch (error) {
      toast({ title: 'Erro ao buscar dados do dia', description: (error as Error).message, variant: 'destructive' });
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast]);

  // Fetch all items on mount
  useEffect(() => {
    fetchFrigobarItems();
  }, []);

  // Fetch history for the selected day
  useEffect(() => {
    fetchHistoryForDay(selectedDate);
  }, [selectedDate, fetchHistoryForDay]);

  // Fetch all entry dates for the calendar in the background
   useEffect(() => {
    async function fetchAllDates() {
        try {
            const allDates = await getAllEntryDates();
            const datesWithLogs = allDates
                .map(e => parseISO(String(e.id)))
                .filter(isValid);
            setDatesWithEntries(datesWithLogs);
        } catch (error) {
            console.error("Failed to fetch entry dates for calendar:", error);
        }
    }
    fetchAllDates();
  }, []);
  
  const handleQuantityChange = (itemId: string, quantityStr: string) => {
      const quantity = parseInt(quantityStr.replace(/[^0-9]/g, ''), 10);
      if(isNaN(quantity) && quantityStr !== '' && quantityStr !== '0') return;

      setNewEntry(prev => {
        const newItems = { ...prev.items };
        if (isNaN(quantity) || quantity <= 0) {
            delete newItems[itemId];
        } else {
            newItems[itemId] = quantity;
        }
        return { ...prev, items: newItems };
      });
  };
  
  const saveCurrentState = async () => {
    if (!selectedDate || !isValid(selectedDate)) {
      toast({ title: "Erro ao salvar", description: "A data selecionada é inválida.", variant: "destructive" });
      return false;
    }
    try {
      let entryForDate = await getDailyEntry(selectedDate) || {};
      
      const payload: Partial<DailyLogEntry> = {
          ...entryForDate,
          id: format(selectedDate, 'yyyy-MM-dd'), // Make sure id is correctly formatted
          date: selectedDate, 
          controleFrigobar: {
              ...(entryForDate.controleFrigobar as any),
              logs: historyItems,
              periodObservations: generalObservations,
              checkoutsPrevistos: checkoutsPrevistos === '' ? undefined : parseInt(checkoutsPrevistos, 10),
              checkoutsProrrogados: checkoutsProrrogados === '' ? undefined : parseInt(checkoutsProrrogados, 10),
          }
      };

      await saveDailyEntry(selectedDate, payload);
      return true;
    } catch (error) {
      toast({ title: "Erro ao salvar estado", description: (error as Error).message, variant: "destructive" });
      return false;
    }
  };


  const handleAddItem = async () => {
    if (!newEntry.uh.trim()) {
      toast({ title: "UH Obrigatório", description: "Por favor, insira o número do quarto (UH).", variant: "destructive" });
      return;
    }
    if (Object.keys(newEntry.items).length === 0) {
      toast({ title: "Nenhum Item", description: "Por favor, insira a quantidade para pelo menos um item.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const totalValue = Object.entries(newEntry.items).reduce((acc, [itemId, quantity]) => {
        const itemPrice = frigobarItems.find(i => i.id === itemId)?.price || 0;
        return acc + (itemPrice * quantity);
      }, 0);

      const newLogItem: FrigobarConsumptionLog = { 
        id: uuidv4(),
        uh: newEntry.uh,
        items: newEntry.items,
        totalValue: totalValue,
        timestamp: selectedDate.toISOString(),
        registeredBy: username || 'desconhecido',
        isAntecipado: newEntry.isAntecipado,
      };
      
      const updatedHistory = [newLogItem, ...historyItems];
      setHistoryItems(updatedHistory);
      
      const success = await saveUpdatedHistory(updatedHistory);
      
      if (success) {
        toast({ title: 'Sucesso!', description: 'Consumo de frigobar salvo com sucesso.' });
        setNewEntry(createDefaultNewEntry());
      } else {
        setHistoryItems(historyItems);
      }
    } catch (error) {
       toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
       setHistoryItems(historyItems); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const saveUpdatedHistory = async (updatedHistory: FrigobarConsumptionLog[]) => {
      try {
          let entryForDate = await getDailyEntry(selectedDate) || {};
          const payload: Partial<DailyLogEntry> = {
              ...entryForDate,
              id: format(selectedDate, 'yyyy-MM-dd'),
              date: selectedDate,
              controleFrigobar: {
                  ...(entryForDate.controleFrigobar as any),
                  logs: updatedHistory,
                  periodObservations: generalObservations,
                  checkoutsPrevistos: checkoutsPrevistos === '' ? undefined : parseInt(checkoutsPrevistos, 10),
                  checkoutsProrrogados: checkoutsProrrogados === '' ? undefined : parseInt(checkoutsProrrogados, 10),
              }
          };
          await saveDailyEntry(selectedDate, payload);
          return true;
      } catch (error) {
          toast({ title: "Erro ao Salvar Histórico", description: (error as Error).message, variant: "destructive" });
          return false;
      }
  };

  const handleToggleAntecipado = async (logId: string) => {
    const updatedHistory = historyItems.map(item =>
        item.id === logId ? { ...item, isAntecipado: !item.isAntecipado } : item
    );
    setHistoryItems(updatedHistory);
    await saveUpdatedHistory(updatedHistory);
  };
  
  const handleSaveValorRecebido = async (logId: string, value: number | undefined) => {
    const updatedHistory = historyItems.map(item => 
      item.id === logId ? { ...item, valorRecebido: value } : item
    );
    setHistoryItems(updatedHistory);
    
    setTimeout(async () => {
      const success = await saveUpdatedHistory(updatedHistory);
      if (success) {
        toast({ title: 'Sucesso!', description: 'Valor recebido atualizado.' });
      } else {
        fetchHistoryForDay(selectedDate); // Re-fetch to revert
      }
    }, 500);
  };
  
  const handleSaveObservation = async () => {
    const success = await saveCurrentState();
    if(success) {
        toast({ title: "Observação Salva", description: "Sua observação foi salva com sucesso." });
    }
  };

  const handleDeleteItem = async (itemToDelete: FrigobarConsumptionLog) => {
    const originalHistory = [...historyItems];
    const updatedHistory = historyItems.filter(item => item.id !== itemToDelete.id);
    setHistoryItems(updatedHistory);
    
    const success = await saveUpdatedHistory(updatedHistory);

    if (success) {
      toast({ title: "Item Removido", description: "O registro de consumo foi removido com sucesso." });
    } else {
      toast({ title: "Erro ao Remover", description: "Não foi possível remover o item, restaurando.", variant: "destructive" });
      setHistoryItems(originalHistory);
    }
  };
  
  const formatCurrency = (value: number | undefined) => {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'});
  }

  const { totalConsumo, totalRecebido, totalDiferenca, totalUHs, totalItems, checkoutsAntecipados } = useMemo(() => {
    const uniqueUHsAtendidas = new Set<string>();
    let antecipadosCount = 0;

    const totals = historyItems.reduce((acc, log) => {
      if ((log.valorRecebido ?? 0) > 0) {
        uniqueUHsAtendidas.add(log.uh);
      }
      if(log.isAntecipado) {
        antecipadosCount++;
      }
      acc.consumo += log.totalValue;
      acc.recebido += log.valorRecebido ?? 0;
      acc.items += Object.values(log.items).reduce((sum, qty) => sum + qty, 0);
      return acc;
    }, { consumo: 0, recebido: 0, items: 0 });

    return {
      totalConsumo: totals.consumo,
      totalRecebido: totals.recebido,
      totalDiferenca: totals.recebido - totals.consumo,
      totalUHs: uniqueUHsAtendidas.size,
      totalItems: totals.items,
      checkoutsAntecipados: antecipadosCount,
    };
  }, [historyItems]);

  const bebidaItems = useMemo(() => frigobarItems.filter(item => item.category === 'bebida'), [frigobarItems]);
  const comidaItems = useMemo(() => frigobarItems.filter(item => item.category === 'comida'), [frigobarItems]);

  const modifiers = { hasEntry: datesWithEntries };
  const modifiersClassNames = { hasEntry: 'has-entry-dot' };


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
         <div>
          <p className="text-lg text-muted-foreground pt-2">
              {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : 'Carregando data...'}
            </p>
         </div>
       </div>
       
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>Data do Lançamento</CardTitle>
                </CardHeader>
                <CardContent>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full max-w-xs sm:max-w-[240px] pl-3 text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                {selectedDate && format(selectedDate, "PPP", {locale: ptBR})}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                              mode="single" 
                              selected={selectedDate} 
                              onSelect={(d) => d && setSelectedDate(d)} 
                              initialFocus 
                              locale={ptBR} 
                              modifiers={modifiers}
                              modifiersClassNames={modifiersClassNames}
                             />
                        </PopoverContent>
                    </Popover>
                </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-2">
                      <BrainCircuit className="h-6 w-6 text-primary" />
                      <CardTitle>Observações Gerais</CardTitle>
                      </div>
                      <CardDescription>Notas sobre o dia que não pertençam a um período específico.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Textarea placeholder="Descreva aqui as observações gerais do dia..." className="resize-y min-h-[100px]" value={generalObservations} onChange={(e) => setGeneralObservations(e.target.value)} onBlur={handleSaveObservation}/>
                  </CardContent>
              </Card>
            </div>
          <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Consumo</CardTitle>
                <CardDescription>Insira os detalhes do consumo abaixo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 space-y-1.5">
                        <Label htmlFor="uh-input" className="text-sm font-medium">UH (Quarto)</Label>
                        <Input 
                            id="uh-input"
                            value={newEntry.uh}
                            onChange={(e) => setNewEntry(p => ({...p, uh: e.target.value}))}
                            placeholder="Nº do quarto"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="antecipado-switch" checked={newEntry.isAntecipado} onCheckedChange={(checked) => setNewEntry(p => ({...p, isAntecipado: checked}))} />
                        <Label htmlFor="antecipado-switch">Check-out Antecipado</Label>
                    </div>
                 </div>
                 <Tabs defaultValue="bebidas" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bebidas"><GlassWater className="mr-2 h-4 w-4"/>Bebidas</TabsTrigger>
                        <TabsTrigger value="comidas"><Utensils className="mr-2 h-4 w-4"/>Comidas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bebidas" className="mt-4">
                        <FrigobarItemsGrid items={bebidaItems} newEntry={newEntry} handleQuantityChange={handleQuantityChange} />
                    </TabsContent>
                    <TabsContent value="comidas" className="mt-4">
                         <FrigobarItemsGrid items={comidaItems} newEntry={newEntry} handleQuantityChange={handleQuantityChange} />
                    </TabsContent>
                </Tabs>
                 <div className="flex justify-end pt-4">
                    <Button onClick={handleAddItem} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Adicionar
                    </Button>
                </div>
              </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary"/>
                    <CardTitle>Histórico de Consumo ({format(selectedDate, 'dd/MM/yyyy', {locale: ptBR})})</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                 {isLoadingHistory ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : historyItems.length > 0 ? (
                    <div className="border rounded-md overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>UH</TableHead>
                                <TableHead>Itens</TableHead>
                                <TableHead className="text-right">Total Consumo</TableHead>
                                <TableHead className="w-[150px] text-right">Valor Recebido</TableHead>
                                <TableHead className="text-right">Diferença</TableHead>
                                <TableHead className="text-center w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyItems.map((log) => {
                                 const diferenca = (log.valorRecebido ?? 0) - log.totalValue;
                                return (
                                <TableRow key={log.id} className={cn(log.isAntecipado && "bg-blue-50 dark:bg-blue-950/50")}>
                                    <TableCell className="font-semibold">
                                       <div className="flex items-center gap-2 text-xl">
                                          {log.isAntecipado && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                                          {log.uh}
                                       </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <div className="flex flex-wrap gap-x-2 gap-y-1 max-w-md">
                                        {Object.entries(log.items).map(([itemId, quantity]) => {
                                          const itemDetails = frigobarItems.find(i => i.id === itemId);
                                          return (
                                            <span key={itemId} className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                {itemDetails?.name || 'Item desconhecido'}: <span className="font-bold text-foreground">{String(quantity)}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(log.totalValue)}</TableCell>
                                    <TableCell className="p-1">
                                        <CurrencyInput
                                            placeholder="R$ 0,00"
                                            className="h-8 text-right"
                                            value={log.valorRecebido}
                                            onValueChange={(value) => handleSaveValorRecebido(log.id, value)}
                                        />
                                    </TableCell>
                                    <TableCell className={`text-right text-sm font-bold ${(log.valorRecebido || 0) - log.totalValue < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                        {formatCurrency(diferenca)}
                                    </TableCell>
                                    <TableCell className="text-center space-x-1">
                                       <Button type="button" variant={"ghost"} size="icon" onClick={() => handleToggleAntecipado(log.id)} title={log.isAntecipado ? "Desmarcar como Antecipado" : "Marcar como Antecipado"}>
                                            <Star className={cn("h-4 w-4", log.isAntecipado ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground")} />
                                        </Button>
                                       <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tem certeza que deseja remover este consumo? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteItem(log)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                       </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-4">Nenhum consumo de frigobar registrado para este dia.</p>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 h-fit">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold">Check-outs</CardTitle>
                  <Users className="h-5 w-5 text-muted-foreground"/>
              </CardHeader>
               <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                      <Label>Previstos</Label>
                      <Input value={checkoutsPrevistos} onChange={e => setCheckoutsPrevistos(e.target.value)} onBlur={handleSaveObservation} className="h-8 w-20 text-center" />
                  </div>
                   <div className="flex justify-between items-center text-sm">
                      <Label>Prorrogados</Label>
                      <Input value={checkoutsProrrogados} onChange={e => setCheckoutsProrrogados(e.target.value)} onBlur={handleSaveObservation} className="h-8 w-20 text-center" />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <Label>Antecipados</Label>
                      <p className="font-bold text-lg">{checkoutsAntecipados}</p>
                  </div>
              </CardContent>
            </Card>
            <SummaryCard title="Quartos Atendidos" value={String(totalUHs)} icon={Briefcase}/>
            <SummaryCard title="Itens Vendidos" value={String(totalItems)} icon={Refrigerator}/>
            <SummaryCard title="Total Consumido" value={formatCurrency(totalConsumo)} icon={DollarSign} variant="negative"/>
            <SummaryCard title="Total Recebido" value={formatCurrency(totalRecebido)} icon={DollarSign} variant="positive"/>
             <SummaryCard title="Diferença Total" value={formatCurrency(totalDiferenca)} icon={DollarSign} variant={totalDiferenca < 0 ? 'negative' : 'positive'}/>
        </div>
      </div>
    </div>
  );
}
