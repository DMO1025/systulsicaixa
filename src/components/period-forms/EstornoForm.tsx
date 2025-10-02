
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


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

const createDefaultEstornoItem = (category: EstornoCategory): Omit<EstornoItem, 'id'> => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  hora: format(new Date(), 'HH:mm'),
  registeredBy: '',
  uh: '',
  nf: '',
  reason: 'erro de lancamento',
  quantity: 1,
  valorTotalNota: undefined,
  valorEstorno: 0,
  observation: '',
  category: category,
});

interface RelaunchModalProps {
  originalItem: EstornoItem;
  onSuccess: () => void; 
}

const RelaunchModal: React.FC<RelaunchModalProps> = ({ originalItem, onSuccess }) => {
  const { toast } = useToast();
  const { username } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [additionalObservation, setAdditionalObservation] = useState('');
  
  const handleConfirmRelaunch = async () => {
    setIsSaving(true);
    
    const { id, ...restOfItem } = originalItem;

    const relaunchPayload = {
      ...restOfItem,
      reason: 'relancamento' as EstornoReason,
      date: format(new Date(), 'yyyy-MM-dd'),
      hora: format(new Date(), 'HH:mm'),
      observation: `Relançamento para UH: ${originalItem.uh || 'N/A'}. ${additionalObservation}`.trim(),
      registeredBy: username || 'sistema',
      valorEstorno: Math.abs(originalItem.valorEstorno),
    };

    try {
        const response = await fetch('/api/estornos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(relaunchPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[LOG DE ERRO RELAUNCH] Payload que causou o erro:', relaunchPayload);
            console.error('[LOG DE ERRO RELAUNCH] Resposta da API:', errorData);
            throw new Error(errorData.message || 'Falha ao relançar estorno.');
        }
        
        toast({ title: 'Sucesso!', description: 'Estorno relançado como crédito com sucesso.' });
        onSuccess();
        setIsOpen(false);
        setAdditionalObservation('');

    } catch (error) {
         toast({ title: "Erro ao Relançar", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-blue-500 h-8 w-8" title="Relançar Estorno">
          <RotateCw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relançar Estorno como Crédito</DialogTitle>
          <DialogDescription>
            Isso criará um novo lançamento com o valor positivo de{' '}
            <span className="font-bold text-green-600">{Math.abs(originalItem.valorEstorno).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
            O estorno original não será alterado.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="relaunch-observation">Observação Adicional (Opcional)</Label>
            <Textarea 
                id="relaunch-observation"
                placeholder="Ex: Lançamento correto após verificação do consumo."
                value={additionalObservation}
                onChange={(e) => setAdditionalObservation(e.target.value)}
            />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleConfirmRelaunch} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Confirmar Relançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


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
      const response = await fetch(`/api/estornos?category=${category}&startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data: EstornoItem[] = await response.json();
        setHistoryItems(data.sort((a,b) => parseISO(String(b.date)).getTime() - parseISO(String(a.date)).getTime()));
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
            throw new Error(errorData.message || 'Falha ao salvar estorno.');
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
        const response = await fetch('/api/estornos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemToDelete)
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
  
  const monthTotals = useMemo(() => {
    return historyItems.reduce((acc, item) => {
      acc.totalItems += item.quantity || 0;
      acc.totalValor += item.valorEstorno || 0;
      return acc;
    }, { totalItems: 0, totalValor: 0 });
  }, [historyItems]);

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
                    <Input value={newItem.observation} onChange={e => handleInputChange('observation', e.target.value)} placeholder="Ex: Cliente devolveu, valor incorreto, etc." />
                </div>
                 <div className="flex items-end">
                    <Button onClick={handleAddItem} className="w-full" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Adicionar e Salvar
                    </Button>
                 </div>
            </div>
             <div className="border-t pt-4 flex justify-end items-center gap-6 text-sm">
                <div className="text-right">
                    <span className="text-muted-foreground">Total de Itens Estornados no Mês:</span>
                    <span className="font-bold ml-2">{monthTotals.totalItems.toLocaleString('pt-BR')}</span>
                </div>
                 <div className="text-right">
                    <span className="text-muted-foreground">Valor Total Estornado no Mês:</span>
                    <span className={cn("font-bold ml-2", monthTotals.totalValor < 0 ? "text-destructive" : "text-green-600")}>
                        {monthTotals.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
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
            ) : historyItems.length > 0 ? (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Detalhes (UH/NF)</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead className="text-right">Qtd.</TableHead>
                            <TableHead className="text-right">Valor Total Nota</TableHead>
                            <TableHead className="text-right">Valor do Estorno</TableHead>
                            <TableHead className="text-right">Diferença</TableHead>
                            <TableHead className="text-right w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historyItems.map((item) => {
                            const valorEstorno = item.valorEstorno || 0;
                            const isCredit = item.reason === 'relancamento';
                            const showRelaunch = !isCredit;

                            return (
                            <TableRow key={item.id}>
                                <TableCell className="text-xs font-medium">{format(parseISO(String(item.date)), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-xs capitalize">{item.registeredBy || '-'}</TableCell>
                                <TableCell className="text-xs">
                                  {item.uh && <div>UH: {item.uh}</div>}
                                  {item.nf && <div>NF: {item.nf}</div>}
                                </TableCell>
                                <TableCell className="text-xs font-medium capitalize">{item.reason}</TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{item.observation}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{(item.valorTotalNota ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</TableCell>
                                <TableCell className={cn("text-right font-semibold", isCredit ? "text-green-600" : "text-destructive")}>{valorEstorno.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</TableCell>
                                <TableCell className="text-right font-bold">{((item.valorTotalNota || 0) + valorEstorno).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</TableCell>
                                <TableCell className="text-right">
                                   <div className="flex justify-end items-center">
                                     {showRelaunch && <RelaunchModal originalItem={item} onSuccess={() => fetchEstornos(selectedMonth)} />}
                                     <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8">
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
                        )})}
                    </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-4">Nenhum estorno registrado para este mês e categoria.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
