
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Trash2, Loader2, History, RotateCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '@/components/ui/currency-input';
import { RelaunchModal } from '@/components/shared/RelaunchModal';


import type { EstornoItem, EstornoCategory, EstornoReason } from '@/lib/types';

interface EstornoFormProps {
  category: EstornoCategory;
}

const CATEGORY_MAP: Record<string, { title: string; description: string }> = {
  'restaurante': { title: 'Estorno de Restaurante', description: 'Registre estornos de vendas do restaurante (almoço, jantar, etc).' },
  'frigobar': { title: 'Estorno de Frigobar', description: 'Registre estornos relacionados a consumo de frigobar.' },
  'room-service': { title: 'Estorno de Room Service', description: 'Registre estornos de pedidos de serviço de quarto.' },
};

const ESTORNO_REASONS: { value: EstornoReason, label: string }[] = [
    { value: 'duplicidade', label: 'Duplicidade' },
    { value: 'erro de lancamento', label: 'Erro de Lançamento' },
    { value: 'pagamento direto', label: 'Pagamento Direto' },
    { value: 'nao consumido', label: 'Não Consumido' },
    { value: 'assinatura divergente', label: 'Assinatura Divergente' },
    { value: 'cortesia', label: 'Cortesia' },
    { value: 'relancamento', label: 'Relançamento' },
];

const ESTORNO_REASON_LABELS: Record<EstornoReason, string> = {
    'duplicidade': 'Duplicidade',
    'erro de lancamento': 'Erro de Lançamento',
    'pagamento direto': 'Pagamento Direto',
    'nao consumido': 'Não Consumido',
    'assinatura divergente': 'Assinatura Divergente',
    'cortesia': 'Cortesia',
    'relancamento': 'Relançamento',
};


const createDefaultEstornoItem = (category: EstornoCategory): Omit<EstornoItem, 'id'> => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  hora: format(new Date(), 'HH:mm'),
  registeredBy: '',
  uh: '',
  nf: '',
  reason: 'erro de lancamento',
  quantity: 0,
  valorTotalNota: undefined,
  valorEstorno: 0,
  observation: '',
  category: category,
});

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || (value > -0.001 && value < 0.001)) return '-';
    return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');


export default function EstornoForm({ category }: EstornoFormProps) {
  const { toast } = useToast();
  const { username } = useAuth();
  
  const categoryInfo = CATEGORY_MAP[category] || { title: 'Controle de Estorno', description: 'Registre seus estornos.' };

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [historyItems, setHistoryItems] = useState<EstornoItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newItem, setNewItem] = useState<Omit<EstornoItem, 'id'>>(createDefaultEstornoItem(category));


  useEffect(() => {
    if (username) {
        setNewItem(prev => ({...prev, registeredBy: username}));
    }
  }, [username, category]);
  
  const fetchEstornos = async (month: Date) => {
    setIsLoadingHistory(true);
    const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(month), 'yyyy-MM-dd');
    try {
      const response = await fetch(`/api/estornos?startDate=${startDate}&endDate=${endDate}&category=${category}`);
      if (response.ok) {
        const data: EstornoItem[] = await response.json();
        setHistoryItems(data);
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      toast({ title: 'Erro ao buscar estornos', description: (error as Error).message, variant: 'destructive' });
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  useEffect(() => {
    fetchEstornos(selectedMonth);
  }, [selectedMonth, category, toast]);

  const handleInputChange = (field: keyof Omit<EstornoItem, 'id'>, value: any) => {
    let finalValue = value;
    if (field === 'quantity') {
        const parsedValue = parseInt(value.replace(/[^0-9]/g, ''), 10) 
        finalValue = isNaN(parsedValue) ? undefined : parsedValue;
    }
    if (field === 'date') {
      finalValue = format(value, 'yyyy-MM-dd');
    }
    setNewItem(prev => ({...prev, [field]: finalValue}));
  };
  
 const handleAddItem = async () => {
    setIsSaving(true);
    
    const payload = { ...newItem, id: uuidv4() };

    try {
        const response = await fetch('/api/estornos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[LOG DE ERRO] Payload que causou o erro:', payload);
            console.error('[LOG DE ERRO] Resposta da API:', errorData);
            let errorDetails = '';
            if (errorData.errors) {
                errorDetails = Object.entries(errorData.errors).map(([field, errorObj]: [string, any]) => {
                    if (errorObj && errorObj._errors && Array.isArray(errorObj._errors)) {
                        return `${field}: ${errorObj._errors.join(', ')}`;
                    }
                    return '';
                }).filter(Boolean).join(' | ');
            }
            
            const displayMessage = errorDetails || errorData.message || 'Falha ao salvar estorno.';
            throw new Error(displayMessage);
        }
        
        toast({ title: 'Sucesso!', description: 'Estorno salvo com sucesso.' });
        setNewItem(createDefaultEstornoItem(category));
        await fetchEstornos(selectedMonth);

    } catch (error) {
         toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDeleteItem = async (itemToDelete: EstornoItem) => {
    try {
        const response = await fetch(`/api/estornos`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: itemToDelete.id,
                date: itemToDelete.date
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao remover item.');
        }
        toast({ title: "Item Removido", description: "O estorno foi removido com sucesso." });
        await fetchEstornos(selectedMonth);

    } catch (error) {
        toast({ title: "Erro ao Remover", description: (error as Error).message, variant: "destructive" });
    }
  };
  
  const currentSystemYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentSystemYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i), "MMMM", { locale: ptBR }),
  }));
  
  const handleMonthChange = (monthValue: string) => {
    const newMonthIndex = parseInt(monthValue, 10);
    setSelectedMonth(new Date(selectedMonth.getFullYear(), newMonthIndex, 1));
  };

  const handleYearChange = (yearValue: string) => {
    const newYear = parseInt(yearValue, 10);
    setSelectedMonth(new Date(newYear, selectedMonth.getMonth(), 1));
  };
  
  const sortedEstornos = React.useMemo(() => {
    return [...historyItems].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [historyItems]);

  const { relaunchedDebitIds, neutralizingCreditIds } = useMemo(() => {
    const debitIds = new Set<string>();
    const creditIds = new Set<string>();
    
    if (!sortedEstornos || sortedEstornos.length === 0) {
      return { relaunchedDebitIds: debitIds, neutralizingCreditIds: creditIds };
    }

    const credits = sortedEstornos.filter(i => i.reason === 'relancamento' && i.uh && i.nf);
    const debits = sortedEstornos.filter(i => (i.reason === 'assinatura divergente' || i.reason === 'nao consumido') && i.uh && i.nf);

    credits.forEach(credit => {
      const matchingDebitIndex = debits.findIndex(debit => 
        debit.uh === credit.uh && 
        debit.nf === credit.nf &&
        Math.abs(credit.valorEstorno) === Math.abs(debit.valorEstorno) &&
        !debitIds.has(debit.id)
      );
      
      if (matchingDebitIndex !== -1) {
        const originalDebit = debits[matchingDebitIndex];
        debitIds.add(originalDebit.id);
        creditIds.add(credit.id);
        debits.splice(matchingDebitIndex, 1);
      }
    });

    return { relaunchedDebitIds: debitIds, neutralizingCreditIds: creditIds };
  }, [sortedEstornos]);

  const footerTotals = useMemo(() => {
    const neutralizedItemIds = new Set([...(relaunchedDebitIds ?? []), ...(neutralizingCreditIds ?? [])]);
    
    return sortedEstornos.reduce((acc, item) => {
        const isNeutralized = neutralizedItemIds.has(item.id);
        if (isNeutralized) {
            return acc; 
        }

        if (item.reason !== 'relancamento') {
          acc.qtd += item.quantity || 0;
          acc.valorTotalNota += item.valorTotalNota || 0;
        }
        
        const isDebit = item.reason === 'assinatura divergente' || item.reason === 'nao consumido';
        const isCredit = item.reason === 'relancamento';

        if (isCredit) {
            acc.creditoValor += item.valorEstorno || 0;
        } else if (isDebit) {
            acc.debitadoValor += item.valorEstorno || 0;
        } else {
            acc.controleValor += item.valorEstorno || 0;
        }
        
        let diferenca = 0;
        if ((item.valorTotalNota || 0) !== 0) {
            if (isCredit) {
                 diferenca = (item.valorTotalNota || 0) - Math.abs(item.valorEstorno || 0);
            } else {
                 diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
            }
        }
        acc.diferenca += diferenca;
        
        return acc;
    }, { qtd: 0, controleValor: 0, debitadoValor: 0, valorTotalNota: 0, diferenca: 0, creditoValor: 0 });
}, [sortedEstornos, relaunchedDebitIds, neutralizingCreditIds]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
         <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{categoryInfo.title}</h1>
            <p className="text-muted-foreground">{categoryInfo.description}</p>
         </div>
         <div className="flex w-full sm:w-auto gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Registro de Estorno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3 items-end">
                <div className="space-y-1.5 xl:col-span-2"><Label>Data do Item</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9", !newItem.date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newItem.date ? format(parseISO(newItem.date), "dd/MM/yyyy") : <span>Selecione</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={parseISO(newItem.date)} onSelect={(d) => d && handleInputChange('date', d)} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-1.5 xl:col-span-2"><Label>Usuário</Label><Input value={newItem.registeredBy || ''} onChange={e => handleInputChange('registeredBy', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>UH</Label><Input value={newItem.uh || ''} onChange={e => handleInputChange('uh', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>NF</Label><Input value={newItem.nf || ''} onChange={e => handleInputChange('nf', e.target.value)} /></div>
                
                <div className="space-y-1.5 xl:col-span-2">
                    <Label>Motivo do Estorno</Label>
                    <Select value={newItem.reason} onValueChange={(v: EstornoReason) => handleInputChange('reason', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {ESTORNO_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1.5">
                    <Label>Qtd.</Label>
                    <Input type="text" inputMode="numeric" value={newItem.quantity} onChange={e => handleInputChange('quantity', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label>Valor Nota</Label>
                    <CurrencyInput
                      value={newItem.valorTotalNota}
                      onValueChange={(value) => handleInputChange('valorTotalNota', value)}
                      placeholder="R$ 0,00"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Vlr Estorno</Label>
                    <CurrencyInput
                      value={newItem.valorEstorno}
                      onValueChange={(value) => handleInputChange('valorEstorno', value)}
                      placeholder="R$ 0,00"
                    />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                 <div className="space-y-1.5 md:col-span-3">
                    <Label>Observação</Label>
                    <Input value={newItem.observation || ''} onChange={e => handleInputChange('observation', e.target.value)} placeholder="Ex: Cliente devolveu, valor incorreto, etc." />
                </div>
                 <div className="flex items-end">
                    <Button onClick={handleAddItem} className="w-full" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Adicionar e Salvar
                    </Button>
                 </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary"/>
                <CardTitle>Histórico de Lançamentos ({format(selectedMonth, 'MMMM yyyy', {locale: ptBR})})</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            {isLoadingHistory ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : sortedEstornos.length > 0 ? (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário/Data</TableHead>
                                <TableHead>Detalhes (UH/NF)</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Observação</TableHead>
                                <TableHead className="text-right">Qtd.</TableHead>
                                <TableHead className="text-right">Valor Nota</TableHead>
                                <TableHead className="text-right">Crédito (Relanç.)</TableHead>
                                <TableHead className="text-right">Estorno (Controle)</TableHead>
                                <TableHead className="text-right">Estorno (Débito)</TableHead>
                                <TableHead className="text-right">Diferença</TableHead>
                                <TableHead className="text-right w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEstornos.map((item) => {
                                const isDebit = item.reason === 'assinatura divergente' || item.reason === 'nao consumido';
                                const isCredit = item.reason === 'relancamento';
                                const hasBeenRelaunched = relaunchedDebitIds.has(item.id);
                                const isNeutralizedCredit = neutralizingCreditIds.has(item.id);

                                let diferenca = 0;
                                if ((item.valorTotalNota || 0) !== 0 && (item.valorEstorno || 0) !== 0) {
                                  if (isCredit) {
                                      diferenca = (item.valorTotalNota || 0) - Math.abs(item.valorEstorno || 0);
                                  } else {
                                      diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
                                  }
                                }
                                
                                const showNotaValue = item.reason === 'relancamento' ? (item.valorTotalNota || 0) > 0 : true;

                                return (
                                <TableRow key={item.id} className={cn(
                                    (hasBeenRelaunched || isNeutralizedCredit) && "bg-purple-100 dark:bg-purple-900/40 opacity-70",
                                    (isDebit && !hasBeenRelaunched) && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                )}>
                                    <TableCell className="text-xs">
                                        <div className="font-medium capitalize">{item.registeredBy || '-'}</div>
                                        <div className="text-muted-foreground">{format(parseISO(item.date), 'dd/MM/yyyy')}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.uh && <div>UH: {item.uh}</div>}
                                      {item.nf && <div>NF: {item.nf}</div>}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium capitalize">{ESTORNO_REASON_LABELS[item.reason] || item.reason}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap">{item.observation}</TableCell>
                                    <TableCell className="text-right text-xs">{item.reason === 'relancamento' ? '-' : formatQty(item.quantity)}</TableCell>
                                    <TableCell className="text-right text-xs">{showNotaValue ? formatCurrency(item.valorTotalNota) : '-'}</TableCell>
                                    
                                    <TableCell className={cn("text-right text-xs font-semibold", isCredit && !isNeutralizedCredit && "text-green-600")}>
                                      {isCredit && !isNeutralizedCredit ? formatCurrency(item.valorEstorno) : '-'}
                                    </TableCell>
                                    <TableCell className={cn("text-right text-xs font-semibold", !isCredit && !isDebit && "text-red-500" )}>
                                      {(!isCredit && !isDebit) ? formatCurrency(item.valorEstorno) : '-'}
                                    </TableCell>
                                    <TableCell className={cn("text-right text-xs font-semibold", isDebit && !hasBeenRelaunched && "text-white")}>
                                      {(isDebit && !hasBeenRelaunched) ? formatCurrency(item.valorEstorno) : '-'}
                                    </TableCell>

                                    <TableCell className="text-right text-xs font-bold">{formatCurrency(diferenca)}</TableCell>
                                    <TableCell className="text-right">
                                    <div className="flex justify-end items-center">
                                        <RelaunchModal originalItem={item} onSuccess={() => fetchEstornos(selectedMonth)} disabled={!isDebit || hasBeenRelaunched} />
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" disabled={isDebit && hasBeenRelaunched}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tem certeza que deseja remover este estorno? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteItem(item)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                      </TableBody>
                      {sortedEstornos.length > 0 && (
                          <TableFooter>
                              <TableRow className="font-bold bg-muted/50">
                                  <TableCell colSpan={4}>TOTAIS (NÃO-NEUTRALIZADOS)</TableCell>
                                  <TableCell className="text-right">{formatQty(footerTotals.qtd)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(footerTotals.valorTotalNota)}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(footerTotals.creditoValor)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(footerTotals.controleValor)}</TableCell>
                                  <TableCell className="text-right text-destructive">{formatCurrency(footerTotals.debitadoValor)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(footerTotals.diferenca)}</TableCell>
                                  <TableCell></TableCell>
                              </TableRow>
                          </TableFooter>
                      )}
                    </Table>
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-4">Nenhum estorno encontrado para o período e categoria selecionados.</p>
            )}
        </CardContent>
        </Card>
    </div>
  );
}
